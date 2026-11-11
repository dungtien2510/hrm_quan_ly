'use strict';
// Kiem thu nap-mo-dun.js. Chay: npm test
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const express = require('express');
const { napMoDun, dangKyRouteTatCa, gom } = require('./nap-mo-dun');

function taoMoDun(thuMucGoc, ten, noiDungModule) {
  const thuMuc = path.join(thuMucGoc, ten);
  fs.mkdirSync(thuMuc, { recursive: true });
  if (noiDungModule !== null) {
    fs.writeFileSync(path.join(thuMuc, 'module.js'), noiDungModule, 'utf8');
  }
}

const MODUN_TOT = (ten) =>
  "module.exports = { ten: '" + ten + "', dangKyRoute(router) { router.get('/', (q, r) => r.json({ ten: '" + ten + "' })); }," +
  " menu: [{ id: '" + ten + "', nhan: '" + ten + "', duongDan: '/" + ten + "', thuTu: 5 }] };";

test('nap duoc mo-dun mau xin-chao that cua du an', () => {
  const kq = napMoDun(path.join(__dirname, '..', 'modules'));
  assert.deepStrictEqual(kq.dsLoi, []);
  assert.ok(kq.dsMoDun.map((m) => m.ten).includes('xin-chao'));
});

test('mo-dun loi khong lam hong cac mo-dun khac va co ghi ro ten', () => {
  const goc = fs.mkdtempSync(path.join(os.tmpdir(), 'hrm-modules-'));
  taoMoDun(goc, 'tot', MODUN_TOT('tot'));
  taoMoDun(goc, 'hong-cu-phap', 'module.exports = {');
  taoMoDun(goc, 'sai-ten', MODUN_TOT('ten-khac'));
  taoMoDun(goc, 'thieu-ham', "module.exports = { ten: 'thieu-ham' };");
  taoMoDun(goc, 'khong-co-file', null);
  taoMoDun(goc, '_da-tat', MODUN_TOT('_da-tat'));

  const kq = napMoDun(goc);
  assert.deepStrictEqual(kq.dsMoDun.map((m) => m.ten), ['tot']);
  const tenLoi = kq.dsLoi.map((l) => l.moDun).sort();
  assert.deepStrictEqual(tenLoi, ['hong-cu-phap', 'khong-co-file', 'sai-ten', 'thieu-ham']);
});

test('thu muc mo-dun khong ton tai thi bao loi, khong nem ngoai le', () => {
  const kq = napMoDun(path.join(os.tmpdir(), 'khong-co-thu-muc-nay-12345'));
  assert.strictEqual(kq.dsMoDun.length, 0);
  assert.strictEqual(kq.dsLoi.length, 1);
});

test('gom lay menu cua moi mo-dun va gan ten mo-dun', () => {
  const goc = fs.mkdtempSync(path.join(os.tmpdir(), 'hrm-modules-'));
  taoMoDun(goc, 'a', MODUN_TOT('a'));
  taoMoDun(goc, 'b', MODUN_TOT('b'));
  const { dsMoDun } = napMoDun(goc);
  const menu = gom(dsMoDun, 'menu');
  assert.deepStrictEqual(menu.map((m) => m.moDun), ['a', 'b']);
  assert.deepStrictEqual(gom(dsMoDun, 'muc'), []);
});

test('route cua mo-dun duoc gan o /api/<ten> va goi duoc', async () => {
  const goc = fs.mkdtempSync(path.join(os.tmpdir(), 'hrm-modules-'));
  taoMoDun(goc, 'mot', MODUN_TOT('mot'));
  taoMoDun(goc, 'hai', MODUN_TOT('hai'));
  const { dsMoDun } = napMoDun(goc);

  const app = express();
  const kq = dangKyRouteTatCa(app, dsMoDun);
  assert.deepStrictEqual(kq.daDangKy, ['hai', 'mot'].sort());

  const maychu = app.listen(0, '127.0.0.1');
  await new Promise((xong) => maychu.once('listening', xong));
  try {
    const { port } = maychu.address();
    const phanHoi = await fetch('http://127.0.0.1:' + port + '/api/mot');
    assert.strictEqual(phanHoi.status, 200);
    assert.deepStrictEqual(await phanHoi.json(), { ten: 'mot' });
    const khongCo = await fetch('http://127.0.0.1:' + port + '/mot');
    assert.strictEqual(khongCo.status, 404);
  } finally {
    maychu.close();
  }
});
