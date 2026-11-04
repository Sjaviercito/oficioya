// Prepara una base de pruebas limpia aplicando las migraciones SQL del proyecto.
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

module.exports = async () => {
  require('dotenv').config({ quiet: true });
  const url = process.env.DATABASE_URL_TEST;
  if (!url) {
    console.log('\n[pruebas] Sin DATABASE_URL_TEST: se omiten las pruebas de integración.');
    return;
  }
  const client = new Client({ connectionString: url });
  await client.connect();
  await client.query('DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;');
  const dir = path.resolve(__dirname, '../prisma/migrations');
  const carpetas = fs.readdirSync(dir).filter((d) => fs.statSync(path.join(dir, d)).isDirectory()).sort();
  for (const c of carpetas) {
    await client.query(fs.readFileSync(path.join(dir, c, 'migration.sql'), 'utf8'));
  }
  await client.end();
  fs.rmSync(path.resolve(__dirname, '../.test-files'), { recursive: true, force: true });
};
