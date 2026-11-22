const path = require('node:path');
const fs = require('node:fs');
require('dotenv').config({ quiet: true });

const dialect = process.env.DB_DIALECT || 'sqlite';
if (!['sqlite', 'postgres', 'mysql'].includes(dialect)) {
  throw new Error('DB_DIALECT phải là sqlite, postgres hoặc mysql.');
}

const storage = process.env.DB_STORAGE === ':memory:'
  ? ':memory:'
  : path.resolve(__dirname, '../..', process.env.DB_STORAGE || 'storage/vcraft.sqlite');
if (dialect === 'sqlite' && storage !== ':memory:') {
  fs.mkdirSync(path.dirname(storage), { recursive: true });
}

const config = {
  dialect,
  logging: false,
  ...(dialect === 'sqlite' ? { storage } : {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || (dialect === 'postgres' ? 5432 : 3306)),
    database: process.env.DB_NAME || 'vcraft',
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  }),
};

module.exports = { development: config, test: config, production: config };
