'use strict';
// Kiem thu csdl.js (migration) va cau truc bang. Chay: npm test
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { moCsdl, chayMigrations, nguonMigration } = require('../loi/csdl');
const { napMoDun } = require('../loi/nap-mo-dun');

const THU_MUC_MODULES = path.join(__dirname, '..', 'modules');

function taoDbDayDu() {
  const db = moCsdl(':memory:');
  const { dsMoDun } = napMoDun(THU_MUC_MODULES);
  const kq = chayMigrations(db, nguonMigration(dsMoDun));
  return { db, dsMoDun, kq };
}

function thuMucTam() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'hrm-mig-'));
}

test('migration tao du bang va chay lai khong loi, khong nhan doi', () => {
  const { db, dsMoDun, kq } = taoDbDayDu();
  assert.strictEqual(kq.daChay.length, 7);
  const bang = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'").all().map((d) => d.name);
  for (const ten of ['nguoi_dung', 'phien', 'quyen_tai_khoan', 'nhat_ky', 'danh_muc', 'quy_tac', 'cau_hinh_van_ban', 'so_van_ban', 'cau_hinh',
    'quan_nhan', 'qua_trinh_truoc_tuyen_dung', 'qua_trinh_cong_tac', 'dao_tao', 'khen_thuong', 'ky_luat_tien_an_tien_su', 'luong',
    'than_nhan', 'trang_thai_quan_nhan', 'phien_ban_csdl']) {
    assert.ok(bang.includes(ten), 'thieu bang ' + ten);
  }
  const lanHai = chayMigrations(db, nguonMigration(dsMoDun));
  assert.deepStrictEqual(lanHai.daChay, []);
  assert.strictEqual(lanHai.daCo, 7);
  assert.strictEqual(db.prepare('SELECT COUNT(*) AS n FROM phien_ban_csdl').get().n, 7);
  // danh muc mac dinh khong bi nhan doi
  assert.strictEqual(db.prepare("SELECT COUNT(*) AS n FROM danh_muc WHERE loai = 'trang_thai'").get().n, 6);
  assert.strictEqual(db.prepare("SELECT tinh_la_vang FROM danh_muc WHERE ma = 'co_mat'").get().tinh_la_vang, 0);
  assert.strictEqual(db.prepare("SELECT tinh_la_vang FROM danh_muc WHERE ma = 'benh_xa'").get().tinh_la_vang, 1);
});

test('khoa ngoai duoc bat va chan dong mo coi', () => {
  const { db } = taoDbDayDu();
  assert.strictEqual(db.pragma('foreign_keys', { simple: true }), 1);
  assert.throws(
    () => db.prepare("INSERT INTO than_nhan (quan_nhan_id, nhom, quan_he, ho_ten) VALUES (999, 'ban_than', 'cha', 'A')").run(),
    /FOREIGN KEY/
  );
});

test('nhat_ky chi ghi them: sua va xoa deu bi tu choi', () => {
  const { db } = taoDbDayDu();
  db.prepare("INSERT INTO nhat_ky (hanh_dong, chi_tiet) VALUES ('thu', '{\"a\":1}')").run();
  assert.throws(() => db.prepare("UPDATE nhat_ky SET hanh_dong = 'sua'").run(), /chi duoc ghi them/);
  assert.throws(() => db.prepare('DELETE FROM nhat_ky').run(), /chi duoc ghi them/);
  assert.strictEqual(db.prepare('SELECT COUNT(*) AS n FROM nhat_ky').get().n, 1);
  assert.throws(() => db.prepare("INSERT INTO nhat_ky (hanh_dong, chi_tiet) VALUES ('thu', 'khong-phai-json')").run(), /CHECK/);
});

test('chi duoc co mot tai khoan admin, ten dang nhap khong phan biet hoa thuong', () => {
  const { db } = taoDbDayDu();
  const them = db.prepare('INSERT INTO nguoi_dung (ten_dang_nhap, ho_ten, mat_khau_bam, loai) VALUES (?, ?, ?, ?)');
  them.run('admin', 'Quan tri', 'bam', 'admin');
  assert.throws(() => them.run('admin2', 'Hai', 'bam', 'admin'), /UNIQUE/);
  them.run('xem1', 'Xem 1', 'bam', 'xem_day_du');
  them.run('xem2', 'Xem 2', 'bam', 'xem_mot_so_muc');
  assert.throws(() => them.run('XEM1', 'Trung', 'bam', 'xem_day_du'), /UNIQUE/);
  assert.throws(() => them.run('sai', 'Sai loai', 'bam', 'loai_la'), /CHECK/);
});

test('rang buoc cua bang quan_nhan: ma duy nhat, ngay thieu hop le, dinh dang ngay', () => {
  const { db } = taoDbDayDu();
  const donVi = db.prepare("INSERT INTO danh_muc (loai, ma, ten) VALUES ('don_vi', 'dv', 'Don vi')").run().lastInsertRowid;
  const hamId = db.prepare("INSERT INTO danh_muc (loai, ma, ten) VALUES ('quan_ham', 'h', 'Ham')").run().lastInsertRowid;
  const them = (ma, sua = {}) => {
    const dong = {
      ma_quan_nhan: ma, ho_ten_khai_sinh: 'A', ngay_sinh: '2000-10-20', gioi_tinh: 'nam', que_quan: 'x',
      don_vi_id: donVi, quan_ham_id: hamId, ngay_tuyen_dung_lan_dau_nam: 2016, ngay_tuyen_dung_lan_dau_thang: 9, ...sua,
    };
    const cot = Object.keys(dong);
    return db.prepare('INSERT INTO quan_nhan (' + cot.join(', ') + ') VALUES (' + cot.map(() => '?').join(', ') + ')').run(...cot.map((c) => dong[c]));
  };
  them('QN1');
  assert.throws(() => them('QN1'), /UNIQUE/);
  assert.throws(() => them('QN2', { ngay_sinh: '20/10/2000' }), /CHECK/);
  assert.throws(() => them('QN3', { gioi_tinh: 'khac' }), /CHECK/);
  assert.throws(() => them('QN4', { ngay_tuyen_dung_lan_dau_thang: 13 }), /CHECK/);
  assert.throws(() => them('QN5', { ngay_tuyen_dung_lan_dau_ngay: 5, ngay_tuyen_dung_lan_dau_thang: null }), /NOT NULL|CHECK/);
  assert.throws(() => them('QN6', { don_vi_id: 99999 }), /FOREIGN KEY/);
  assert.throws(() => them('QN7', { ngay_tuyen_dung_lan_dau_nam: null }), /NOT NULL/);
  // xoa mem: cot da_xoa chi nhan 0 hoac 1
  assert.throws(() => them('QN8', { da_xoa: 2 }), /CHECK/);
});

test('trang_thai: den_ngay khong duoc truoc tu_ngay; quy_tac: dieu_kien phai la JSON', () => {
  const { db } = taoDbDayDu();
  const donVi = db.prepare("INSERT INTO danh_muc (loai, ma, ten) VALUES ('don_vi', 'dv', 'Don vi')").run().lastInsertRowid;
  const ham = db.prepare("INSERT INTO danh_muc (loai, ma, ten) VALUES ('quan_ham', 'h', 'Ham')").run().lastInsertRowid;
  const qn = db.prepare(
    `INSERT INTO quan_nhan (ma_quan_nhan, ho_ten_khai_sinh, ngay_sinh, gioi_tinh, que_quan, don_vi_id, quan_ham_id,
       ngay_tuyen_dung_lan_dau_nam, ngay_tuyen_dung_lan_dau_thang) VALUES ('QN1', 'A', '2000-01-01', 'nam', 'x', ?, ?, 2016, 9)`
  ).run(donVi, ham).lastInsertRowid;
  const tt = db.prepare("SELECT id FROM danh_muc WHERE ma = 'nghi_phep'").get().id;
  const them = db.prepare('INSERT INTO trang_thai_quan_nhan (quan_nhan_id, trang_thai_id, tu_ngay, den_ngay) VALUES (?, ?, ?, ?)');
  them.run(qn, tt, '2026-11-01', '2026-11-05');
  assert.throws(() => them.run(qn, tt, '2026-11-10', '2026-11-05'), /CHECK/);
  const themQuyTac = db.prepare("INSERT INTO quy_tac (loai, ten, dieu_kien, ket_qua) VALUES ('nghi_huu', 'thu', ?, '{}')");
  themQuyTac.run('{"gioi_tinh":"nam"}');
  assert.throws(() => themQuyTac.run('khong phai json'), /CHECK/);
  // xoa quan nhan thi cac dong con xoa theo (ON DELETE CASCADE)
  db.prepare('DELETE FROM quan_nhan WHERE id = ?').run(qn);
  assert.strictEqual(db.prepare('SELECT COUNT(*) AS n FROM trang_thai_quan_nhan').get().n, 0);
});

test('migration da chay ma noi dung bi sua thi bao loi; doi kieu xuong dong thi khong sao', () => {
  const thuMuc = thuMucTam();
  const file = path.join(thuMuc, '001-thu.sql');
  fs.writeFileSync(file, 'CREATE TABLE thu_a (x INTEGER);\nINSERT INTO thu_a VALUES (1);\n', 'utf8');
  const db = moCsdl(':memory:');
  const nguon = [{ ten: 'thu', thuMuc }];
  assert.strictEqual(chayMigrations(db, nguon).daChay.length, 1);
  fs.writeFileSync(file, 'CREATE TABLE thu_a (x INTEGER);\r\nINSERT INTO thu_a VALUES (1);\r\n', 'utf8'); // chi doi CRLF
  assert.strictEqual(chayMigrations(db, nguon).daChay.length, 0);
  fs.writeFileSync(file, 'CREATE TABLE thu_a (x INTEGER, y INTEGER);\n', 'utf8'); // sua that
  assert.throws(() => chayMigrations(db, nguon), /noi dung bi sua/);
});

test('migration loi giua chung khong de lai gi va khong duoc ghi la da chay', () => {
  const thuMuc = thuMucTam();
  fs.writeFileSync(path.join(thuMuc, '001-hong.sql'), 'CREATE TABLE thu_b (x INTEGER);\nINSERT INTO khong_co_bang VALUES (1);\n', 'utf8');
  const db = moCsdl(':memory:');
  assert.throws(() => chayMigrations(db, [{ ten: 'thu', thuMuc }]), /001-hong\.sql bi loi/);
  assert.strictEqual(db.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE name = 'thu_b'").get().n, 0);
  assert.strictEqual(db.prepare('SELECT COUNT(*) AS n FROM phien_ban_csdl').get().n, 0);
});

test('hai file migration cung so thi bao loi', () => {
  const thuMuc = thuMucTam();
  fs.writeFileSync(path.join(thuMuc, '001-a.sql'), 'SELECT 1;', 'utf8');
  fs.writeFileSync(path.join(thuMuc, '001-b.sql'), 'SELECT 2;', 'utf8');
  assert.throws(() => chayMigrations(moCsdl(':memory:'), [{ ten: 'thu', thuMuc }]), /cung so 001/);
});
