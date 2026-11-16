'use strict';
// Kiem thu shared/bieu-mau.js: doi qua lai dong CSDL <-> bieu mau, tren 100 ho so gia. Chay: npm test
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { moCsdl, chayMigrations, nguonMigration } = require('../loi/csdl');
const { napMoDun } = require('../loi/nap-mo-dun');
const { taoDuLieuGia } = require('../scripts/tao-du-lieu-gia');
const { TRUONG } = require('../../shared/truong-muc.js');
const { dongSangBieuMau, bieuMauSangCot, taoTimKiem, ngayDuSangHienThi } = require('../../shared/bieu-mau.js');
const { tinhTuoi } = require('../../shared/ngay-chuoi.js');

function taoDb() {
  const db = moCsdl(':memory:');
  const { dsMoDun } = napMoDun(path.join(__dirname, '..', 'modules'));
  chayMigrations(db, nguonMigration(dsMoDun));
  taoDuLieuGia(db, { homNay: new Date(2026, 10, 11) });
  return db;
}

test('doi qua lai: moi dong cua 9 bang (100 ho so gia) ra lai dung cac cot ban dau, khong loi', () => {
  const db = taoDb();
  const bang = [...new Set(TRUONG.map((t) => t.bang))];
  let soDong = 0;
  for (const ten of bang) {
    const cotBang = TRUONG.filter((t) => t.bang === ten).flatMap((t) => t.cot);
    for (const dong of db.prepare('SELECT * FROM ' + ten).all()) {
      const bieuMau = dongSangBieuMau(ten, dong);
      const { cot, loi } = bieuMauSangCot(ten, bieuMau);
      assert.deepStrictEqual(loi, {}, ten + ' id ' + dong.id + ' bao loi: ' + JSON.stringify(loi));
      for (const c of cotBang) {
        assert.strictEqual(cot[c] === undefined ? null : cot[c], dong[c], ten + '.' + c + ' (id ' + dong.id + ')');
      }
      soDong += 1;
    }
  }
  assert.ok(soDong > 1000, 'phai thu tren nhieu dong: ' + soDong);
});

test('bieu mau: dinh dang ngay, so, bat buoc, danh muc, lua chon co dinh', () => {
  const hopLe = { ma_quan_nhan: 'A1', ho_ten_khai_sinh: ' Nguyen A ', ngay_sinh: '20/10/2000', gioi_tinh: 'nam', que_quan: 'x', don_vi: '3', quan_ham: 4, ngay_tuyen_dung_lan_dau: '09/2016' };
  const { cot, loi } = bieuMauSangCot('quan_nhan', hopLe);
  assert.deepStrictEqual(loi, {});
  assert.strictEqual(cot.ho_ten_khai_sinh, 'Nguyen A', 'cat khoang trang');
  assert.strictEqual(cot.don_vi_id, 3);
  assert.strictEqual(cot.ngay_sinh, '2000-10-20');
  assert.strictEqual(cot.ngay_tuyen_dung_lan_dau_ngay, null);
  assert.strictEqual(cot.ngay_tuyen_dung_lan_dau_chuan, '2016-09-01');
  assert.strictEqual(cot.la_dang_vien, 0);

  const sai = bieuMauSangCot('quan_nhan', { ...hopLe, ngay_sinh: '31/02/2000', gioi_tinh: 'khac', he_so_luong: 'abc', nam_tot_nghiep_pho_thong: '1800', don_vi: 'x', ngay_vao_dang: '2019', ho_ten_khai_sinh: '   ' }).loi;
  assert.match(sai.ngay_sinh, /không có trong tháng/);
  assert.match(sai.gioi_tinh, /không hợp lệ/);
  assert.match(sai.he_so_luong, /Phải là số/);
  assert.match(sai.nam_tot_nghiep_pho_thong, /năm hợp lệ/);
  assert.match(sai.don_vi, /không hợp lệ/);
  assert.match(sai.ngay_vao_dang, /không đúng dạng/);
  assert.strictEqual(sai.ho_ten_khai_sinh, 'Bắt buộc nhập');
  assert.strictEqual(bieuMauSangCot('quan_nhan', { ...hopLe, he_so_luong: '5,4' }).cot.he_so_luong, 5.4);
  assert.strictEqual(ngayDuSangHienThi('2026-01-05'), '05/01/2026');
  assert.match(bieuMauSangCot('quan_nhan', { ...hopLe, ten_goi_khac: 'x'.repeat(501) }).loi.ten_goi_khac, /Tối đa/);
});

test('tim_kiem khop cach tao cua script du lieu gia', () => {
  const db = taoDb();
  const dong = db.prepare("SELECT * FROM quan_nhan WHERE ma_quan_nhan = 'GIA.005'").get();
  assert.strictEqual(taoTimKiem(dong), dong.tim_kiem);
});

test('tinhTuoi: tron nam, tron thang, ngay sinh chi co thang/nam, chua sinh', () => {
  assert.deepStrictEqual(tinhTuoi('2025-04-02', '2026-11-13'), { tuoi: 1, soThang: 19 });
  assert.deepStrictEqual(tinhTuoi('2025-04-20', '2026-04-19'), { tuoi: 0, soThang: 11 });
  assert.deepStrictEqual(tinhTuoi('2025-04-20', '2026-04-20'), { tuoi: 1, soThang: 12 });
  assert.deepStrictEqual(tinhTuoi('2020-12-01', '2026-11-13'), { tuoi: 5, soThang: 71 });
  assert.strictEqual(tinhTuoi('2027-01-01', '2026-11-13'), null);
  assert.strictEqual(tinhTuoi(null, '2026-11-13'), null);
});
