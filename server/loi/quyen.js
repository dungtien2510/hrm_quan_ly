'use strict';
// quyen.js: so dang ky quyen (cac muc, bo loc, bao cao, dinh dang xuat do tung mo-dun khai bao),
// quyen mac dinh cho 3 loai tai khoan mau, va ham tai quyen that cua mot tai khoan.
// Quyen that nam trong bang quyen_tai_khoan (admin bat/tat). Khong co dong quyen = KHONG duoc phep.
const { gom } = require('./nap-mo-dun');
const { MUC, locTruong } = require('../../shared/truong-muc.js');

// Muc duoc cap san cho loai "xem_mot_so_muc" (quy dinh o Prompt nen).
const MUC_MAC_DINH_HAN_CHE = ['thong_tin_co_ban'];
const LOAI_QUYEN = ['muc', 'loc', 'bao_cao', 'xuat'];

function kiemTraDuyNhat(ds, khoaId, ten) {
  const daThay = new Set();
  for (const phanTu of ds) {
    if (!phanTu[khoaId] || typeof phanTu[khoaId] !== 'string') {
      throw new Error('Khai bao ' + ten + ' cua mo-dun "' + phanTu.moDun + '" thieu "' + khoaId + '"');
    }
    if (daThay.has(phanTu[khoaId])) {
      throw new Error('Khai bao ' + ten + ' bi trung "' + phanTu[khoaId] + '" (mo-dun "' + phanTu.moDun + '")');
    }
    daThay.add(phanTu[khoaId]);
  }
}

// Gom khai bao tu cac mo-dun thanh MOT so dang ky va kiem tra tham chieu cheo. Sai thi nem loi ro rang.
function taoSoDangKy(dsMoDun) {
  const muc = gom(dsMoDun, 'muc');
  const boLoc = gom(dsMoDun, 'boLoc');
  const baoCao = gom(dsMoDun, 'baoCao');
  const xuat = gom(dsMoDun, 'xuat');
  kiemTraDuyNhat(muc, 'ma', 'muc quyen');
  kiemTraDuyNhat(boLoc, 'id', 'bo loc');
  kiemTraDuyNhat(baoCao, 'id', 'bao cao');
  kiemTraDuyNhat(xuat, 'id', 'dinh dang xuat');
  const maMuc = new Set(muc.map((m) => m.ma));
  for (const b of boLoc) {
    if (!maMuc.has(b.muc)) {
      throw new Error('Bo loc "' + b.id + '" (mo-dun "' + b.moDun + '") tro toi muc khong ton tai: ' + b.muc);
    }
  }
  for (const b of baoCao) {
    for (const m of b.mucCanCo || []) {
      if (!maMuc.has(m)) {
        throw new Error('Bao cao "' + b.id + '" (mo-dun "' + b.moDun + '") can muc khong ton tai: ' + m);
      }
    }
  }
  const mucNhayCam = new Set(muc.filter((m) => m.nhayCam).map((m) => m.ma));
  return { muc, boLoc, baoCao, xuat, mucNhayCam };
}

// Danh sach dong quyen mac dinh cua mot loai tai khoan: [{ loai, khoa, choPhep }]
function quyenMacDinh(loaiTaiKhoan, soDangKy) {
  const dong = [];
  const them = (loai, khoa, choPhep) => dong.push({ loai, khoa, choPhep: choPhep ? 1 : 0 });
  const coHet = loaiTaiKhoan === 'admin' || loaiTaiKhoan === 'xem_day_du';
  const mucDuocCap = new Set(coHet ? soDangKy.muc.map((m) => m.ma) : MUC_MAC_DINH_HAN_CHE);
  for (const m of soDangKy.muc) {
    them('muc', m.ma, mucDuocCap.has(m.ma));
  }
  // Bo loc mac dinh di theo muc chua truong do.
  for (const b of soDangKy.boLoc) {
    them('loc', b.id, mucDuocCap.has(b.muc));
  }
  // Bao cao va dinh dang xuat: chi 2 loai co quyen day du duoc cap san.
  for (const b of soDangKy.baoCao) {
    them('bao_cao', b.id, coHet);
  }
  for (const x of soDangKy.xuat) {
    them('xuat', x.id, coHet);
  }
  return dong;
}

// Tao cac dong quyen mac dinh cho mot tai khoan (khong ghi de dong da co).
function taoQuyenMacDinh(db, nguoiDungId, loaiTaiKhoan, soDangKy) {
  const chen = db.prepare('INSERT OR IGNORE INTO quyen_tai_khoan (nguoi_dung_id, loai, khoa, cho_phep) VALUES (?, ?, ?, ?)');
  let soDong = 0;
  for (const d of quyenMacDinh(loaiTaiKhoan, soDangKy)) {
    soDong += chen.run(nguoiDungId, d.loai, d.khoa, d.choPhep).changes;
  }
  return soDong;
}

// Khi khoi dong: bo sung dong quyen con thieu cho moi tai khoan (vi du vua them mo-dun moi).
// Khong bao gio sua hay xoa dong quyen da co.
function dongBoQuyenMacDinh(db, soDangKy) {
  const dsNguoi = db.prepare('SELECT id, loai FROM nguoi_dung').all();
  return db.transaction(() => {
    let tong = 0;
    for (const nguoi of dsNguoi) {
      tong += taoQuyenMacDinh(db, nguoi.id, nguoi.loai, soDangKy);
    }
    return tong;
  })();
}

// Tai quyen THAT cua mot tai khoan. Admin co toan quyen (ke ca muc/bo loc/bao cao them sau nay).
function taiQuyen(db, nguoiDung, soDangKy) {
  const laAdmin = nguoiDung.loai === 'admin';
  const duocCap = { muc: new Set(), loc: new Set(), bao_cao: new Set(), xuat: new Set() };
  if (laAdmin) {
    soDangKy.muc.forEach((m) => duocCap.muc.add(m.ma));
    soDangKy.boLoc.forEach((b) => duocCap.loc.add(b.id));
    soDangKy.baoCao.forEach((b) => duocCap.bao_cao.add(b.id));
    soDangKy.xuat.forEach((x) => duocCap.xuat.add(x.id));
  } else {
    const dong = db.prepare('SELECT loai, khoa FROM quyen_tai_khoan WHERE nguoi_dung_id = ? AND cho_phep = 1').all(nguoiDung.id);
    for (const d of dong) {
      if (duocCap[d.loai]) {
        duocCap[d.loai].add(d.khoa);
      }
    }
    // Chi tinh cac khoa con ton tai trong so dang ky (mo-dun da go thi bo qua).
    const hopLe = {
      muc: new Set(soDangKy.muc.map((m) => m.ma)),
      loc: new Set(soDangKy.boLoc.map((b) => b.id)),
      bao_cao: new Set(soDangKy.baoCao.map((b) => b.id)),
      xuat: new Set(soDangKy.xuat.map((x) => x.id)),
    };
    for (const loai of LOAI_QUYEN) {
      for (const khoa of [...duocCap[loai]]) {
        if (!hopLe[loai].has(khoa)) {
          duocCap[loai].delete(khoa);
        }
      }
    }
  }
  const baoCaoTheoId = new Map(soDangKy.baoCao.map((b) => [b.id, b]));
  const coMuc = (ma) => duocCap.muc.has(ma);
  return {
    laAdmin,
    coMuc,
    coBoLoc: (id) => duocCap.loc.has(id),
    // Mot bao cao chi chay khi tai khoan duoc cap bao cao do VA co du cac muc no can.
    coBaoCao: (id) => {
      const b = baoCaoTheoId.get(id);
      return Boolean(b) && duocCap.bao_cao.has(id) && (b.mucCanCo || []).every(coMuc);
    },
    coXuat: (id) => duocCap.xuat.has(id),
    danhSachMuc: () => [...duocCap.muc],
    danhSachBoLoc: () => [...duocCap.loc],
    danhSachBaoCao: () => soDangKy.baoCao.map((b) => b.id).filter((id) => baoCaoTheoId.has(id) && duocCap.bao_cao.has(id) && (baoCaoTheoId.get(id).mucCanCo || []).every(coMuc)),
    danhSachXuat: () => [...duocCap.xuat],
  };
}

module.exports = {
  MUC_MAC_DINH_HAN_CHE, LOAI_QUYEN, MUC, taoSoDangKy, quyenMacDinh, taoQuyenMacDinh, dongBoQuyenMacDinh, taiQuyen, locTruong,
};
