'use strict';
// Mo-dun mau "xin-chao": co 1 duong dan API va 1 muc menu.
// Moi mo-dun tu khai bao: ten, migrations, dangKyRoute, muc, boLoc, baoCao, xuat, menu.
module.exports = {
  // Phai TRUNG ten thu muc chua file nay.
  ten: 'xin-chao',

  // Duong dan toi thu muc chua file SQL migration (Buoc 3 se dung). Chua co thi de null.
  migrations: null,

  // Nhan mot Router da gan san o /api/xin-chao, va "boiCanh" (db, xacThuc, locTruong, ghiNhatKy...).
  // Tu Buoc 4, moi API (tru dang nhap va suc khoe) deu phai yeu cau dang nhap.
  dangKyRoute(router, boiCanh) {
    router.get('/', boiCanh.xacThuc.yeuCauDangNhap(), (req, res) => {
      res.json({
        loiChao: 'Xin chào ' + req.nguoiDung.hoTen + ', từ mô-đun xin-chao',
        thoiDiem: new Date().toISOString(),
      });
    });
  },

  // Cac khai bao phan quyen (muc, bo loc, bao cao, xuat). Mo-dun mau chua co.
  muc: [],
  boLoc: [],
  baoCao: [],
  xuat: [],

  // Menu: nhan hien thi, duong dan tren giao dien, thu tu.
  menu: [{ id: 'xin-chao', nhan: 'Xin chào', duongDan: '/xin-chao', thuTu: 100 }],
};
