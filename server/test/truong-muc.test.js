'use strict';
// Kiem thu shared/truong-muc.js va su khop voi cau truc bang that. Chay: npm test
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { MUC, TRUONG, COT_KY_THUAT, cotTheoMuc, mucCuaTruong, mucCuaDong, laMucNhayCam } = require('../../shared/truong-muc.js');
const { moCsdl, chayMigrations, nguonMigration } = require('../loi/csdl');
const { napMoDun } = require('../loi/nap-mo-dun');

function taoDb() {
  const db = moCsdl(':memory:');
  const { dsMoDun } = napMoDun(path.join(__dirname, '..', 'modules'));
  chayMigrations(db, nguonMigration(dsMoDun));
  return db;
}

test('co 12 muc, dung 5 muc nhay cam', () => {
  assert.strictEqual(MUC.length, 12);
  assert.deepStrictEqual(MUC.filter((m) => m.nhayCam).map((m) => m.ma).sort(),
    ['dac_diem_chinh_tri', 'ky_luat', 'luong', 'so_dinh_danh', 'tien_an_tien_su']);
  assert.strictEqual(laMucNhayCam('luong'), true);
  assert.strictEqual(laMucNhayCam('lien_he'), false);
  assert.throws(() => laMucNhayCam('khong_co'), /khong ton tai/);
});

test('moi truong thuoc dung mot muc hop le va khong trung', () => {
  assert.strictEqual(TRUONG.length, 116);
  const maMuc = new Set(MUC.map((m) => m.ma));
  const daThay = new Set();
  for (const t of TRUONG) {
    assert.ok(maMuc.has(t.muc), 'muc sai o ' + t.bang + '.' + t.truong);
    const khoa = t.bang + '.' + t.truong;
    assert.ok(!daThay.has(khoa), 'trung truong ' + khoa);
    daThay.add(khoa);
    assert.ok(t.cot.length >= 1);
  }
});

test('khong cot SQL nao thuoc hai truong (nen khong thuoc hai muc)', () => {
  const daThay = new Set();
  for (const t of TRUONG) {
    for (const c of t.cot) {
      const khoa = t.bang + '.' + c;
      assert.ok(!daThay.has(khoa), 'cot trung: ' + khoa);
      daThay.add(khoa);
    }
  }
});

test('bang truong khop tung cot voi cau truc bang that (khong thieu, khong thua)', () => {
  const db = taoDb();
  const bang = [...new Set(TRUONG.map((t) => t.bang))];
  assert.strictEqual(bang.length, 9);
  for (const ten of bang) {
    const cotThat = db.prepare('PRAGMA table_info(' + ten + ')').all().map((c) => c.name);
    const cotKhaiBao = TRUONG.filter((t) => t.bang === ten).flatMap((t) => t.cot);
    for (const c of cotKhaiBao) {
      assert.ok(cotThat.includes(c), 'bang ' + ten + ' khong co cot ' + c);
    }
    const chuaGan = cotThat.filter((c) => !cotKhaiBao.includes(c) && !COT_KY_THUAT.includes(c));
    assert.deepStrictEqual(chuaGan, [], 'bang ' + ten + ' co cot chua gan muc: ' + chuaGan.join(', '));
  }
});

test('cotTheoMuc chi tra cot cua cac muc duoc cap', () => {
  const luong = cotTheoMuc(['luong'], 'quan_nhan');
  assert.ok(luong.includes('he_so_luong') && luong.includes('ngay_huong_luong_chuan'));
  assert.ok(!luong.includes('ho_ten_khai_sinh'));
  const coBan = cotTheoMuc(['thong_tin_co_ban'], 'quan_nhan');
  assert.ok(coBan.includes('ho_ten_khai_sinh') && coBan.includes('don_vi_id'));
  assert.ok(!coBan.includes('so_can_cuoc') && !coBan.includes('he_so_luong') && !coBan.includes('la_dang_vien'));
  assert.deepStrictEqual(cotTheoMuc([], 'quan_nhan'), []);
  const tatCa = cotTheoMuc(['thong_tin_co_ban']);
  assert.ok(Object.keys(tatCa).includes('than_nhan'));
  assert.deepStrictEqual(tatCa.than_nhan, []);
  assert.throws(() => cotTheoMuc(['khong_co']), /khong ton tai/);
});

test('quyen theo tung truong: can cuoc va tien an cua than nhan khong thuoc muc than_nhan', () => {
  assert.strictEqual(mucCuaTruong('than_nhan', 'so_can_cuoc'), 'so_dinh_danh');
  assert.strictEqual(mucCuaTruong('than_nhan', 'tien_an'), 'tien_an_tien_su');
  assert.strictEqual(mucCuaTruong('than_nhan', 'thai_do_chinh_tri'), 'dac_diem_chinh_tri');
  assert.strictEqual(mucCuaTruong('than_nhan', 'ho_ten'), 'than_nhan');
  assert.ok(!cotTheoMuc(['than_nhan'], 'than_nhan').includes('so_can_cuoc'));
  assert.throws(() => mucCuaTruong('than_nhan', 'khong_co'), /Khong co truong/);
});

test('bang ky luat / tien an phan quyen theo tung dong', () => {
  assert.strictEqual(mucCuaDong('ky_luat_tien_an_tien_su', { loai: 'ky_luat' }), 'ky_luat');
  assert.strictEqual(mucCuaDong('ky_luat_tien_an_tien_su', { loai: 'tien_an' }), 'tien_an_tien_su');
  assert.strictEqual(mucCuaDong('ky_luat_tien_an_tien_su', { loai: 'tien_su' }), 'tien_an_tien_su');
  assert.strictEqual(mucCuaDong('quan_nhan', {}), null);
  assert.throws(() => mucCuaDong('ky_luat_tien_an_tien_su', { loai: 'la' }), /khong hop le/);
});
