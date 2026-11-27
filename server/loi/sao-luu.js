'use strict';
// sao-luu.js: ban sao luu TAM THOI truoc cac thao tac nguy hiem (vd nhap Excel che do "thay the").
// Dung lenh VACUUM INTO cua SQLite: tao mot ban sao NHAT QUAN cua ca file du lieu, an toan khi dang chay.
// LUU Y: ban nay chi chep file, CHUA ma hoa va chua tu xoa ban cu. Buoc 12 se thay bang sao luu ma hoa, xoay vong, co lich.
const fs = require('fs');
const path = require('path');

function dauThoiGian(ngay = new Date()) {
  const h = (so) => String(so).padStart(2, '0');
  return ngay.getFullYear() + h(ngay.getMonth() + 1) + h(ngay.getDate()) + '-' + h(ngay.getHours()) + h(ngay.getMinutes()) + h(ngay.getSeconds());
}

// Tao ban sao luu; tra ve { duongDan, kichThuoc }. Nem loi neu khong tao duoc (khi do KHONG duoc tiep tuc thao tac nguy hiem).
function taoBanSaoLuu(db, { thuMuc, lyDo }) {
  const nhan = String(lyDo || 'tay').toLowerCase().replace(/[^a-z0-9-]+/g, '-').slice(0, 40);
  fs.mkdirSync(thuMuc, { recursive: true });
  let duongDan = path.join(thuMuc, 'hrm-' + nhan + '-' + dauThoiGian() + '.db');
  for (let i = 2; fs.existsSync(duongDan); i += 1) {
    duongDan = path.join(thuMuc, 'hrm-' + nhan + '-' + dauThoiGian() + '-' + i + '.db');
  }
  db.prepare('VACUUM INTO ?').run(duongDan);
  return { duongDan, kichThuoc: fs.statSync(duongDan).size };
}

module.exports = { taoBanSaoLuu };
