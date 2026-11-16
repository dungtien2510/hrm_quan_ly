'use strict';
// ho-so.js: xem danh sach va xem mot ho so quan nhan. MOI cot tra ve deu qua locTruong (chi cac muc duoc cap).
//   GET /api/quan-nhan                     danh sach co phan trang
//   GET /api/quan-nhan/:id                 mot ho so (cac muc khong duoc cap thi khong co du lieu va khong co ca khoa)
//   GET /api/quan-nhan/:id/so-dinh-danh    so can cuoc / BHXH / BHYT DAY DU (can muc so_dinh_danh, co ghi nhat ky)
const { z } = require('zod');
const { TRUONG, TRUONG_CHE_SO, cheSo, coQuyenXemBang } = require('../../../shared/truong-muc.js');
const { ngayDuongLich, tinhTuoi } = require('../../../shared/ngay-chuoi.js');
const { trangThaiNgay, trangThaiNhieuNguoi } = require('../trang-thai/trang-thai-ngay');
const { phanTich, guiLoiDuLieu } = require('../tai-khoan/tien-ich');

const BANG_CON = [...new Set(TRUONG.map((t) => t.bang))].filter((b) => b !== 'quan_nhan');
const COT_DANH_MUC = {};
for (const t of TRUONG) {
  if (t.danhMuc) {
    (COT_DANH_MUC[t.bang] = COT_DANH_MUC[t.bang] || []).push(t.cot[0]);
  }
}

const luocDoDanhSach = z.object({
  trang: z.coerce.number().int().min(1).max(100000).default(1),
  soDong: z.coerce.number().int().min(1).max(100).default(20),
});

// Che cac so dinh danh dang chu (can cuoc, BHXH, BHYT) trong mot dong da loc.
function cheSoTrongDong(bang, dong) {
  for (const cot of TRUONG_CHE_SO[bang] || []) {
    if (cot in dong) {
      dong[cot] = cheSo(dong[cot]);
    }
  }
  return dong;
}

// Gom ten cua cac muc danh muc duoc cac dong tham chieu: { id: ten }. Chi gom tu cac cot DA duoc phep tra ve.
function thuTenDanhMuc(db, dongTheoBang) {
  const ids = new Set();
  for (const [bang, dsDong] of Object.entries(dongTheoBang)) {
    for (const dong of dsDong) {
      for (const cot of COT_DANH_MUC[bang] || []) {
        if (dong[cot] !== null && dong[cot] !== undefined) {
          ids.add(dong[cot]);
        }
      }
    }
  }
  const ketQua = {};
  const dsId = [...ids];
  for (let i = 0; i < dsId.length; i += 100) {
    const nhom = dsId.slice(i, i + 100);
    const dong = db.prepare('SELECT id, ten FROM danh_muc WHERE id IN (' + nhom.map(() => '?').join(', ') + ')').all(...nhom);
    for (const d of dong) {
      ketQua[d.id] = d.ten;
    }
  }
  return ketQua;
}

function dangKyHoSo(router, boiCanh) {
  const { db, xacThuc, locTruong, ghiNhatKy } = boiCanh;
  const dangNhap = xacThuc.yeuCauDangNhap();
  const coBan = xacThuc.yeuCauMuc('thong_tin_co_ban');

  const nhatKy = (req, hanhDong, id, chiTiet) =>
    ghiNhatKy({
      taiKhoanId: req.nguoiDung.id,
      tenDangNhap: req.nguoiDung.tenDangNhap,
      hanhDong,
      doiTuong: 'quan_nhan',
      doiTuongId: id,
      chiTiet,
      may: xacThuc.layDiaChi(req),
    });

  const layId = (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      res.status(400).json({ loi: 'Mã hồ sơ không hợp lệ' });
      return null;
    }
    return id;
  };

  router.get('/', dangNhap, coBan, (req, res) => {
    const goi = phanTich(luocDoDanhSach, req.query);
    if (!goi.ok) {
      guiLoiDuLieu(res, goi.truong);
      return;
    }
    const { trang, soDong } = goi.du;
    const dsMuc = req.quyen.danhSachMuc();
    const tong = db.prepare('SELECT COUNT(*) AS n FROM quan_nhan WHERE da_xoa = 0').get().n;
    const hang = db
      .prepare('SELECT * FROM quan_nhan WHERE da_xoa = 0 ORDER BY ma_quan_nhan, id LIMIT ? OFFSET ?')
      .all(soDong, (trang - 1) * soDong);
    const dong = hang.map((h) => locTruong(h, dsMuc, 'quan_nhan'));
    // Danh sach chi hien cac cot thong tin co ban de nhe; cot khac xem trong ho so.
    const cotDanhSach = ['id', 'version', 'ma_quan_nhan', 'ho_ten_khai_sinh', 'gioi_tinh', 'don_vi_id', 'quan_ham_id', 'chuc_vu_id'];
    const gon = dong.map((d) => Object.fromEntries(cotDanhSach.filter((c) => c in d).map((c) => [c, d[c]])));
    const ketQua = {
      tong,
      trang,
      soDong,
      soTrang: Math.max(1, Math.ceil(tong / soDong)),
      dong: gon,
      tenDanhMuc: thuTenDanhMuc(db, { quan_nhan: gon }),
    };
    if (req.quyen.coMuc('trang_thai')) {
      ketQua.trangThaiHomNay = trangThaiNhieuNguoi(db, gon.map((d) => d.id));
      for (const t of Object.values(ketQua.trangThaiHomNay)) {
        ketQua.tenDanhMuc[t.trang_thai_id] = t.ten;
      }
    }
    res.json(ketQua);
  });

  router.get('/:id', dangNhap, coBan, (req, res) => {
    const id = layId(req, res);
    if (id === null) {
      return;
    }
    const hang = db.prepare('SELECT * FROM quan_nhan WHERE id = ? AND da_xoa = 0').get(id);
    if (!hang) {
      res.status(404).json({ loi: 'Không tìm thấy hồ sơ' });
      return;
    }
    const dsMuc = req.quyen.danhSachMuc();
    const homNay = ngayDuongLich();
    const ketQua = { id, quan_nhan: cheSoTrongDong('quan_nhan', locTruong(hang, dsMuc, 'quan_nhan')) };
    for (const bang of BANG_CON) {
      // Ten bang lay tu bang khai bao co dinh (BANG_CON), khong phai du lieu nguoi dung gui len.
      if (!coQuyenXemBang(dsMuc, bang)) {
        continue; // khong co quyen: khong gui ca khoa nay (khong lo ca viec co du lieu hay khong)
      }
      const dong = db.prepare('SELECT * FROM ' + bang + ' WHERE quan_nhan_id = ? ORDER BY id').all(id);
      ketQua[bang] = dong
        .map((d) => locTruong(d, dsMuc, bang))
        .filter((d) => d !== null)
        .map((d) => {
          cheSoTrongDong(bang, d);
          if (bang === 'than_nhan' && 'ngay_sinh_chuan' in d) {
            // Tuoi tu dong tinh tu ngay sinh (khong luu), theo ngay hom nay cua may chu.
            const t = tinhTuoi(d.ngay_sinh_chuan, homNay);
            d.tuoi = t ? t.tuoi : null;
            d.soThang = t ? t.soThang : null;
          }
          return d;
        });
    }
    ketQua.tenDanhMuc = thuTenDanhMuc(db, Object.fromEntries(['quan_nhan', ...BANG_CON].filter((b) => (b === 'quan_nhan' ? true : ketQua[b])).map((b) => [b, b === 'quan_nhan' ? [ketQua.quan_nhan] : ketQua[b]])));
    if (req.quyen.coMuc('trang_thai')) {
      ketQua.trangThaiHomNay = trangThaiNgay(db, id, homNay);
    }
    ketQua.mucDuocXem = dsMuc;
    nhatKy(req, 'xem_ho_so', id, { muc: dsMuc });
    res.json(ketQua);
  });

  // So dinh danh day du: tach rieng de MOI lan "hien so" deu co dau vet trong nhat ky.
  router.get('/:id/so-dinh-danh', dangNhap, xacThuc.yeuCauMuc('so_dinh_danh'), (req, res) => {
    const id = layId(req, res);
    if (id === null) {
      return;
    }
    const hang = db.prepare('SELECT * FROM quan_nhan WHERE id = ? AND da_xoa = 0').get(id);
    if (!hang) {
      res.status(404).json({ loi: 'Không tìm thấy hồ sơ' });
      return;
    }
    const chiMuc = ['so_dinh_danh'];
    const nguoi = locTruong(hang, chiMuc, 'quan_nhan');
    const thanNhan = db
      .prepare('SELECT * FROM than_nhan WHERE quan_nhan_id = ? ORDER BY id')
      .all(id)
      .map((d) => locTruong(d, chiMuc, 'than_nhan'));
    nhatKy(req, 'hien_so_dinh_danh', id, { soNguoiThan: thanNhan.length });
    res.json({ quan_nhan: nguoi, than_nhan: thanNhan });
  });
}

module.exports = { dangKyHoSo, BANG_CON };
