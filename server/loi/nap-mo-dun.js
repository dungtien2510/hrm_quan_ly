'use strict';
// nap-mo-dun.js: tu doc moi thu muc trong server/modules, nap file module.js cua tung mo-dun.
// Loi KHONG biet truoc ten mo-dun nao. Mo-dun loi thi ghi log ro ten, bo qua, may chu van chay.
// Meo: doi ten thu muc thanh "_ten" (them dau gach duoi) de TAM TAT mot mo-dun.
const fs = require('fs');
const path = require('path');
const express = require('express');

const CAC_MANG = ['muc', 'boLoc', 'baoCao', 'menu'];

function kiemTraMoDun(mod, tenThuMuc) {
  if (!mod || typeof mod !== 'object') {
    throw new Error('module.js phai xuat ra mot doi tuong (module.exports = { ... })');
  }
  if (mod.ten !== tenThuMuc) {
    throw new Error('"ten" (' + mod.ten + ') phai trung ten thu muc (' + tenThuMuc + ')');
  }
  if (typeof mod.dangKyRoute !== 'function') {
    throw new Error('thieu ham dangKyRoute(app)');
  }
  for (const khoa of CAC_MANG) {
    if (mod[khoa] !== undefined && !Array.isArray(mod[khoa])) {
      throw new Error('"' + khoa + '" phai la mot mang');
    }
  }
}

// Doc cac mo-dun. Tra ve { dsMoDun, dsLoi }.
function napMoDun(thuMucModules) {
  const goc = path.resolve(thuMucModules);
  const dsMoDun = [];
  const dsLoi = [];

  if (!fs.existsSync(goc)) {
    const thongBao = 'Khong tim thay thu muc mo-dun: ' + goc;
    console.error('[LOI] ' + thongBao);
    dsLoi.push({ moDun: '(loi)', thongBao });
    return { dsMoDun, dsLoi };
  }

  const cacMuc = fs.readdirSync(goc, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
  for (const muc of cacMuc) {
    if (!muc.isDirectory()) {
      continue;
    }
    if (muc.name.startsWith('_') || muc.name.startsWith('.')) {
      console.log('[MO-DUN] Bo qua "' + muc.name + '" (da tat bang dau _ hoac .)');
      continue;
    }
    const duongDanModule = path.join(goc, muc.name, 'module.js');
    try {
      if (!fs.existsSync(duongDanModule)) {
        throw new Error('khong co file module.js');
      }
      const mod = require(duongDanModule);
      kiemTraMoDun(mod, muc.name);
      dsMoDun.push({
        ten: mod.ten,
        thuMuc: path.join(goc, muc.name),
        migrations: mod.migrations || null,
        dangKyRoute: mod.dangKyRoute,
        muc: mod.muc || [],
        boLoc: mod.boLoc || [],
        baoCao: mod.baoCao || [],
        menu: mod.menu || [],
      });
    } catch (loi) {
      console.error('[LOI] Mo-dun "' + muc.name + '" bi loi, bo qua: ' + loi.message);
      dsLoi.push({ moDun: muc.name, thongBao: loi.message });
    }
  }
  return { dsMoDun, dsLoi };
}

// Gan duong dan API cua tung mo-dun. Moi mo-dun nhan mot Router rieng gan o /api/<ten>,
// nen mo-dun khong the dang ky duong dan ngoai pham vi cua no.
function dangKyRouteTatCa(app, dsMoDun) {
  const daDangKy = [];
  const dsLoi = [];
  for (const mod of dsMoDun) {
    try {
      const router = express.Router();
      mod.dangKyRoute(router);
      app.use('/api/' + mod.ten, router);
      daDangKy.push(mod.ten);
    } catch (loi) {
      console.error('[LOI] Mo-dun "' + mod.ten + '" loi khi dang ky route, bo qua: ' + loi.message);
      dsLoi.push({ moDun: mod.ten, thongBao: loi.message });
    }
  }
  return { daDangKy, dsLoi };
}

// Gom danh sach (muc quyen, bo loc, bao cao, menu) tu moi mo-dun, gan them ten mo-dun.
function gom(dsMoDun, khoa) {
  return dsMoDun.flatMap((mod) => mod[khoa].map((phanTu) => Object.assign({}, phanTu, { moDun: mod.ten })));
}

module.exports = { napMoDun, dangKyRouteTatCa, gom };
