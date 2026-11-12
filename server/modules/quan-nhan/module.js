'use strict';
// Mo-dun "quan-nhan": ho so quan nhan. O Buoc 3 chi co cau truc du lieu (migration).
// Cac route API, trang giao dien, muc quyen, bo loc se duoc them o Buoc 4, 5, 7.
const path = require('path');

module.exports = {
  ten: 'quan-nhan',
  migrations: path.join(__dirname, 'migrations'),
  dangKyRoute() {},
  muc: [],
  boLoc: [],
  baoCao: [],
  menu: [],
};
