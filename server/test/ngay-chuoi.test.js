'use strict';
// Kiem thu shared/ngay-chuoi.js (bo dau, ngay thieu). Chay: npm test
const test = require('node:test');
const assert = require('node:assert');
const { boDau, chuanHoaNgayThieu, chuanHoaNgayDu, cotNgayThieu, hienThiNgayThieu } = require('../../shared/ngay-chuoi.js');

test('boDau bo dau tieng Viet, doi d, viet thuong, gon khoang trang', () => {
  assert.strictEqual(boDau('Nguyễn Văn Đạt'), 'nguyen van dat');
  assert.strictEqual(boDau('  ĐẶNG   Thị  Ánh '), 'dang thi anh');
  assert.strictEqual(boDau('Trần Đức Thắng 0900'), 'tran duc thang 0900');
  assert.strictEqual(boDau(null), '');
  assert.strictEqual(boDau(undefined), '');
});

test('chuanHoaNgayThieu: ngay day du', () => {
  assert.deepStrictEqual(chuanHoaNgayThieu('20/10/2000'), { nam: 2000, thang: 10, ngay: 20, chuan: '2000-10-20', hienThi: '20/10/2000' });
  assert.strictEqual(chuanHoaNgayThieu('7/1/1968').chuan, '1968-01-07');
  assert.strictEqual(chuanHoaNgayThieu('7/1/1968').hienThi, '07/01/1968');
});

test('chuanHoaNgayThieu: chi co thang/nam thi ngay la null va chuan la ngay 1', () => {
  assert.deepStrictEqual(chuanHoaNgayThieu('11/2024'), { nam: 2024, thang: 11, ngay: null, chuan: '2024-11-01', hienThi: '11/2024' });
  assert.strictEqual(chuanHoaNgayThieu('9/2016').hienThi, '09/2016');
});

test('chuanHoaNgayThieu: rong thi tra null, Date cua Excel doc duoc', () => {
  assert.strictEqual(chuanHoaNgayThieu(''), null);
  assert.strictEqual(chuanHoaNgayThieu(null), null);
  assert.strictEqual(chuanHoaNgayThieu(new Date(Date.UTC(2026, 4, 5))).chuan, '2026-05-05');
});

test('chuanHoaNgayThieu: bao loi ro rang khi sai', () => {
  assert.throws(() => chuanHoaNgayThieu('31/02/2024'), /không có trong tháng/);
  assert.throws(() => chuanHoaNgayThieu('29/02/2023'), /không có trong tháng/);
  assert.strictEqual(chuanHoaNgayThieu('29/02/2024').chuan, '2024-02-29');
  assert.throws(() => chuanHoaNgayThieu('13/2024'), /Tháng 13/);
  assert.throws(() => chuanHoaNgayThieu('abc'), /không đúng dạng/);
  assert.throws(() => chuanHoaNgayThieu('01/01/1850'), /ngoài khoảng/);
  assert.throws(() => chuanHoaNgayThieu(new Date('khong-phai-ngay')), /không hợp lệ/);
});

test('chuanHoaNgayDu bat buoc co ngay', () => {
  assert.strictEqual(chuanHoaNgayDu('05/09/2016'), '2016-09-05');
  assert.strictEqual(chuanHoaNgayDu(''), null);
  assert.throws(() => chuanHoaNgayDu('09/2016'), /ngày đầy đủ/);
});

test('cotNgayThieu tao 4 cot SQL va hienThiNgayThieu doi nguoc lai', () => {
  const kq = cotNgayThieu('ngay_vao_dang', chuanHoaNgayThieu('02/2019'));
  assert.deepStrictEqual(kq, { ngay_vao_dang_nam: 2019, ngay_vao_dang_thang: 2, ngay_vao_dang_ngay: null, ngay_vao_dang_chuan: '2019-02-01' });
  assert.deepStrictEqual(cotNgayThieu('x', null), { x_nam: null, x_thang: null, x_ngay: null, x_chuan: null });
  assert.strictEqual(hienThiNgayThieu(2019, 2, null), '02/2019');
  assert.strictEqual(hienThiNgayThieu(2019, 2, 5), '05/02/2019');
  assert.strictEqual(hienThiNgayThieu(null, null, null), '');
});
