'use strict';
// doc-env.js: doc file .env (cac dong KHOA=GIA_TRI) va tra ve cau hinh.
// Day la "to giay ghi cai dat": cong may chu, duong dan file du lieu, bat/tat HTTPS.
const fs = require('fs');
const path = require('path');

// Doc file .env. Dong trong hoac bat dau bang # la ghi chu.
// Gia tri nao da co san trong moi truong (process.env) thi giu nguyen, khong ghi de.
function docEnv(duongDanFile) {
  const ketQua = {};
  if (!fs.existsSync(duongDanFile)) {
    return ketQua;
  }
  let noiDung = fs.readFileSync(duongDanFile, 'utf8');
  if (noiDung.charCodeAt(0) === 0xfeff) {
    noiDung = noiDung.slice(1); // bo ky tu BOM neu file luu kieu UTF-8 co BOM
  }
  for (const dongTho of noiDung.split(/\r?\n/)) {
    const dong = dongTho.trim();
    if (dong === '' || dong.startsWith('#')) {
      continue;
    }
    const viTri = dong.indexOf('=');
    if (viTri < 1) {
      continue;
    }
    const khoa = dong.slice(0, viTri).trim();
    let giaTri = dong.slice(viTri + 1).trim();
    const coNgoacKep = giaTri.length >= 2 && giaTri.startsWith('"') && giaTri.endsWith('"');
    const coNgoacDon = giaTri.length >= 2 && giaTri.startsWith("'") && giaTri.endsWith("'");
    if (coNgoacKep || coNgoacDon) {
      giaTri = giaTri.slice(1, -1);
    }
    ketQua[khoa] = giaTri;
    if (process.env[khoa] === undefined) {
      process.env[khoa] = giaTri;
    }
  }
  return ketQua;
}

// Doi cac gia tri chu thanh cau hinh co kieu dung, kiem tra hop le.
function layCauHinh(thuMucGoc) {
  const cong = Number.parseInt(process.env.CONG || '3000', 10);
  if (!Number.isInteger(cong) || cong < 1 || cong > 65535) {
    throw new Error('CONG trong file .env phai la so tu 1 den 65535');
  }
  const duongDanDb = process.env.DUONG_DAN_DB
    ? path.resolve(thuMucGoc, process.env.DUONG_DAN_DB)
    : path.join(thuMucGoc, 'du-lieu', 'hrm.db');
  const batHttps = String(process.env.BAT_HTTPS || 'false').toLowerCase() === 'true';
  return { cong, duongDanDb, batHttps };
}

module.exports = { docEnv, layCauHinh };
