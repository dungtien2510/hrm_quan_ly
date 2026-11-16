'use strict';
// Mo-dun "trang-thai": trang thai hang ngay cua quan nhan theo khoang thoi gian
// (co mat, nghi phep, cong tac, benh vien, benh xa, khac...). Bang du lieu nam o migration cua mo-dun quan-nhan;
// loai trang thai la danh muc sua duoc (bang danh_muc, loai "trang_thai").
// Cac mo-dun khac can trang thai theo ngay thi dung truc tiep file ./trang-thai-ngay.js.
const { dangKyTrangThai } = require('./routes');

module.exports = {
  ten: 'trang-thai',
  migrations: null,
  dangKyRoute: dangKyTrangThai,
  muc: [],
  boLoc: [],
  baoCao: [],
  xuat: [],
  menu: [],
};
