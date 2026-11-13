'use strict';
// ho-so.js: xem mot ho so quan nhan. Moi cot tra ve deu qua locTruong: chi cac muc tai khoan duoc cap.
// (Buoc 5 se them danh sach, them, sua, xoa va trang thai hang ngay.)
const { TRUONG, coQuyenXemBang } = require('../../../shared/truong-muc.js');

const BANG_CON = [...new Set(TRUONG.map((t) => t.bang))].filter((b) => b !== 'quan_nhan');

function dangKyHoSo(router, boiCanh) {
  const { db, xacThuc, locTruong, ghiNhatKy } = boiCanh;

  router.get('/:id', xacThuc.yeuCauDangNhap(), xacThuc.yeuCauMuc('thong_tin_co_ban'), (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      res.status(400).json({ loi: 'Mã hồ sơ không hợp lệ' });
      return;
    }
    const hang = db.prepare('SELECT * FROM quan_nhan WHERE id = ? AND da_xoa = 0').get(id);
    if (!hang) {
      res.status(404).json({ loi: 'Không tìm thấy hồ sơ' });
      return;
    }
    const dsMuc = req.quyen.danhSachMuc();
    const ketQua = { id, quan_nhan: locTruong(hang, dsMuc, 'quan_nhan') };
    for (const bang of BANG_CON) {
      // Ten bang lay tu bang khai bao co dinh (BANG_CON), khong phai du lieu nguoi dung gui len.
      if (!coQuyenXemBang(dsMuc, bang)) {
        continue; // khong co quyen: khong gui ca khoa nay (khong lo ca viec co du lieu hay khong)
      }
      const dong = db.prepare('SELECT * FROM ' + bang + ' WHERE quan_nhan_id = ? ORDER BY id').all(id);
      ketQua[bang] = dong.map((d) => locTruong(d, dsMuc, bang)).filter((d) => d !== null);
    }
    ketQua.mucDuocXem = dsMuc;
    ghiNhatKy({
      taiKhoanId: req.nguoiDung.id,
      tenDangNhap: req.nguoiDung.tenDangNhap,
      hanhDong: 'xem_ho_so',
      doiTuong: 'quan_nhan',
      doiTuongId: id,
      chiTiet: { muc: dsMuc },
      may: xacThuc.layDiaChi(req),
    });
    res.json(ketQua);
  });
}

module.exports = { dangKyHoSo };
