'use strict';
// Mo-dun "danh-muc": quan ly cac danh muc sua duoc (don vi dang cay, quan ham, chuc vu, trang thai,
// loai phep, hinh thuc khen thuong...). Bang danh_muc nam o phan loi.
const { dangKyDanhMuc } = require('./routes');

module.exports = {
  ten: 'danh-muc',
  migrations: null,
  dangKyRoute: dangKyDanhMuc,
  muc: [],
  boLoc: [],
  baoCao: [],
  xuat: [],
  menu: [],
};
