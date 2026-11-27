'use strict';
// Mo-dun "nhap-excel": nhap ho so quan nhan tu file Excel nhieu sheet (chi admin):
// tai file mau -> kiem tra file (chua ghi gi) -> ap dung trong mot giao dich.
const { dangKyNhapExcel } = require('./routes');

module.exports = {
  ten: 'nhap-excel',
  migrations: null,
  dangKyRoute: dangKyNhapExcel,
  muc: [],
  boLoc: [],
  baoCao: [],
  xuat: [],
  menu: [],
};
