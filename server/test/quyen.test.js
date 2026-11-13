'use strict';
// Kiem thu so dang ky quyen, quyen mac dinh, tai quyen. Chay: npm test
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { moCsdl, chayMigrations, nguonMigration } = require('../loi/csdl');
const { napMoDun } = require('../loi/nap-mo-dun');
const { taoSoDangKy, quyenMacDinh, taoQuyenMacDinh, dongBoQuyenMacDinh, taiQuyen, locTruong } = require('../loi/quyen');
const { MUC } = require('../../shared/truong-muc.js');
const { taoMoDunTam } = require('./tro-giup');

const THU_MUC_MODULES = path.join(__dirname, '..', 'modules');

function taoDbVaSoDangKy() {
  const db = moCsdl(':memory:');
  const { dsMoDun } = napMoDun(THU_MUC_MODULES);
  chayMigrations(db, nguonMigration(dsMoDun));
  return { db, dsMoDun, soDangKy: taoSoDangKy(dsMoDun) };
}
const moDunGia = (ten, noiDung) => ({ ten, thuMuc: '', migrations: null, dangKyRoute() {}, muc: [], boLoc: [], baoCao: [], xuat: [], menu: [], ...noiDung });

test('so dang ky: day du va kiem tra tham chieu cheo', () => {
  const { soDangKy } = taoDbVaSoDangKy();
  assert.strictEqual(soDangKy.muc.length, 12);
  assert.strictEqual(soDangKy.mucNhayCam.size, 5);
  assert.strictEqual(soDangKy.boLoc.length, 15);
  assert.strictEqual(soDangKy.baoCao.length, 6);
  assert.strictEqual(soDangKy.xuat.length, 3);

  assert.throws(() => taoSoDangKy([moDunGia('a', { muc: [{ ma: 'x' }] }), moDunGia('b', { muc: [{ ma: 'x' }] })]), /bi trung "x"/);
  assert.throws(() => taoSoDangKy([moDunGia('a', { muc: [{ ma: 'x' }], boLoc: [{ id: 'l', muc: 'khong_co' }] })]), /muc khong ton tai/);
  assert.throws(() => taoSoDangKy([moDunGia('a', { muc: [{ ma: 'x' }], baoCao: [{ id: 'b', mucCanCo: ['y'] }] })]), /can muc khong ton tai: y/);
  assert.throws(() => taoSoDangKy([moDunGia('a', { muc: [{ nhan: 'thieu ma' }] })]), /thieu "ma"/);
});

test('quyen mac dinh cua 3 loai tai khoan mau', () => {
  const { soDangKy } = taoDbVaSoDangKy();
  for (const loai of ['admin', 'xem_day_du']) {
    const dong = quyenMacDinh(loai, soDangKy);
    assert.strictEqual(dong.length, 36);
    assert.ok(dong.every((d) => d.choPhep === 1), loai + ' phai co moi quyen');
  }
  const han = quyenMacDinh('xem_mot_so_muc', soDangKy);
  assert.strictEqual(han.length, 36);
  const bat = (loai) => han.filter((d) => d.loai === loai && d.choPhep === 1).map((d) => d.khoa).sort();
  assert.deepStrictEqual(bat('muc'), ['thong_tin_co_ban']);
  assert.deepStrictEqual(bat('loc'), ['chuc_vu', 'do_tuoi', 'don_vi', 'gioi_tinh', 'quan_ham', 'sap_nghi_huu']);
  assert.deepStrictEqual(bat('bao_cao'), []);
  assert.deepStrictEqual(bat('xuat'), []);
});

test('taoQuyenMacDinh khong ghi de; dongBoQuyenMacDinh them khoa moi cho tai khoan cu', () => {
  const { db, dsMoDun, soDangKy } = taoDbVaSoDangKy();
  const them = db.prepare('INSERT INTO nguoi_dung (ten_dang_nhap, ho_ten, mat_khau_bam, loai) VALUES (?, ?, ?, ?)');
  const idDayDu = Number(them.run('a', 'A', 'x', 'xem_day_du').lastInsertRowid);
  const idHan = Number(them.run('b', 'B', 'x', 'xem_mot_so_muc').lastInsertRowid);
  assert.strictEqual(taoQuyenMacDinh(db, idDayDu, 'xem_day_du', soDangKy), 36);
  assert.strictEqual(taoQuyenMacDinh(db, idDayDu, 'xem_day_du', soDangKy), 0, 'lan hai khong them gi');
  taoQuyenMacDinh(db, idHan, 'xem_mot_so_muc', soDangKy);
  db.prepare("UPDATE quyen_tai_khoan SET cho_phep = 0 WHERE nguoi_dung_id = ? AND khoa = 'luong'").run(idDayDu);

  // Them mo-dun moi co muc va bo loc moi
  const moi = moDunGia('moi', { muc: [{ ma: 'lich_truc', nhan: 'Lịch trực', nhayCam: false }], boLoc: [{ id: 'ca_truc', nhan: 'Ca trực', muc: 'lich_truc' }] });
  const soMoi = taoSoDangKy(dsMoDun.concat([moi]));
  assert.strictEqual(dongBoQuyenMacDinh(db, soMoi), 4, '2 tai khoan x (1 muc + 1 bo loc)');
  assert.strictEqual(dongBoQuyenMacDinh(db, soMoi), 0);
  const quyen = (id, khoa) => db.prepare('SELECT cho_phep FROM quyen_tai_khoan WHERE nguoi_dung_id = ? AND khoa = ?').get(id, khoa).cho_phep;
  assert.strictEqual(quyen(idDayDu, 'lich_truc'), 1, 'xem_day_du duoc cap muc moi');
  assert.strictEqual(quyen(idHan, 'lich_truc'), 0, 'xem_mot_so_muc khong duoc cap muc moi');
  assert.strictEqual(quyen(idDayDu, 'luong'), 0, 'khong sua dong da co');
});

test('taiQuyen: khong co dong = khong duoc; admin co toan quyen ke ca khoa moi; bao cao can du muc', () => {
  const { db, soDangKy, dsMoDun } = taoDbVaSoDangKy();
  const nguoiHan = { id: 1, loai: 'xem_mot_so_muc' };
  db.prepare("INSERT INTO nguoi_dung (id, ten_dang_nhap, ho_ten, mat_khau_bam, loai) VALUES (1, 'b', 'B', 'x', 'xem_mot_so_muc')").run();
  taoQuyenMacDinh(db, 1, 'xem_mot_so_muc', soDangKy);
  const q = taiQuyen(db, nguoiHan, soDangKy);
  assert.strictEqual(q.laAdmin, false);
  assert.deepStrictEqual(q.danhSachMuc(), ['thong_tin_co_ban']);
  assert.strictEqual(q.coMuc('luong'), false);
  assert.strictEqual(q.coBoLoc('don_vi'), true);
  assert.strictEqual(q.coBoLoc('la_dang_vien'), false);
  assert.strictEqual(q.coBaoCao('danh_sach_tuy_chon'), false, 'chua duoc cap bao cao');
  assert.strictEqual(q.coBaoCao('khong_co_bao_cao'), false);

  db.prepare("UPDATE quyen_tai_khoan SET cho_phep = 1 WHERE khoa IN ('con_nho', 'danh_sach_tuy_chon')").run();
  const q2 = taiQuyen(db, nguoiHan, soDangKy);
  assert.strictEqual(q2.coBaoCao('con_nho'), false, 'con_nho can them muc than_nhan');
  assert.strictEqual(q2.coBaoCao('danh_sach_tuy_chon'), true, 'khong can muc nao');
  db.prepare("UPDATE quyen_tai_khoan SET cho_phep = 1 WHERE khoa = 'than_nhan'").run();
  assert.strictEqual(taiQuyen(db, nguoiHan, soDangKy).coBaoCao('con_nho'), true);

  // Admin: co moi quyen, ke ca muc moi chua co dong quyen nao
  const moi = taoSoDangKy(dsMoDun.concat([moDunGia('moi', { muc: [{ ma: 'lich_truc', nhan: 'Lịch trực' }] })]));
  const admin = taiQuyen(db, { id: 99, loai: 'admin' }, moi);
  assert.strictEqual(admin.laAdmin, true);
  assert.strictEqual(admin.coMuc('lich_truc'), true);
  assert.strictEqual(admin.danhSachMuc().length, 13);
  assert.strictEqual(admin.coBaoCao('syll'), true);
  // Tai khoan thuong: muc moi chua co dong quyen thi KHONG duoc
  assert.strictEqual(taiQuyen(db, nguoiHan, moi).coMuc('lich_truc'), false);
});

test('locTruong khong bao gio tra cot noi bo (tim_kiem, da_xoa) ke ca khi co du 12 muc', () => {
  const dong = { id: 1, ho_ten_khai_sinh: 'A', so_can_cuoc: '9', he_so_luong: 5, tim_kiem: 'a 0900', da_xoa: 0, created_at: 'x', version: 3 };
  const tatCa = MUC.map((m) => m.ma);
  const kq = locTruong(dong, tatCa, 'quan_nhan');
  assert.deepStrictEqual(Object.keys(kq).sort(), ['he_so_luong', 'ho_ten_khai_sinh', 'id', 'so_can_cuoc', 'version']);
  assert.deepStrictEqual(locTruong(dong, [], 'quan_nhan'), { id: 1, version: 3 });
  assert.strictEqual(locTruong(null, tatCa, 'quan_nhan'), null);
  assert.strictEqual(locTruong({ id: 1, loai: 'ky_luat' }, ['luong'], 'ky_luat_tien_an_tien_su'), null);
});

test('cau hinh moi: PHUT_HET_PHIEN va BCRYPT_COST', () => {
  const { layCauHinh } = require('../loi/doc-env');
  const truoc = { ...process.env };
  try {
    delete process.env.PHUT_HET_PHIEN;
    delete process.env.BCRYPT_COST;
    const mac = layCauHinh('/goc');
    assert.strictEqual(mac.phutHetPhien, 30);
    assert.strictEqual(mac.bcryptCost, 12);
    process.env.PHUT_HET_PHIEN = '0';
    assert.throws(() => layCauHinh('/goc'), /PHUT_HET_PHIEN/);
    process.env.PHUT_HET_PHIEN = '30';
    process.env.BCRYPT_COST = '3';
    assert.throws(() => layCauHinh('/goc'), /BCRYPT_COST/);
  } finally {
    process.env = truoc;
  }
});
