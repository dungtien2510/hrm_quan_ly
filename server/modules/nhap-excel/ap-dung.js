'use strict';
// ap-dung.js: ghi ket qua kiem tra vao CSDL trong MOT giao dich: loi giua chung thi KHONG thay doi gi
// (ke ca danh muc moi them va viec xoa o che do "thay the").
const { boDau } = require('../../../shared/ngay-chuoi.js');
const { taoTimKiem } = require('../../../shared/bieu-mau.js');
const { chenDong, capNhatQuanNhanTheoPhienBan } = require('../quan-nhan/ghi-sql');
const { CAC_SHEET } = require('./cau-hinh-sheet');

const BANG_CON = CAC_SHEET.filter((s) => !s.chinh).map((s) => s.bang);

// "Đại đội A" -> "dai_doi_a"; bao dam duy nhat trong loai.
function taoMaDanhMuc(db, loai, ten, daDung) {
  let goc = boDau(ten).replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 36) || 'muc';
  let ma = goc;
  for (let i = 2; daDung.has(ma) || db.prepare('SELECT 1 FROM danh_muc WHERE loai = ? AND ma = ?').get(loai, ma); i += 1) {
    ma = goc + '_' + i;
  }
  daDung.add(ma);
  return ma;
}

function gan(cot, moi, idMoi) {
  const ban = Object.assign({}, cot);
  for (const m of moi) {
    ban[m.cot] = idMoi.get(m.loai + '|' + m.key);
  }
  return ban;
}

// tuyChon.sauMoiNguoi(chiSo): ham thu nghiem de gia lap loi giua chung (chi dung trong kiem thu).
function apDung(db, plan, tuyChon = {}) {
  return db.transaction(() => {
    const ketQua = { soXoaTruoc: 0, soThem: 0, soCapNhat: 0, soChiCon: 0, soDanhMucMoi: 0, soDongCon: {} };
    if (plan.cheDo === 'thay_the') {
      ketQua.soXoaTruoc = db.prepare('DELETE FROM quan_nhan').run().changes; // cac bang con xoa theo (ON DELETE CASCADE)
    }
    // Danh muc moi
    const idMoi = new Map();
    const daDung = new Set();
    for (const m of plan.danhMucMoi) {
      const ma = taoMaDanhMuc(db, m.loai, m.ten, daDung);
      const thuTu = db.prepare('SELECT COALESCE(MAX(thu_tu), 0) + 1 AS n FROM danh_muc WHERE loai = ?').get(m.loai).n;
      const id = Number(db.prepare('INSERT INTO danh_muc (loai, ma, ten, thu_tu) VALUES (?, ?, ?, ?)').run(m.loai, ma, m.ten, thuTu).lastInsertRowid);
      idMoi.set(m.loai + '|' + m.key, id);
      ketQua.soDanhMucMoi += 1;
    }
    // Tung quan nhan
    plan.nguoi.forEach((n, chiSo) => {
      let id = n.id;
      if (n.hanhDong === 'them') {
        const cot = gan(n.cot, n.moi, idMoi);
        id = chenDong(db, 'quan_nhan', Object.assign(cot, { tim_kiem: taoTimKiem(cot) }));
        ketQua.soThem += 1;
      } else if (n.hanhDong === 'cap_nhat') {
        const cot = gan(n.cot, n.moi, idMoi);
        const hienTai = db.prepare('SELECT version FROM quan_nhan WHERE id = ?').get(id);
        const doi = capNhatQuanNhanTheoPhienBan(db, id, hienTai.version, Object.assign(cot, { tim_kiem: taoTimKiem(cot) }));
        if (doi !== 1) {
          throw new Error('Khong cap nhat duoc ho so ' + n.ma);
        }
        ketQua.soCapNhat += 1;
      } else {
        ketQua.soChiCon += 1;
      }
      for (const bang of BANG_CON) {
        const dsDong = n.con[bang];
        if (!dsDong || dsDong.length === 0) {
          continue; // khong co dong nao trong file cho bang nay: giu nguyen du lieu cu
        }
        if (n.hanhDong !== 'them') {
          db.prepare('DELETE FROM ' + bang + ' WHERE quan_nhan_id = ?').run(id); // ten bang lay tu danh sach co dinh
        }
        for (const d of dsDong) {
          chenDong(db, bang, Object.assign({ quan_nhan_id: id }, gan(d.cot, d.moi, idMoi)));
        }
        ketQua.soDongCon[bang] = (ketQua.soDongCon[bang] || 0) + dsDong.length;
      }
      if (tuyChon.sauMoiNguoi) {
        tuyChon.sauMoiNguoi(chiSo);
      }
    });
    return ketQua;
  })();
}

module.exports = { apDung };
