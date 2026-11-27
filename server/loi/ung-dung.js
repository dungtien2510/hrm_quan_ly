'use strict';
// ung-dung.js: lap rap ung dung Express (chua listen) de index.js va cac bai kiem thu dung chung.
const fs = require('fs');
const os = require('os');
const path = require('path');
const express = require('express');
const { dangKyRouteTatCa } = require('./nap-mo-dun');
const { taoSoDangKy, dongBoQuyenMacDinh, locTruong } = require('./quyen');
const { taoXacThuc } = require('./xac-thuc');
const { ghiNhatKy } = require('./nhat-ky');
const { taoBanSaoLuu } = require('./sao-luu');

// tuyChon: { db, cauHinh, dsMoDun, phienBan, thuMucWeb (tuy chon) }
function taoUngDung(tuyChon) {
  const { db, cauHinh, dsMoDun, phienBan = '0.0.0', thuMucWeb = null } = tuyChon;

  // So dang ky quyen tu cac mo-dun; khai bao sai thi dung ngay voi thong bao ro.
  const soDangKy = taoSoDangKy(dsMoDun);
  const soDongMoi = dongBoQuyenMacDinh(db, soDangKy);
  if (soDongMoi > 0) {
    ghiNhatKy(db, { hanhDong: 'dong_bo_quyen_mac_dinh', chiTiet: { soDong: soDongMoi } });
  }
  const xacThuc = taoXacThuc({ db, soDangKy, cauHinh });

  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));
  app.use(xacThuc.nap);
  app.use('/api', xacThuc.kiemTraCsrf);

  // Cong cu loi chia se cho moi mo-dun (quy tac: mo-dun khong sua loi, chi dung cac thu nay).
  const boiCanh = {
    db,
    cauHinh,
    soDangKy,
    xacThuc,
    locTruong,
    ghiNhatKy: (thamSo) => ghiNhatKy(db, thamSo),
    // Ban sao luu tam thoi (Buoc 12 se thay bang sao luu ma hoa). Dat o canh file du lieu.
    saoLuu: (lyDo) =>
      taoBanSaoLuu(db, {
        thuMuc: cauHinh.thuMucSaoLuuTam || path.join(cauHinh.duongDanDb === ':memory:' ? os.tmpdir() : path.dirname(cauHinh.duongDanDb), 'sao-luu-tam'),
        lyDo,
      }),
  };

  // Duong dan cong khai duy nhat ngoai dang nhap: kiem tra suc khoe (khong lo thong tin nhay cam).
  app.get('/api/suc-khoe', (req, res) => {
    res.json({ trangThai: 'ok', phienBan, soMoDun: dsMoDun.length });
  });

  const ketQuaRoute = dangKyRouteTatCa(app, dsMoDun, boiCanh);

  app.use('/api', (req, res) => {
    res.status(404).json({ loi: 'Không tìm thấy đường dẫn API' });
  });

  const coGiaoDien = Boolean(thuMucWeb) && fs.existsSync(path.join(thuMucWeb, 'index.html'));
  if (coGiaoDien) {
    app.use(express.static(thuMucWeb));
    app.use((req, res) => {
      if (req.method !== 'GET') {
        res.status(404).end();
        return;
      }
      res.sendFile(path.join(thuMucWeb, 'index.html'));
    });
  } else if (thuMucWeb) {
    app.use((req, res) => {
      res.status(503).type('text/plain; charset=utf-8').send('Chưa có giao diện. Hãy chạy "npm run build" rồi khởi động lại máy chủ.');
    });
  }

  app.use((loi, req, res, next) => {
    if (res.headersSent) {
      next(loi);
      return;
    }
    // Loi do nguoi dung gui (file qua lon 413, JSON hong 400...) tra dung ma, khong bao la loi may chu.
    const ma = loi.status || loi.statusCode;
    if (Number.isInteger(ma) && ma >= 400 && ma < 500) {
      res.status(ma).json({ loi: ma === 413 ? 'Dữ liệu gửi lên quá lớn' : 'Yêu cầu không hợp lệ' });
      return;
    }
    console.error('[LOI] ' + req.method + ' ' + req.originalUrl + ': ' + loi.message);
    res.status(500).json({ loi: 'Lỗi máy chủ' });
  });

  return { app, soDangKy, xacThuc, daDangKy: ketQuaRoute.daDangKy, coGiaoDien };
}

module.exports = { taoUngDung };
