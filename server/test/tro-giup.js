'use strict';
// tro-giup.js: ham dung chung cho cac bai kiem thu can may chu that (dung o cong ngau nhien).
const fs = require('fs');
const os = require('os');
const path = require('path');
const { moCsdl, chayMigrations, nguonMigration } = require('../loi/csdl');
const { napMoDun } = require('../loi/nap-mo-dun');
const { taoUngDung } = require('../loi/ung-dung');
const { taoTaiKhoan } = require('../modules/tai-khoan/dich-vu');
const { taoDuLieuGia } = require('../scripts/tao-du-lieu-gia');

const THU_MUC_MODULES = path.join(__dirname, '..', 'modules');
const MAT_KHAU = { qtri: 'AdminThu12345', daydu: 'ThuXemA12345678', motso: 'ThuXemB12345678' };
const CAC_TAI_KHOAN = [
  ['qtri', 'Quản trị thử', 'admin'],
  ['daydu', 'Xem đầy đủ thử', 'xem_day_du'],
  ['motso', 'Xem một số mục thử', 'xem_mot_so_muc'],
];

// Dia chi IPv4 khong phai loopback cua may nay (de thu truong hop "ket noi tu may khac"); null neu khong co.
function diaChiMangNgoai() {
  for (const danhSach of Object.values(os.networkInterfaces())) {
    for (const dia of danhSach || []) {
      if (dia.family === 'IPv4' && !dia.internal) {
        return dia.address;
      }
    }
  }
  return null;
}

// Tao mo-dun thu tren o dia tam tu doan ma; tra ve danh sach mo-dun da nap.
function taoMoDunTam(ten, maNguon) {
  const goc = fs.mkdtempSync(path.join(os.tmpdir(), 'hrm-modthu-'));
  fs.mkdirSync(path.join(goc, ten));
  fs.writeFileSync(path.join(goc, ten, 'module.js'), maNguon, 'utf8');
  return napMoDun(goc).dsMoDun;
}

async function dungMayThu({ dsMoDunThem = [], duLieuGia = true, cauHinhThem = {} } = {}) {
  const db = moCsdl(':memory:');
  const { dsMoDun } = napMoDun(THU_MUC_MODULES);
  const tatCa = dsMoDun.concat(dsMoDunThem);
  chayMigrations(db, nguonMigration(tatCa));
  if (duLieuGia) {
    taoDuLieuGia(db, { homNay: new Date(2026, 10, 11) });
  }
  const cauHinh = { cong: 0, duongDanDb: ':memory:', batHttps: false, phutHetPhien: 30, bcryptCost: 4, ...cauHinhThem };
  const ungDung = taoUngDung({ db, cauHinh, dsMoDun: tatCa });
  const id = {};
  for (const [ten, hoTen, loai] of CAC_TAI_KHOAN) {
    id[ten] = await taoTaiKhoan(db, ungDung.soDangKy, { tenDangNhap: ten, hoTen, loai, matKhau: MAT_KHAU[ten], phaiDoiMatKhau: false }, 4);
  }
  const maychu = ungDung.app.listen(0, '0.0.0.0');
  await new Promise((xong) => maychu.once('listening', xong));
  const cong = maychu.address().port;
  return {
    db,
    id,
    cong,
    soDangKy: ungDung.soDangKy,
    goc: 'http://127.0.0.1:' + cong,
    dong: () =>
      new Promise((xong) => {
        maychu.closeAllConnections();
        maychu.close(() => {
          db.close();
          xong();
        });
      }),
  };
}

// May khach co "tui cookie" va nho ma CSRF, giong trinh duyet.
class Khach {
  constructor(goc) {
    this.goc = goc;
    this.cookie = null;
    this.csrf = null;
  }

  async goi(phuongThuc, duongDan, body, tuyChon = {}) {
    const tieuDe = {};
    if (this.cookie) {
      tieuDe.cookie = this.cookie;
    }
    if (body !== undefined) {
      tieuDe['content-type'] = 'application/json';
    }
    if (phuongThuc !== 'GET' && this.csrf && !tuyChon.khongCsrf) {
      tieuDe['x-csrf-token'] = tuyChon.csrfSai || this.csrf;
    }
    const phanHoi = await fetch((tuyChon.goc || this.goc) + duongDan, {
      method: phuongThuc,
      headers: tieuDe,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const cacCookie = phanHoi.headers.getSetCookie();
    for (const c of cacCookie) {
      if (c.startsWith('hrm_phien=')) {
        const giaTri = c.slice('hrm_phien='.length).split(';')[0];
        this.cookie = giaTri ? 'hrm_phien=' + giaTri : null;
      }
    }
    let du = null;
    try {
      du = await phanHoi.json();
    } catch {
      du = null;
    }
    return { ma: phanHoi.status, du, cacCookie };
  }

  async dangNhap(ten, matKhau, them = {}, tuyChon = {}) {
    const kq = await this.goi('POST', '/api/tai-khoan/dang-nhap', { tenDangNhap: ten, matKhau, ...them }, tuyChon);
    if (kq.ma === 200) {
      this.csrf = kq.du.csrfToken;
    }
    return kq;
  }
}

module.exports = { dungMayThu, Khach, taoMoDunTam, diaChiMangNgoai, MAT_KHAU };
