'use strict';
// Kiem thu doc-env.js. Chay: npm test
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { docEnv, layCauHinh } = require('./doc-env');

function taoFileTam(noiDung) {
  const thuMuc = fs.mkdtempSync(path.join(os.tmpdir(), 'hrm-env-'));
  const duongDan = path.join(thuMuc, '.env');
  fs.writeFileSync(duongDan, noiDung, 'utf8');
  return duongDan;
}

test('docEnv doc dung khoa, bo ghi chu, bo ngoac, chiu duoc CRLF va BOM', () => {
  const duongDan = taoFileTam('\ufeff# ghi chu\r\nHRM_TEST_A=1\r\n\r\nHRM_TEST_B = "xin chao"\r\nHRM_TEST_C=\'abc\'\r\nkhong-co-dau-bang\r\n');
  delete process.env.HRM_TEST_A;
  delete process.env.HRM_TEST_B;
  delete process.env.HRM_TEST_C;
  const kq = docEnv(duongDan);
  assert.deepStrictEqual(kq, { HRM_TEST_A: '1', HRM_TEST_B: 'xin chao', HRM_TEST_C: 'abc' });
  assert.strictEqual(process.env.HRM_TEST_B, 'xin chao');
});

test('docEnv khong ghi de gia tri da co san trong moi truong', () => {
  process.env.HRM_TEST_D = 'giu-nguyen';
  const duongDan = taoFileTam('HRM_TEST_D=gia-tri-moi\n');
  docEnv(duongDan);
  assert.strictEqual(process.env.HRM_TEST_D, 'giu-nguyen');
});

test('docEnv tra ve doi tuong rong neu khong co file', () => {
  assert.deepStrictEqual(docEnv(path.join(os.tmpdir(), 'khong-co-file-nay.env')), {});
});

test('layCauHinh dung mac dinh va bao loi khi cong khong hop le', () => {
  const truoc = { ...process.env };
  try {
    delete process.env.CONG;
    delete process.env.DUONG_DAN_DB;
    delete process.env.BAT_HTTPS;
    const cauHinh = layCauHinh(path.resolve('/goc'));
    assert.strictEqual(cauHinh.cong, 3000);
    assert.strictEqual(cauHinh.batHttps, false);
    assert.ok(cauHinh.duongDanDb.endsWith(path.join('du-lieu', 'hrm.db')));

    process.env.CONG = 'abc';
    assert.throws(() => layCauHinh('/goc'), /CONG/);
    process.env.CONG = '70000';
    assert.throws(() => layCauHinh('/goc'), /CONG/);
  } finally {
    process.env = truoc;
  }
});
