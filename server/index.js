'use strict';
// server/index.js: may chu Express. Vua tra du lieu (API) vua phat giao dien web da build.
const os = require('os');
const path = require('path');
const { docEnv, layCauHinh } = require('./loi/doc-env');
const { napMoDun } = require('./loi/nap-mo-dun');
const { moCsdl, chayMigrations, nguonMigration } = require('./loi/csdl');
const { taoUngDung } = require('./loi/ung-dung');

const THU_MUC_GOC = path.resolve(__dirname, '..');
docEnv(path.join(THU_MUC_GOC, '.env'));
const cauHinh = layCauHinh(THU_MUC_GOC);
const phienBan = require(path.join(THU_MUC_GOC, 'package.json')).version;

// 1) Nap mo-dun
const { dsMoDun, dsLoi: loiNap } = napMoDun(path.join(__dirname, 'modules'));

// 2) Mo co so du lieu va chay migration (loi truoc, roi tung mo-dun). Loi o day thi dung han, khong chay tiep.
let db;
try {
  db = moCsdl(cauHinh.duongDanDb);
  const ketQuaMigration = chayMigrations(db, nguonMigration(dsMoDun));
  if (ketQuaMigration.daChay.length > 0) {
    console.log('[CSDL] Da chay ' + ketQuaMigration.daChay.length + ' migration moi.');
  }
} catch (loi) {
  console.error('[LOI] Khong mo duoc co so du lieu hoac migration loi: ' + loi.message);
  process.exit(1);
}

// 3) Dung ung dung (so dang ky quyen, dang nhap, route cua mo-dun, giao dien web)
let ungDung;
try {
  ungDung = taoUngDung({ db, cauHinh, dsMoDun, phienBan, thuMucWeb: path.join(THU_MUC_GOC, 'web', 'dist') });
} catch (loi) {
  console.error('[LOI] Khong dung duoc ung dung: ' + loi.message);
  process.exit(1);
}

if (cauHinh.batHttps) {
  console.warn('[CANH BAO] BAT_HTTPS=true nhung HTTPS chua duoc ho tro (se lam o Buoc 11). Dang chay HTTP.');
}
const soAdmin = db.prepare("SELECT COUNT(*) AS n FROM nguoi_dung WHERE loai = 'admin'").get().n;

// 4) Khoi dong
const maychu = ungDung.app.listen(cauHinh.cong, '0.0.0.0', () => {
  console.log('May chu da chay (phien ban ' + phienBan + ').');
  console.log('  Tren may nay : http://localhost:' + cauHinh.cong + '   (admin CHI dang nhap duoc qua dia chi nay)');
  for (const danhSach of Object.values(os.networkInterfaces())) {
    for (const dia of danhSach || []) {
      if (dia.family === 'IPv4' && !dia.internal) {
        console.log('  Tu may khac  : http://' + dia.address + ':' + cauHinh.cong);
      }
    }
  }
  console.log('  Mo-dun da nap: ' + (ungDung.daDangKy.join(', ') || '(khong co)'));
  if (loiNap.length > 0) {
    console.log('  Mo-dun bi loi: ' + loiNap.map((l) => l.moDun).join(', '));
  }
  if (!ungDung.coGiaoDien) {
    console.log('  Chua co giao dien: chay "npm run build" roi khoi dong lai.');
  }
  if (soAdmin === 0) {
    console.log('  CHUA CO TAI KHOAN ADMIN. Hay chay: node server/scripts/tao-admin.js');
  }
});

maychu.on('error', (loi) => {
  if (loi.code === 'EADDRINUSE') {
    console.error('[LOI] Cong ' + cauHinh.cong + ' dang duoc chuong trinh khac dung. Doi CONG trong file .env hoac tat chuong trinh do.');
  } else {
    console.error('[LOI] Khong khoi dong duoc may chu: ' + loi.message);
  }
  process.exit(1);
});

// Dong may chu va file du lieu gon gang khi bam Ctrl+C
function dung() {
  maychu.close(() => {
    db.close();
    process.exit(0);
  });
}
process.on('SIGINT', dung);
process.on('SIGTERM', dung);
