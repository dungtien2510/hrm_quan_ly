'use strict';
// cau-hinh-sheet.js: 9 sheet nhap lieu va bang SQL tuong ung (dung chung cho mau, kiem tra va ap dung).
const { truongCuaBang } = require('../../../shared/bieu-mau.js');

// ten sheet Excel -> bang SQL. Sheet "quan_nhan" la sheet chinh (moi nguoi mot dong), cac sheet con gan bang ma_quan_nhan.
const CAC_SHEET = [
  { ten: 'quan_nhan', bang: 'quan_nhan', chinh: true },
  { ten: 'qua_trinh_truoc_tuyen_dung', bang: 'qua_trinh_truoc_tuyen_dung' },
  { ten: 'qua_trinh_cong_tac', bang: 'qua_trinh_cong_tac' },
  { ten: 'dao_tao', bang: 'dao_tao' },
  { ten: 'khen_thuong', bang: 'khen_thuong' },
  { ten: 'ky_luat_tien_an_tien_su', bang: 'ky_luat_tien_an_tien_su' },
  { ten: 'luong', bang: 'luong' },
  { ten: 'than_nhan', bang: 'than_nhan' },
  { ten: 'trang_thai', bang: 'trang_thai_quan_nhan' },
];

const COT_MA = 'ma_quan_nhan'; // cot gan sheet con voi sheet quan_nhan

// Cac ten cot cua mot sheet theo thu tu: sheet con co them "ma_quan_nhan" o dau.
function cotCuaSheet(sheet) {
  const truong = truongCuaBang(sheet.bang);
  return sheet.chinh ? truong : [{ truong: COT_MA, hienThi: 'Mã quân nhân', kieu: 'chu', batBuoc: true, bang: sheet.bang, cot: [] }, ...truong];
}

module.exports = { CAC_SHEET, COT_MA, cotCuaSheet };
