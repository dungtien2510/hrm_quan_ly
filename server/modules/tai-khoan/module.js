'use strict';
// Mo-dun "tai-khoan": dang nhap, dang xuat, doi mat khau, quan ly tai khoan va phan quyen.
const path = require('path');
const { dangKyDangNhap } = require('./dang-nhap');
const { dangKyQuanLy } = require('./quan-ly');

module.exports = {
  ten: 'tai-khoan',
  migrations: path.join(__dirname, 'migrations'),
  dangKyRoute(router, boiCanh) {
    dangKyDangNhap(router, boiCanh);
    dangKyQuanLy(router, boiCanh);
  },
  muc: [],
  boLoc: [],
  baoCao: [],
  xuat: [],
  menu: [],
};
