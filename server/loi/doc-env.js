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
  // Phien dang nhap het han sau bay nhieu phut khong hoat dong (Buoc 11 hoan thien them).
  const phutHetPhien = Number.parseInt(process.env.PHUT_HET_PHIEN || '30', 10);
  if (!Number.isInteger(phutHetPhien) || phutHetPhien < 1 || phutHetPhien > 1440) {
    throw new Error('PHUT_HET_PHIEN trong file .env phai la so tu 1 den 1440');
  }
  // Do "nang" cua bam mat khau bcrypt: cao hon thi an toan hon nhung cham hon.
  const bcryptCost = Number.parseInt(process.env.BCRYPT_COST || '12', 10);
  if (!Number.isInteger(bcryptCost) || bcryptCost < 4 || bcryptCost > 15) {
    throw new Error('BCRYPT_COST trong file .env phai la so tu 4 den 15');
  }
  return { cong, duongDanDb, batHttps, phutHetPhien, bcryptCost };
}

module.exports = { docEnv, layCauHinh };
