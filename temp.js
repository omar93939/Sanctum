import crypto from 'crypto';

const base64UUID = () => {
  return crypto.randomBytes(96).toString('base64url');
}

console.log(base64UUID());