// Las pruebas nunca usan la base de desarrollo: solo DATABASE_URL_TEST.
process.env.NODE_ENV = 'test';
if (process.env.DATABASE_URL_TEST) process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
process.env.PUBLIC_UPLOADS_DIR = require('path').resolve(__dirname, '../.test-files/uploads');
process.env.PRIVATE_STORAGE_DIR = require('path').resolve(__dirname, '../.test-files/storage');
