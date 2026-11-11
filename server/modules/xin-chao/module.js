'use strict';
// Mo-dun mau "xin-chao": co 1 duong dan API va 1 muc menu.
// Moi mo-dun tu khai bao: ten, migrations, dangKyRoute, muc, boLoc, baoCao, menu.
module.exports = {
  // Phai TRUNG ten thu muc chua file nay.
  ten: 'xin-chao',

  // Duong dan toi thu muc chua file SQL migration (Buoc 3 se dung). Chua co thi de null.
  migrations: null,

  // Nhan mot Router da gan san o /api/xin-chao, nen ben duoi chi can ghi phan duoi cua duong dan.
  dangKyRoute(router) {
    router.get('/', (req, res) => {
      res.json({
        loiChao: 'Xin chào từ mô-đun xin-chao',
        thoiDiem: new Date().toISOString(),
      });
    });
  },

  // Cac khai bao phan quyen (Buoc 4 se dung). Mo-dun mau chua co.
  muc: [],
  boLoc: [],
  baoCao: [],

  // Menu: nhan hien thi, duong dan tren giao dien, thu tu.
  menu: [{ id: 'xin-chao', nhan: 'Xin chào', duongDan: '/xin-chao', thuTu: 100 }],
};
