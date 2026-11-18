const test = require('node:test');
const assert = require('node:assert/strict');
const { esOrigenPermitido } = require('../src/config/cors');

test('CORS permite localhost y dominios de Vercel por defecto', () => {
  assert.equal(esOrigenPermitido('http://localhost:4200'), true);
  assert.equal(esOrigenPermitido('https://surtibasculas.vercel.app'), true);
  assert.equal(esOrigenPermitido('https://surtibasculas-git-folgarever-folgarever.vercel.app'), true);
});

test('CORS rechaza dominios ajenos por defecto', () => {
  assert.equal(esOrigenPermitido('https://ejemplo.com'), false);
  assert.equal(esOrigenPermitido('https://surtibasculas.vercel.app.evil.com'), false);
});
