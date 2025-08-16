import express from 'express';
import nunjucks from 'nunjucks';
import session from 'express-session';
import { RedisStore } from 'connect-redis';
import { createClient } from 'redis';
import multer from 'multer';
import sharp from 'sharp';
import cookieParser from 'cookie-parser';
import axios from 'axios';
import crypto from 'crypto';
import cron from 'node-cron';
import { OAuth2Client } from 'google-auth-library';
import { formatDateTimeAgo } from './util/func.js';
import db from './util/db.js';
import clientInfo from './auth/OAuth2Client.js';
import BunnyCDNStorage from './util/BunnyCDNStorage.js';

const DOMAIN = process.env.SANCTUM_DOMAIN;
const STORAGE_APIKEY = process.env.SANCTUM_STORAGE_APIKEY;
const STREAM_APIKEY = process.env.SANCTUM_STREAM_APIKEY;
const STREAM_ID = process.env.SANCTUM_STREAM_ID;
const STREAM_HOSTNAME = process.env.SANCTUM_STREAM_HOSTNAME;

export const NODE_ENV = process.env.NODE_ENV;

const googleAuthClient = new OAuth2Client(clientInfo.google.id, clientInfo.google.secret, `https://sanctum.${DOMAIN}/login/google`);

const UUID_PATTERN = new RegExp('^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$');

export const bunnyStorage = new BunnyCDNStorage(STORAGE_APIKEY!, 'sanctum');

const upload = multer({
  limits: {
    fileSize: 16 * 1024 * 1024,
    fieldSize: 16 * 1024 * 1024
  }
});

const base64UUID = () => {
  return crypto.randomBytes(24).toString('base64url');
}

export const createVideoOptions = {
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    AccessKey: STREAM_APIKEY
  }
}
function createVideo(title: string) {
  return axios.post(`https://video.bunnycdn.com/library/${STREAM_ID}/videos`, {title: title}, createVideoOptions);
}
function deleteVideo(videoUID: string) {
  return axios.delete(`https://video.bunnycdn.com/library/${STREAM_ID}/videos/${videoUID}`, createVideoOptions);
}
const storageOptions = {
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json'
  }
}
export function purgeUrl(url: string) {
  return axios.get(`https://api.bunny.net/purge?url=${url}`, storageOptions);
}

const app = express();
const port = 8001;

const env = nunjucks.configure('templates', {
  noCache: NODE_ENV === 'production' ? false : true,
  express: app
});

env.addGlobal('DOMAIN', DOMAIN);
env.addGlobal('STREAM_HOSTNAME', STREAM_HOSTNAME);

declare module 'express-session' {
  export interface SessionData {
    userid: string;
    authorized: boolean;
    displayname: string;
    type: number;
  }
}
let redisClient = createClient();
redisClient.connect().catch(console.error);
let redisStore = new RedisStore({
  client: redisClient,
  prefix: "sanctum:"
});

app.use(express.static('static'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  store: redisStore,
  secret: process.env.SANCTUM_SESSION_SECRET!,
  resave: false,
  saveUninitialized: false,
  cookie: {
    sameSite: 'lax'
  }
}));
app.use(cookieParser(process.env.SANCTUM_COOKIE_SECRET));
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  next();
});

import mailer from './util/mailer.js';

app.get('/', (req, res) => {
  if (!req.session.authorized) return res.render('login.njk');
  // TODO
  return res.render('index.njk', { session: req.session, cookies: req.cookies });
});

// TODO: Whitelist using db
app.get('/login/google', async (req, res) => {
  const state = req.query.state || '/';
  if (typeof req.query.code !== 'string') return res.redirect(`/?loginErr=400`);
  let connection;
  try {
    const response = await googleAuthClient.getToken(req.query.code);
    const ticket = await googleAuthClient.verifyIdToken({idToken: response.tokens.id_token!, audience: clientInfo.google.id});
    const payload = ticket.getPayload();
    if (!(payload?.email_verified)) return res.redirect(`/?loginErr=401`);
    const googleID = ticket.getUserId();
    connection = await db.getConnection();
    await connection.beginTransaction();
    const [user] = await connection.execute('SELECT userid, googleid, email, accounttype, displayname, pp, pv FROM users WHERE googleid = ? OR email = ? ORDER BY googleid IS NULL ASC LIMIT 1 FOR UPDATE', [googleID, payload.email]);
    if (!user) return res.redirect(`/?loginErr=403`);
    const accountType = user.accounttype || 1;
    if (user.googleid) {
      // GoogleID is found in Database - User has logged in before
      if (user.email !== payload.email) {
        // User changed their email. Check if new email is in database.
        // If email is not in database, change email to new email.
        // If email is in database, check if the email owner has logged in before.
        // If the email was logged into before, send conflict error and inform the user to contact support on front-end.
        // If email was not logged into (invited but not logged in), delete account associated with email from database and change email to new email.
        const [result] = await connection.execute('SELECT userid, accounttype FROM users WHERE email = ? LIMIT 1 FOR UPDATE', [payload.email]);
        if (result) {
          if (result.accounttype === 0) {
            await connection.execute('DELETE FROM users WHERE userid = ? LIMIT 1', [result.userid]);
            await connection.execute('UPDATE users SET email = ?, lastlogin = CURDATE() WHERE userid = ? LIMIT 1', [payload.email, user.userid]);
          } else {
            await connection.rollback();
            return res.redirect(`/?loginErr=409`);
          }
        } else {
          await connection.execute('UPDATE users SET email = ?, lastlogin = CURDATE() WHERE userid = ? LIMIT 1', [payload.email, user.userid]);
        }
      } else {
        await connection.execute('UPDATE users SET lastlogin = CURDATE() WHERE userid = ? LIMIT 1', [user.userid]);
      }
    } else {
      // GoogleID not found in Database - User was invited but this is their first login
      await connection.execute('UPDATE users SET googleid = ?, accounttype = ?, lastlogin = CURDATE() WHERE userid = ? LIMIT 1', [googleID, 1, user.userid]);
      return mailer.sendGoogleAccountRegistrationEmail(payload.email!, payload.given_name).catch(err => {
        return console.error('Failed to send Google Account Registration Email: ', err);
      });
    }
    if (user.displayname) {
      // Login
      req.session.userid = user.userid;
      req.session.displayname = user.displayname;
      req.session.type = accountType;
      req.session.authorized = true;
      // 30 Days (30 * 24 * 60 * 60 * 1000)
      req.session.cookie.maxAge = 2592000000;
      if (user.pv) {
        res.cookie("pp", `https://cdn.${DOMAIN}/sanctum/pp/${user.pv}.webp`);
      } else if (user.pp) {
        res.cookie("pp", `https://cdn.${DOMAIN}/sanctum/pp/${user.pp}.webp`);
      } else {
        res.cookie("pp", "/images/DefaultPP250p.jpg");
      }
      await connection.commit();
      return res.redirect('/');
    } else {
      // Commence Registration
      req.session.userid = user.userid;
      req.session.type = accountType;
      res.cookie("pp", "/images/DefaultPP250p.jpg");
      await connection.commit();
      return res.redirect(`/register/google?picture=${payload.picture}&name=${payload.given_name}`);
    }
  } catch (error) {
    await connection?.rollback();
    if (error instanceof URIError) {
      return res.redirect("/?loginErr=400");
    }
    console.error(error);
    return res.redirect(`/?loginErr=500`);
  } finally {
    await connection?.release();
  }
});
app.get('/register/google', (req, res) => {
  if (!req.session.userid) return res.status(401).render('error/401.njk', { session: req.session, cookies: req.cookies });
  if (req.session.authorized) return res.status(403).render('error/403.njk', { session: req.session, cookies: req.cookies });
  res.render('register.njk', { session: req.session, cookies: req.cookies, picture: req.query.picture, name: req.query.name, source: "Google" });
});

app.post('/register/oauth', async (req, res) => {
  if (!req.session.userid) return res.status(401).send('Unauthorized');
  if (req.session.authorized) return res.status(403).send('Forbidden');
  if (!req.body.displayname || typeof req.body.displayname !== 'string') return res.status(400).send('Displayname format error');
  if (req.body.username.length < 1 || req.body.username.length > 40) return res.status(400).send('Displayname must be between 6 and 18 characters long');
  if (!req.body.username.match(/^[a-zA-Z0-9 ]+$/)) return res.status(400).send('Displayname must be alphanumeric');
  try {
    await db.execute('UPDATE users SET displayname = ? WHERE userid = ?', [req.body.displayname, req.session.userid]);
    req.session.displayname = req.body.displayname;
    req.session.authorized = true;
    // 30 Days (30 * 24 * 60 * 60 * 1000)
    req.session.cookie.maxAge = 2592000000;
    return res.status(200).send();
  } catch (error) {
    return res.status(500).send('Internal server error');
  }
});
app.put('/register/oauth', upload.single('img'), async (req, res) => {
  if (!req.session.authorized) return res.status(401).send('Unauthorized');
  if (!req.file) return res.status(400).send('No file uploaded');
  let connection;
  try {
    const data = await sharp(req.file.buffer).resize(400, 400, { withoutEnlargement: true }).webp({quality: 90}).toBuffer();
    const hash = base64UUID();
    await bunnyStorage.upload(data, `pp/${hash}.webp`);
    connection = await db.getConnection();
    await connection.beginTransaction();
    const [user] = await connection.execute('SELECT pv FROM users WHERE userid = ? LIMIT 1 FOR UPDATE', [req.session.userid]);
    await connection.execute('UPDATE users SET pv = ? WHERE userid = ?', [hash, req.session.userid]);
    await connection.commit();
    res.cookie("pp", `https://sanctum.${DOMAIN}/pp/${hash}.webp`);
    if (user && user.pv) {
      bunnyStorage.delete(`pp/${user.pv}.webp`).catch(err => {console.error('Failed bunnyStorage deletion: ', err)});
    }
    return res.status(200).send();
  } catch (error) {
    await connection?.rollback();
    return res.status(500).send('Internal server error');
  } finally {
    await connection?.release();
  }
});

// TODO: Make dom sign off on this - i.e., set flag instead of deleting fully.
app.delete('/api/video/:videouid', async (req, res) => {
  if (!req.session.authorized) return res.status(401).send('Unauthorized.');
  if (!req.session.type) return res.status(403).send('Forbidden.');
  if (!req.params.videouid || !UUID_PATTERN.test(req.params.videouid)) return res.status(400).send('Bad request.');
  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();
    const result = await db.execute('SELECT userid, videoid, embed, verified FROM videos WHERE videouid = ? LIMIT 1 FOR UPDATE', [req.params.videouid]);
    if (!result.length) {
      await connection.rollback();
      return res.status(404).send('Video not found.');
    }
    if (result[0].userid !== req.session.userid && req.session.type! < 99) {
      await connection.rollback();
      return res.status(403).send('Forbidden.');
    }
    if (!result[0].embed) {
      // await deleteVideo(req.params.videouid);
    }
    const toPromise = [
      db.execute('DELETE FROM videos WHERE videoid = ?', [result[0].videoid]),
      db.execute('DELETE FROM recommendedvideopool WHERE videoid = ?', [result[0].videoid]),
      db.execute('DELETE FROM videocategorypool WHERE videoid = ?', [result[0].videoid])
    ]
    if (result[0].verified) {
      toPromise.push(db.execute('UPDATE users SET videocount = videocount - 1 WHERE userid = ?', [result[0].userid]), db.execute('UPDATE metadata SET videocount = videocount - 1 LIMIT 1'));
    }
    await Promise.all(toPromise);
    await connection.commit();
    return res.status(200).send('OK.');
  } catch (error) {
    await connection?.rollback();
    return res.status(500).send('Internal server error.');
  } finally {
    await connection?.release();
  }
});

// TODO: Check if changing thumbnail is simple and/or necessary
app.put('/api/thumbnail/:videouid', upload.single('thumbnail'), async (req, res) => {
  if (!req.session.authorized) return res.status(401).send('Unauthorized.');
  if (!req.session.type) return res.status(403).send('Forbidden.');
  if (!req.file) return res.status(400).send('Bad request.');
  if (!req.params.videouid || !UUID_PATTERN.test(req.params.videouid)) return res.status(400).send('Bad request.');
  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();
    const result = await connection.execute('SELECT videoid, userid, processed FROM videos WHERE videouid = ? LIMIT 1 FOR UPDATE', [req.params.videouid]);
    if (!result.length) {
      await connection.rollback();
      return res.status(404).send('Not found.');
    }
    if (result[0].userid !== req.session.userid && req.session.type! < 99) {
      await connection.rollback();
      return res.status(403).send('Forbidden.');
    }
    const [data, data_small] = await Promise.all([
      sharp(req.file.buffer).resize(1280, 720, {fit: sharp.fit.inside, withoutEnlargement: true}).jpeg().toBuffer(),
      sharp(req.file.buffer).resize(320, 180, {fit: sharp.fit.contain, withoutEnlargement: true}).webp().toBuffer()
    ]);
    await Promise.all([
      // videoStorage.upload(data, result[0].processed ? `${req.params.videouid}/thumbnail.jpg` : `${req.params.videouid}/thumbnail_0.jpg`),
      // videoStorage.upload(data_small, `${req.params.videouid}/thumbnail_small.webp`)
    ]);
    await connection.execute('UPDATE videos SET thumbchanges = thumbchanges + 1, modified = CURRENT_TIMESTAMP WHERE videoid = ?', [result[0].videoid]);
    await connection.commit();
    return res.status(200).send('OK.');
  } catch (error) {
    await connection?.rollback();
    return res.status(500).send('Internal server error.');
  } finally {
    await connection?.release();
  }
});

app.get('/edit/:videouid', async (req, res) => {
  if (!req.session.authorized) return res.status(401).send('Unauthorized.');
  if (!req.session.type) return res.status(403).send('Forbidden.');
  try {
    const result = await db.execute('SELECT videoid, userid, processed, title, titlelanguage, spokenlanguage, orientation, visibility, production, thumbchanges FROM videos WHERE videouid = ? LIMIT 1', [req.params.videouid]);
    if (!result.length) return res.status(404).send('Not found.');
    if (result[0].userid != req.session.userid && req.session.type! < 99) return res.status(403).send('Forbidden.');
    const [result2, result3] = await Promise.all([
      db.execute('SELECT catid FROM videocategories WHERE videoid = ?', [result[0].videoid]),
      db.execute('SELECT tag FROM videotags WHERE videoid = ?', [result[0].videoid])
    ]);
    delete result[0].videoid;
    delete result[0].userid;
    result[0].categories = result2.map((item: {catid: number}) => item.catid);
    result[0].tags = result3.map((item: {tag: string}) => item.tag);
    res.render('edit/video.njk', { session: req.session, cookies: req.cookies, title: result[0].title, videodata: JSON.stringify(result[0]) });
  } catch (error) {
    return res.status(500).send('Internal server error.');
  }
});

// app.post('/upload/image', upload.single('image'), async (req, res) => {
//   if (!req.session.authorized) return res.status(401).send('Unauthorized');
//   if (req.session.type! < 4) return res.status(403).send('Forbidden');
//   try {
//     const orientation = parseInt(req.body.orientation);
//     const visibility = parseInt(req.body.visibility);
//     const event = parseInt(req.body.event);
//     if (!req.body.title || !req.body.tags) return res.status(400).send('Bad request');
//     if (req.body.title.length < 5 || req.body.title.length > 100) return res.status(400).send('Bad request');
//     if (orientation < 0 || orientation > 5) return res.status(400).send('Bad request');
//     if (visibility < 0 || visibility > 1) return res.status(400).send('Bad request');
//     if (event < 0 || event > 11) return res.status(400).send('Bad request');
//     if (!Array.isArray(req.body.tags)) return res.status(400).send('Bad request');
//     if (req.body.tags.length < 2 || req.body.tags.length > 16) return res.status(400).send('Bad request');
//     const tags = req.body.tags.join();
//     if (tags.length < 7 || tags.length > 339) return res.status(400).send('Bad request');
//     if (!req.file) {
//       if (!req.body.id || req.body.id.length !== 33) return res.status(400).send('Bad request');
//       await db.execute('UPDATE images SET Title = ?, Orientation = ?, Visibility = ?, Event = ?, Tags = ? WHERE imageuid = ? AND userid = ?', [req.body.title, orientation, visibility, event, tags.toLowerCase(), req.body.id, req.session.userid]);
//       return res.redirect(`/profile/${req.session.displayname}/gallery`);
//     } else {
//       if (req.session.userid === 1) {
//         const image = sharp(req.file!.buffer).resize(3840, 3840, {fit: sharp.fit.inside, withoutEnlargement: true}).webp({quality: 90});
//         const [imageData, imageBuffer] = await Promise.all([
//           image.metadata(),
//           image.toBuffer()
//         ]);
//         const imageHash = `${base64UUID()}`;
//         // await bunnyStorage.upload(imageBuffer, `${chat_streamstorage}/img/${imageHash}.webp`);
//         await db.execute('INSERT INTO images (ImageUID, UserID, Username, Filename, Width, Height, Title, OriginalTitle, Orientation, Visibility, Event, Tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [imageHash, req.session.userid, req.session.username, req.file!.originalname, imageData.width, imageData.height, req.body.title, req.body.title, orientation, visibility, event, tags.toLowerCase()]);
//         return res.redirect('/profile/' + req.session.username + '/gallery');
//       } else {
//         const preview = sharp(req.file!.buffer).resize(400, 400, {fit: sharp.fit.inside, withoutEnlargement: true}).blur(30).webp();
//         const image = sharp(req.file!.buffer).resize(3840, 3840, {fit: sharp.fit.inside, withoutEnlargement: true}).webp({quality: 90});
//         const [previewBuffer, imageData, imageBuffer] = await Promise.all([
//           preview.toBuffer(),
//           image.metadata(),
//           image.toBuffer()
//         ]);
//         const imageHash = `${base64UUID()}`;
//         await Promise.all([
//           // bunnyStorage.upload(previewBuffer, `${chat_streamstorage}/img/${previewHash}.webp`),
//           // bunnyStorage.upload(imageBuffer, `${chat_streamstorage}/img/${imageHash}.webp`)
//         ]);
//         await db.execute('INSERT INTO images (ImageUID, BlurredUID, UserID, Username, Filename, Width, Height, Title, OriginalTitle, Orientation, Visibility, Event, Tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [imageHash, req.session.userid, req.session.username, req.file!.originalname, imageData.width, imageData.height, req.body.title, req.body.title, orientation, visibility, event, tags.toLowerCase()]);
//         return res.redirect('/profile/' + req.session.username + '/gallery');
//       }
//     }
//   } catch (error) {
//     return res.status(500).send('Internal server error.');
//   }
// });
// app.post('/upload/video', upload.single('video'), async (req, res) => {
//   if (!req.session.authorized) return res.status(401).send('Unauthorized.');
//   if (req.session.type! < 2) return res.status(403).send('Forbidden.');
//   if (req.body.type == "video") {
//     if (!(UUID_PATTERN.test(req.body.id)) || !req.body.title || !(typeof req.body.titleLanguage === 'number') || !(typeof req.body.orientation === 'number') || !(typeof req.body.spokenLanguage === 'number') || !(typeof req.body.visibility === 'number') || !(typeof req.body.production === 'number') || !req.body.categories || !req.body.tags) {
//       return res.status(400).send('Bad request');
//     }
//     if (req.body.title.length < 5 || req.body.title.length > 100) return res.status(400).send('Bad request');
//     if (req.body.titleLanguage < 0 || req.body.titleLanguage > 13) return res.status(400).send('Bad request');
//     if (req.body.orientation < 0 || req.body.orientation > 5) return res.status(400).send('Bad request');
//     if (req.body.spokenLanguage < 0 || req.body.spokenLanguage > 36) return res.status(400).send('Bad request');
//     if (req.body.visibility < 0 || req.body.visibility > 1) return res.status(400).send('Bad request');
//     if (req.body.production < 0 || req.body.production > 1) return res.status(400).send('Bad request');
//     if (!Array.isArray(req.body.tags) || !Array.isArray(req.body.categories)) return res.status(400).send('Bad request');
//     if (req.body.categories.length < 1 || req.body.categories.length > 12) return res.status(400).send('Bad request');
//     if (req.body.tags.length < 2 || req.body.tags.length > 16) return res.status(400).send('Bad request');
//     let connection;
//     try {
//       connection = await db.getConnection();
//       await connection.beginTransaction();
//       const result = await connection.execute('SELECT VideoID, userid, originaltitle FROM videos WHERE videouid = ? LIMIT 1 FOR UPDATE', [req.body.id]);
//       if (!result.length) {
//         await connection.rollback();
//         return res.status(400).send('Bad request');
//       }
//       if (result[0].userid != req.session.userid && req.session.type! < 99) {
//         await connection.rollback();
//         return res.status(403).send('Forbidden');
//       }
//       let categoryValues: Array<[number, number]>;
//       let tagValues: Array<[number, string]>;
//       try {
//         tagValues = req.body.tags.map((tag: string) => {
//           if (tag.length < 2 || tag.length > 20) {
//             throw new Error('Bad request');
//           }
//           return [result[0].VideoID, tag.toLowerCase()];  
//         });
//       } catch {
//         return res.status(400).send('Bad request');
//       }
//       if (result[0].originaltitle === null) {
//         await Promise.all([
//           connection.batch('INSERT INTO videotags (VideoID, Tag) VALUES (?, ?)', tagValues),
//           connection.execute('UPDATE videos SET Modified = CURRENT_TIMESTAMP, OriginalTitle = ?, Title = ?, TitleLanguage = ?, Orientation = ?, SpokenLanguage = ?, Visibility = ?, Production = ? WHERE VideoID = ? LIMIT 1', [req.body.title, req.body.title, req.body.titleLanguage, req.body.orientation, req.body.spokenLanguage, req.body.visibility, req.body.production, result[0].VideoID])
//         ]);
//       } else {
//         await Promise.all([
//           connection.execute('DELETE FROM videocategories WHERE VideoID = ?', [result[0].VideoID]),
//           connection.execute('DELETE FROM videotags WHERE VideoID = ?', [result[0].VideoID])
//         ]);
//         await Promise.all([
//           connection.batch('INSERT INTO videotags (VideoID, Tag) VALUES (?, ?)', tagValues),
//           connection.execute('UPDATE videos SET Modified = CURRENT_TIMESTAMP, Title = ?, TitleLanguage = ?, Orientation = ?, SpokenLanguage = ?, Visibility = ?, Production = ? WHERE VideoID = ? LIMIT 1', [req.body.title, req.body.titleLanguage, req.body.orientation, req.body.spokenLanguage, req.body.visibility, req.body.production, result[0].VideoID]),
//         ])
//       }
//       await connection.commit();
//       return res.redirect('/profile');
//     } catch (error) {
//       await connection?.rollback();
//       return res.status(500).send('Internal server error.');
//     } finally {
//       await connection?.release();
//     }
//   } else if (req.body.type == "image") {
//     return res.status(400).send('Bad request');
//   } else {
//     return res.status(400).send('Bad request');
//   }
// });

app.get('/upload', (req, res) => {
  if (!req.session.authorized) return res.status(401).render('error/401.njk', { session: req.session, cookies: req.cookies });
  if (req.session.type! < 2) return res.status(403).render('error/403.njk', { session: req.session, cookies: req.cookies });
  return res.render('upload/image.njk', { session: req.session, cookies: req.cookies })
});

app.get('/upload/:type', (req, res) => {
  if (!req.session.authorized) return res.status(401).render('error/401.njk', { session: req.session, cookies: req.cookies });
  if (req.session.type! < 2) return res.status(403).render('error/403.njk', { session: req.session, cookies: req.cookies });
  if (req.params.type === 'video') {
    res.render('upload/video.njk', { session: req.session, cookies: req.cookies });
  } else if (req.params.type === 'image') {
    res.render('upload/image.njk', { session: req.session, cookies: req.cookies });
  } else {
    res.render('upload/video.njk', { session: req.session, cookies: req.cookies });
  }
});

app.get('/profile', (req, res) => {
  if (req.session.authorized) return res.redirect(`/profile/${req.session.displayname}/videos`);
  // TODO: Send to Login/Registration page
  return res.redirect('/');
});
app.get('/profile/:username', (req, res) => {
  if (!req.params.username) return res.status(400).render('error/400.njk', { session: req.session, cookies: req.cookies });
  // TODO: Maybe remove this later when implementing user profiles. Also make sure to check for Displayname if removing below.
  return res.redirect('/profile/' + req.params.username + '/videos');
  // db.query('SELECT userid, username, pp, pb FROM users WHERE username = ? LIMIT 1', [req.params.username], (err, result: RowDataPacket[]) => {
  //   if (err) {
  //     res.status(500).send('Internal server error');
  //     return;
  //   }
  //   if (!result.length) {
  //     res.redirect('/');
  //     return;
  //   }
  //   if (req.session.authorized) {
  //     db.query('SELECT userid FROM subscriptions WHERE userid = ? AND subid = ? LIMIT 1', [req.session.userid, result[0].userid], (err, result2: RowDataPacket[]) => {
  //       if (err) {
  //         res.status(500).send('Internal server error');
  //         return;
  //       }
  //       let subbed = false;
  //       if (result2.length > 0) {
  //         subbed = true;
  //       }
  //       let pp = "/images/DefaultPP250p.jpg";
  //       if (result[0].pp) {
  //         pp = `https://cdn.${DOMAIN}/sanctum/pp/${result[0].pp}.webp`;
  //       }
  //       let pb = "/images/DefaultPB.jpg";
  //       if (result[0].pb) {
  //         pb = `https://cdn.${DOMAIN}/sanctum/pb/${result[0].pb}.webp`;
  //       }
  //       res.render('profile/banner.njk', {session: req.session, cookies: req.cookies, username: result[0].username, pp: pp, pb: pb, subbed: subbed});
  //     });
  //   } else {
  //     let pp = "/images/DefaultPP250p.jpg";
  //       if (result[0].pp) {
  //         pp = `https://cdn.${DOMAIN}/sanctum/pp/${result[0].pp}.webp`;
  //       }
  //       let pb = "/images/DefaultPB.jpg";
  //       if (result[0].pb) {
  //         pb = `https://cdn.${DOMAIN}/sanctum/pb/${result[0].pb}.webp`;
  //       }
  //       res.render('profile/banner.njk', {session: req.session, cookies: req.cookies, username: result[0].username, pp: pp, pb: pb});
  //   }
  // });
});


app.get('/watch', async (req, res) => {
  if (!req.query.v || typeof req.query.v !== 'string' || !UUID_PATTERN.test(req.query.v)) return res.status(400).render('error/400.njk', { session: req.session, cookies: req.cookies });
  try {
    const query = `
      SELECT
        v.videoid, v.userid, v.embed, v.originaltitle, v.processed, v.verified, v.datetime, v.modified, v.duration, v.width, v.height, v.title, v.visibility, v.production, v.views, v.likes, v.rating, v.dislikes, v.favorites, v.comments,
        u.accounttype, u.displayname, u.username, u.pp, u.videocount, u.subs,
        GROUP_CONCAT(vc.catid) AS categories
        FROM videos AS v INNER JOIN users AS u ON v.userid = u.userid LEFT JOIN videocategories AS vc ON v.videoid = vc.videoid
      WHERE v.videouid = ? GROUP BY v.videoid`;
    const [video] = await db.execute(query, [req.query.v]);
    if (!video) return res.status(404).render('error/404.njk', { session: req.session, cookies: req.cookies });
    res.setHeader('Cache-Control', 'no-cache, no-store, max-age=0, must-revalidate');
    const videoid = video.videoid;
    if (!video.processed) return res.status(404).render('error/404.njk', { session: req.session, cookies: req.cookies });
    if (!video.verified || video.visibility === 1) {
      if (!req.session.authorized) return res.status(401).render('error/401.njk', { session: req.session, cookies: req.cookies });
      if (req.session.userid !== video.userid && req.session.type! < 99) return res.status(403).render('error/403.njk', { session: req.session, cookies: req.cookies });
    }
    const duration = `PT${Math.floor(video.duration / 60)}M${video.duration % 60}S`;
    video.datetimeago = formatDateTimeAgo(video.datetime);
    if (req.session.authorized) {
      const sql = `
        SELECT
          (SELECT reaction FROM videolikes WHERE videoid = ? AND userid = ?) AS reaction,
          EXISTS(SELECT 1 FROM videofavorites WHERE videoid = ? AND userid = ?) AS favorited,
          EXISTS(SELECT 1 FROM subscriptions WHERE subid = ? AND userid = ?) AS subscribed
      `;
      const params = [
        videoid, req.session.userid,
        videoid, req.session.userid,
        video.userid, req.session.userid
      ]
      const [viewerState] = await db.execute(sql, params);
      return res.render('watch.njk', { bottomBannerAd: true, session: req.session, cookies: req.cookies, videouid: req.query.v, video: video, viewerState: viewerState, duration: duration });
    }
    return res.render('watch.njk', { bottomBannerAd: true, session: req.session, cookies: req.cookies, videouid: req.query.v, video: video, duration: duration });
  } catch (error) {
    return res.status(500).render('error/500.njk', { session: req.session, cookies: req.cookies });
  }
});

app.get('/embed', (req, res) => {
  if (!req.query.v || typeof req.query.v !== 'string' || !UUID_PATTERN.test(req.query.v)) return res.render('embed/error.njk', { errcode: 400 });
  if (!req.headers.referer || !req.headers.referer.startsWith('https://')) return res.render('embed/error.njk', { errcode: 403 }); 
  db.execute('SELECT videoid, userid, embed, processed, verified, visibility, title FROM videos WHERE videouid = ? LIMIT 1', [req.query.v]).then(result => {
    if (!result.length || !result[0].processed) return res.render('embed/error.njk', { errcode: 404 });
    if (result[0].embed || !result[0].verified || result[0].visibility === 1) return res.render('embed/error.njk', { errcode: 403 });
    return res.render('embed/embed.njk', { videouid: req.query.v, video: result[0] });
  }).catch((err) => {
    console.error('Embed failed: ', err);
    return res.render('embed/error.njk', { errcode: 500 });
  });
});

app.post('/favorite/:videouid', async (req, res) => {
  if (!req.session.authorized) return res.status(401).send('Unauthorized');
  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();
    const [video] = await connection.execute('SELECT videoid FROM videos WHERE videouid = ? FOR UPDATE', [req.params.videouid]);
    if (!video) {
      await connection.rollback();
      return res.status(404).send('Video not found');
    }
    await Promise.all([
      connection.execute('INSERT INTO videofavorites VALUES (?, ?)', [req.session.userid, video.videoid]),
      connection.execute('UPDATE videos SET favorites = favorites + 1 WHERE videoid = ? LIMIT 1', [video.videoid])
    ]);
    await connection.commit();
    return res.status(201).send('OK');
  } catch (error) {
    await connection?.rollback();
    return res.status(500).send('Internal server error');
  } finally {
    await connection?.release();
  }
});
app.delete('/favorite/:videouid', async (req, res) => {
  if (!req.session.authorized) return res.status(401).send('Unauthorized');
  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();
    const [video] = await connection.execute('SELECT videoid FROM videos WHERE videouid = ? FOR UPDATE', [req.params.videouid]);
    if (!video) {
      await connection.rollback();
      return res.status(404).send('Video not found');
    }
    const [deleteResult] = await Promise.all([
      connection.execute('DELETE FROM videofavorites WHERE userid = ? AND videoid = ?', [req.session.userid, video.videoid]),
      connection.execute('UPDATE videos SET favorites = favorites - 1 WHERE videoid = ?', [video.videoid])
    ]);
    if (!deleteResult.affectedRows) {
      await connection.rollback();
      return res.status(404).send('Favorite not found');
    }
    await connection.commit();
    return res.status(204).send();
  } catch (error) {
    await connection?.rollback();
    return res.status(500).send('Internal server error');
  } finally {
    await connection?.release();
  }
});

// TODO: 
app.get('/api/video/:videouid/details', (req, res) => {
  if (!req.params.videouid) return res.status(400).send('Bad request');
  db.execute('SELECT vt.tag FROM videotags vt JOIN videos v ON vt.videoid = v.videoid WHERE v.videouid = ?', [req.params.videouid]).then(result => {
    return res.status(200).send(result);
  }).catch(() => {
    return res.status(500).send('Internal server error');
  });
});

// TODO: Change this
app.get('/profile/:username/:subroute', async (req, res) => {
  if (!req.params.username) return res.status(400).render('error/400.njk', { session: req.session, cookies: req.cookies });
  const query: [string, any[]] = req.session.authorized ?
    ['SELECT u.userid, u.accounttype, u.subs, u.displayname, u.username, u.pp, u.pb, u.pv, u.bv, CASE WHEN s.userid IS NOT NULL THEN 1 ELSE 0 END AS subbed FROM users AS u LEFT JOIN subscriptions AS s ON u.userid = s.subid AND s.userid = ? WHERE username = ?', [req.session.userid, req.params.username]] :
    ['SELECT userid, accounttype, subs, displayname, username, pp, pb, pv, bv FROM users WHERE username = ?', [req.params.username]];
  try {
    const [result] = await db.execute(query[0], query[1]);
    if (!result) return res.status(404).render('error/404.njk', { session: req.session, cookies: req.cookies });
    let pp = "/images/DefaultPP250p.jpg";
    let pb = "/images/DefaultPB.jpg";
    if (result.pp) {
      pp = `https://cdn.${DOMAIN}/sanctum/pp/${result.pp}.webp`;
    }
    if (result.pb) {
      pb = `https://cdn.${DOMAIN}/sanctum/pb/${result.pb}.webp`;
    }
    if (req.params.subroute === 'about') {
      const [about] = await db.execute('SELECT description FROM about WHERE userid = ?', [result.userid]);
      return res.render('profile/about.njk', { bottomBannerAd: true, session: req.session, cookies: req.cookies, accounttype: result.accounttype, displayname: result.displayname, username: result.username, pp: pp, pb: pb, desc: about.description, subs: result.subs, subbed: result.subbed });
    } else if (req.params.subroute === 'edit') {
      if (!req.session.authorized) return res.status(401).render('error/401.njk', { session: req.session, cookies: req.cookies });
      if (req.session.userid !== result.userid) return res.status(403).render('error/403.njk', { session: req.session, cookies: req.cookies });
      const [account] = await db.execute('SELECT description, name, YEAR(birthday) AS year, MONTH(birthday) AS month, DAY(birthday) FROM about WHERE userid = ?', [result.userid])
      let pv;
      let bv;
      if (result.pv) {
        pv = `https://cdn.${DOMAIN}/sanctum/pp/${result.pv}.webp`;
      }
      if (result.bv) {
        bv = `https://cdn.${DOMAIN}/sanctum/pb/${result.bv}.webp`;
      }
      return res.render('profile/edit.njk', { bottomBannerAd: true, session: req.session, cookies: req.cookies, accounttype: result.accounttype, displayname: result.displayname, username: result.username, pp: pp, pb: pb, pv: pv, bv: bv, account: account });
    } else if (req.params.subroute === 'videos') {
      const [meta] = await db.execute(req.session.authorized && (req.session.userid === result.userid) ? 'SELECT COUNT(*) AS count FROM videos WHERE userid = ? AND originaltitle IS NOT NULL' : 'SELECT videocount AS count FROM users WHERE userid = ?', [result.userid])
      const pageNumber = Math.max(1, parseInt((req.query.page as string) ?? '1'));
      let filter = "datetime DESC";
      if (typeof req.query.f === 'string') {
        if (req.query.f === "mp") {
          filter = "views DESC, datetime DESC";
        } else if (req.query.f === "hr") {
          filter = "likes/dislikes DESC, datetime DESC";
        }
      }
      const offset = (pageNumber - 1) * 40;
      // TODO: Maybe add index for the queries below (only non-owner). Not likely necessary since one user can't upload many videos.
      const videos = await db.execute(req.session.authorized && (req.session.userid === result.userid) ? `SELECT verified, views, likes, dislikes, videouid, embed, originaltitle, title, duration, thumbchanges FROM videos WHERE userid = ? AND originaltitle IS NOT NULL ORDER BY ${filter} LIMIT 40 OFFSET ${offset}` : `SELECT verified, views, likes, dislikes, videouid, embed, originaltitle, title, duration, thumbchanges FROM videos WHERE userid = ? AND verified = 1 AND visibility = 0 ORDER BY ${filter} LIMIT 40 OFFSET ${offset}`, [result.userid]);
      return res.render('profile/videos.njk', { bottomBannerAd: true, session: req.session, cookies: req.cookies, accounttype: result.accounttype, displayname: result.displayname, username: result.username, pp: pp, pb: pb, subbed: result.subbed, count: meta.count, videos: videos });
    } else if (req.params.subroute === 'gallery') {
      if (result.accounttype < 4) return res.status(404).render('error/404.njk', { session: req.session, cookies: req.cookies });
      let imageQuery;
      let imageParams;
      let videoQuery;
      let videoParams;
      if (!req.session.authorized && result.userid !== 1) {
        imageQuery = 'SELECT BlurredUID AS ImageUID, Title FROM images WHERE UserID = ? AND Visibility = 0 ORDER BY DateTime DESC LIMIT 5';
        imageParams = [result.userid];
        videoQuery = 'SELECT BlurredUID AS VideoUID, Title, ThumbChanges FROM videos WHERE UserID = ? AND Visibility = 0 ORDER BY DateTime DESC LIMIT 5';
        videoParams = [result.userid];
      } else if (req.session.authorized && (req.session.userid === result.userid)) {
        imageQuery = "SELECT ImageUID, Title FROM images WHERE UserID = ? ORDER BY DateTime DESC LIMIT 5";
        imageParams = [result.userid];
        videoQuery = "SELECT VideoUID, Title, ThumbChanges FROM videos WHERE UserID = ? ORDER BY DateTime DESC LIMIT 5";
        videoParams = [result.userid];
      } else if (result.userid === 1) {
        imageQuery = "SELECT ImageUID, Title FROM images WHERE UserID = ? AND Visibility = 0 ORDER BY DateTime DESC LIMIT 5";
        imageParams = [result.userid];
        videoQuery = "SELECT VideoUID, Title, ThumbChanges FROM videos WHERE UserID = ? AND Visibility = 0 ORDER BY DateTime DESC LIMIT 5";
        videoParams = [result.userid];
      } else {
        imageQuery = `
          WITH Unlocked AS (
            SELECT i.ImageID, i.ImageUID, i.Title
            FROM image_unlocks u
            JOIN images i ON u.ImageID = i.ImageID
            WHERE u.UserID = ? AND u.CreatorID = ?
            ORDER BY u.DateTime DESC
            LIMIT 4
          )
          SELECT ImageUID, Title FROM Unlocked
          UNION ALL
          (SELECT BlurredUID AS ImageUID, Title
          FROM images
          WHERE UserID = ?
          AND ImageID NOT IN (
            SELECT ImageID
            FROM Unlocked
          ) AND Visibility = 0
          ORDER BY DateTime DESC LIMIT 5)
          LIMIT 5`;
        imageParams = [req.session.userid, result.userid, result.userid];
        videoQuery = `
          WITH Unlocked AS (
            SELECT v.VideoID, v.VideoUID, v.Title, v.ThumbChanges
            FROM video_unlocks u
            JOIN videos v ON u.VideoID = v.VideoID
            WHERE u.UserID = ? AND u.CreatorID = ?
            ORDER BY u.DateTime DESC
            LIMIT 4
          )
          SELECT VideoUID, Title, ThumbChanges FROM Unlocked
          UNION ALL
          (SELECT BlurredUID AS VideoUID, Title, ThumbChanges
          FROM videos
          WHERE UserID = ?
          AND VideoID NOT IN (
            SELECT VideoID
            FROM Unlocked
          ) AND Visibility = 0
          ORDER BY DateTime DESC LIMIT 5)
          LIMIT 5`;
        videoParams = [req.session.userid, result.userid, result.userid];
      }
      const [images, videos] = await Promise.all([
        // chatdb.execute(imageQuery, imageParams),
        // chatdb.execute(videoQuery, videoParams)
        '',''
      ]);
      return res.render('profile/gallery.njk', { bottomBannerAd: true, session: req.session, cookies: req.cookies, accounttype: result.accounttype, displayname: result.displayname, username: result.username, pp: pp, pb: pb, subbed: result.subbed, images: images, videos: videos });
    } else if (req.params.subroute === 'train') {
      if (!req.session.authorized || req.session.type! < 4) return res.redirect('/chat');
      if (req.session.userid !== result.userid) return res.redirect('/chat');
      // if (!chatCreators[req.session.username!.toLowerCase()]) return res.redirect('/chat');
      // return res.render('chat/train.njk', { libraryid: libraryid, streamstorage: chat_streamstorage, displayname: result.displayname, username: result.username, pp: pp });
    } else if (req.params.subroute === 'debug') {
      if (!req.session.authorized || req.session.type! < 4) return res.redirect('/chat');
      if (req.session.userid !== result.userid) return res.redirect('/chat');
      // if (!chatCreators[req.session.username!.toLowerCase()]) return res.redirect('/chat');
      // return res.render('chat/debug.njk', { libraryid: libraryid, streamstorage: chat_streamstorage, displayname: result.displayname, username: result.username, pp: pp });
    } else {
      return res.status(404).render('error/404.njk', { session: req.session, cookies: req.cookies });
    }
  } catch (error) {
    console.error('Profile route error: ', error);
    return res.status(500).render('error/500.njk', { session: req.session, cookies: req.cookies });
  }
});

// TODO: Paginate below
app.get('/profile/:username/images', async (req, res) => {
  if (!req.params.username) return res.status(400).render('error/400.njk', { session: req.session, cookies: req.cookies });
  try {
    const [result] = await db.execute('SELECT userid, accounttype, displayname, username, pp, pb FROM users WHERE username = ?', [req.params.username]);
    if (!result || result.accounttype < 4) return res.status(404).render('error/404.njk', { session: req.session, cookies: req.cookies });
    let imageQuery = '';
    let imageParams = [];
    if (!req.session.authorized && result.userid !== 1) {
      imageQuery = 'SELECT BlurredUID AS ImageUID FROM images WHERE UserID = ? AND Visibility = 0 ORDER BY DateTime DESC';
      imageParams = [result.userid];
    } else if (req.session.authorized && (req.session.userid === result.userid)) {
      imageQuery = 'SELECT ImageUID, Title FROM images WHERE UserID = ? ORDER BY DateTime DESC';
      imageParams = [result.userid];
    } else if (result.userid === 1) {
      imageQuery = 'SELECT ImageUID, Title FROM images WHERE UserID = ? AND Visibility = 0 ORDER BY DateTime DESC';
      imageParams = [result.userid];
    } else {
      imageQuery = `
        WITH Unlocked AS (
          SELECT i.ImageID, i.ImageUID, i.Title, 0 AS Blur, i.DateTime
          FROM image_unlocks u
          JOIN images i ON u.ImageID = i.ImageID
          WHERE u.UserID = ? AND u.CreatorID = ?
        )
        SELECT ImageUID, Title, Blur, DateTime FROM Unlocked
        UNION ALL
        SELECT BlurredUID AS ImageUID, Title, 1 AS Blur, DateTime
        FROM images
        WHERE UserID = ? AND Visibility = 0
        AND ImageID NOT IN (
          SELECT ImageID
          FROM Unlocked
        )
        ORDER BY DateTime DESC`;
      imageParams = [req.session.userid, result.userid, result.userid];
    }
    // const images = await chatdb.execute(imageQuery, imageParams);
    const images = '';
    return res.render('profile/galimg.njk', {session: req.session, cookies: req.cookies, accounttype: result.accounttype, displayname: result.displayname, username: result.username, pp: result.pp ? `https://cdn.${DOMAIN}/sanctum/pp/${result.pp}.webp` : `/images/DefaultPP250p.jpg`, pb: result.pb ? `https://cdn.${DOMAIN}/sanctum/pb/${result.pb}.webp` : `/images/DefaultPB.jpg`, images: images});
  } catch (error) {
    return res.status(500).render('error/500.njk', { session: req.session, cookies: req.cookies });
  }
});
app.get('/profile/:username/videos', async (req, res) => {
  if (!req.params.username) return res.status(400).render('error/400.njk', { session: req.session, cookies: req.cookies });
  try {
    const [result] = await db.execute('SELECT userid, accounttype, displayname, username, pp, pb FROM users WHERE username = ?', [req.params.username]);
    if (!result || result.accounttype < 4) return res.status(404).render('error/404.njk', { session: req.session, cookies: req.cookies });
    let imageQuery = '';
    let imageParams = [];
    if (!req.session.authorized && result.userid !== 1) {
      imageQuery = 'SELECT BlurredUID AS VideoUID FROM videos WHERE UserID = ? AND Visibility = 0 ORDER BY DateTime DESC';
      imageParams = [result.userid];
    } else if (req.session.authorized && (req.session.userid === result.userid)) {
      imageQuery = 'SELECT ImageUID, Title FROM videos WHERE UserID = ? ORDER BY DateTime DESC';
      imageParams = [result.userid];
    } else if (result.userid === 1) {
      imageQuery = 'SELECT VideoUID, Title FROM videos WHERE UserID = ? AND Visibility = 0 ORDER BY DateTime DESC';
      imageParams = [result.userid];
    } else {
      imageQuery = `
        WITH Unlocked AS (
          SELECT i.VideoID, i.VideoUID, i.Title, 0 AS Blur, i.DateTime
          FROM video_unlocks u
          JOIN videos i ON u.VideoID = i.VideoID
          WHERE u.UserID = ? AND u.CreatorID = ?
        )
        SELECT VideoUID, Title, Blur, DateTime FROM Unlocked
        UNION ALL
        SELECT BlurredUID AS VideoUID, Title, 1 AS Blur, DateTime
        FROM videos
        WHERE UserID = ? AND Visibility = 0
        AND VideoID NOT IN (
          SELECT VideoID
          FROM Unlocked
        )
        ORDER BY DateTime DESC`;
      imageParams = [req.session.userid, result.userid, result.userid];
    }
    // const videos = await chatdb.execute(imageQuery, imageParams);
    const videos = '';
    return res.render('profile/galimg.njk', {session: req.session, cookies: req.cookies, accounttype: result.accounttype, displayname: result.displayname, username: result.username, pp: result.pp ? `https://cdn.${DOMAIN}/sanctum/pp/${result.pp}.webp` : `/images/DefaultPP250p.jpg`, pb: result.pb ? `https://cdn.${DOMAIN}/sanctum/pb/${result.pb}.webp` : `/images/DefaultPB.jpg`, videos: videos});
  } catch (error) {
    return res.status(500).render('error/500.njk', { session: req.session, cookies: req.cookies });
  }
});

// TODO: Combine below (deduplicate code, DRY)
app.post('/profile/:username/:subroute/:action', upload.single('image'), async (req, res) => {
  if (!req.session.authorized) return res.status(401).send('Unauthorized');
  if (req.params.username !== req.session.displayname) return res.status(403).send('Forbidden');
  if (req.params.subroute !== 'edit') return res.status(404).send('Path not found');
  if (req.params.action === 'avatar') {
    if (!req.file) return res.status(400).send('Bad request');
    let connection;
    try {
      connection = await db.getConnection();
      await connection.beginTransaction();
      const [data, [result]] = await Promise.all([
        sharp(req.file.buffer).resize(200, 200).webp({quality: 85}).toBuffer(),
        connection.execute('SELECT userid, pv FROM users WHERE username = ? FOR UPDATE', [req.session.displayname])
      ]);
      const hash = base64UUID();
      // await Promise.all([
      //   bunnyStorage.upload(data, `pp/${hash}.webp`),
      //   connection.execute('UPDATE users SET pv = ? WHERE userid = ?', [hash, result.userid])
      // ]);
      await connection.commit();
      res.cookie("pp", `https://cdn.${DOMAIN}/sanctum/pp/${hash}.webp`);
      res.status(303).redirect(`/profile/${req.session.displayname}/edit`);
      // if (result.pv) {
      //   bunnyStorage.delete(`pp/${result.pv}.webp`).catch((err) => {
      //     console.log(`Profile banner deletion error for pv: ${result.pv} `, err);
      //   });
      // }
    } catch (error) {
      await connection?.rollback();
      console.error('Profile picture upload error: ', error);
      return res.status(500).send('Internal server error');
    } finally {
      await connection?.release();
    }
  } else if (req.params.action === 'banner') {
    if (!req.file) return res.status(400).send('Bad request');
    let connection;
    try {
      connection = await db.getConnection();
      await connection.beginTransaction();
      const [data, [result]] = await Promise.all([
        sharp(req.file.buffer).resize(1500, 300).webp({quality: 85}).toBuffer(),
        connection.execute('SELECT userid, bv FROM users WHERE username = ? FOR UPDATE', [req.session.displayname])
      ]);
      const hash = base64UUID();
      // await Promise.all([
      //   bunnyStorage.upload(data, `pb/${hash}.webp`),
      //   connection.execute('UPDATE users SET bv = ? WHERE userid = ?', [hash, result.userid])
      // ]);
      await connection.commit();
      res.status(303).redirect(`/profile/${req.session.displayname}/edit`);
      // if (result.bv) {
      //   bunnyStorage.delete(`pb/${result.bv}.webp`).catch((err) => {
      //     console.log(`Profile banner deletion error for bv: ${result.bv} `, err);
      //   });
      // }
    } catch (error) {
      await connection?.rollback();
      console.error('Profile banner upload error: ', error);
      return res.status(500).send('Internal server error');
    } finally {
      await connection?.release();
    }
  } else {
    return res.status(404).send('Action not found');
  }
});

app.get('/admin', (req, res) => {
  if (!req.session.authorized) return res.status(401).render('error/401.njk', { session: req.session, cookies: req.cookies });
  if (req.session.type! < 99) return res.status(403).render('error/403.njk', { session: req.session, cookies: req.cookies });
  return res.render('admin/index.njk', { session: req.session, cookies: req.cookies });
});

// Errors
app.get('/400', (req, res) => {
  return res.status(400).render('error/400.njk', { session: req.session, cookies: req.cookies });
});
app.get('/401', (req, res) => {
  return res.status(401).render('error/401.njk', { session: req.session, cookies: req.cookies });
});
app.get('/403', (req, res) => {
  return res.status(403).render('error/403.njk', { session: req.session, cookies: req.cookies });
});
app.get('/404', (req, res) => {
  return res.status(404).render('error/404.njk', { session: req.session, cookies: req.cookies });
});
app.get('/500', (req, res) => {
  return res.status(500).render('error/500.njk', { session: req.session, cookies: req.cookies });
});

// If route cannot be found
app.get('*', (req, res) => {
  return res.status(404).render('error/404.njk', { session: req.session, cookies: req.cookies });
});

app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});
