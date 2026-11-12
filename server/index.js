'use strict';
// server/index.js: may chu Express. Vua tra du lieu (API) vua phat giao dien web da build.
const fs = require('fs');
const os = require('os');
const path = require('path');
const express = require('express');
const { docEnv, layCauHinh } = require('./loi/doc-env');
const { napMoDun, dangKyRouteTatCa } = require('./loi/nap-mo-dun');
const { moCsdl, chayMigrations, nguonMigration } = require('./loi/csdl');

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

// 3) Dung ung dung Express
const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

app.get('/api/suc-khoe', (req, res) => {
  res.json({ trangThai: 'ok', phienBan, soMoDun: dsMoDun.length });
});

const { daDangKy } = dangKyRouteTatCa(app, dsMoDun, { db });

// Duong dan /api khong co thi tra JSON 404 (khong tra trang web)
app.use('/api', (req, res) => {
  res.status(404).json({ loi: 'Không tìm thấy đường dẫn API' });
});

// 4) Phat giao dien web da build (web/dist)
const thuMucWeb = path.join(THU_MUC_GOC, 'web', 'dist');
const coGiaoDien = fs.existsSync(path.join(thuMucWeb, 'index.html'));
if (coGiaoDien) {
  app.use(express.static(thuMucWeb));
  // Moi duong dan khong phai /api thi tra index.html de React Router tu xu ly
  app.use((req, res) => {
    if (req.method !== 'GET') {
      res.status(404).end();
      return;
    }
    res.sendFile(path.join(thuMucWeb, 'index.html'));
  });
} else {
  app.use((req, res) => {
    res
      .status(503)
      .type('text/plain; charset=utf-8')
      .send('Chưa có giao diện. Hãy chạy "npm run build" rồi khởi động lại máy chủ.');
  });
}

// 5) Bat loi chung: khong lo thong tin ben trong cho nguoi dung
app.use((loi, req, res, next) => {
  console.error('[LOI] ' + req.method + ' ' + req.originalUrl + ': ' + loi.message);
  if (res.headersSent) {
    next(loi);
    return;
  }
  res.status(500).json({ loi: 'Lỗi máy chủ' });
});

// 6) Khoi dong
if (cauHinh.batHttps) {
  console.warn('[CANH BAO] BAT_HTTPS=true nhung HTTPS chua duoc ho tro (se lam o Buoc 11). Dang chay HTTP.');
}

const maychu = app.listen(cauHinh.cong, '0.0.0.0', () => {
  console.log('May chu da chay (phien ban ' + phienBan + ').');
  console.log('  Tren may nay : http://localhost:' + cauHinh.cong);
  for (const danhSach of Object.values(os.networkInterfaces())) {
    for (const dia of danhSach || []) {
      if (dia.family === 'IPv4' && !dia.internal) {
        console.log('  Tu may khac  : http://' + dia.address + ':' + cauHinh.cong);
      }
    }
  }
  console.log('  Mo-dun da nap: ' + (daDangKy.join(', ') || '(khong co)'));
  if (loiNap.length > 0) {
    console.log('  Mo-dun bi loi: ' + loiNap.map((l) => l.moDun).join(', '));
  }
  if (!coGiaoDien) {
    console.log('  Chua co giao dien: chay "npm run build" roi khoi dong lai.');
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
