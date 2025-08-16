import mariadb from 'mariadb';

const db = mariadb.createPool({
  host: 'localhost',
  user: 'root',
  password: process.env.SANCTUM_DATABASE_PASSWORD,
  database: 'sanctum'
});

export default db;
