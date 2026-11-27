'use strict';
// doc-excel.js: doc file Excel (.xlsx) thanh cac dong "ten cot -> gia tri" bang thu vien exceljs.
const ExcelJS = require('exceljs');
const { boDau } = require('../../../shared/ngay-chuoi.js');

const TOI_DA_DONG = 5000; // so dong du lieu toi da moi sheet
const COT_BO_QUA = new Set(['chu thich', 'ghi chu']); // cot ghi chu cua nguoi nhap, khong doc

async function docTep(buffer) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  return wb;
}

// Doi gia tri cua mot o ve: null, number, boolean, Date, hoac chuoi da cat khoang trang. Loi cong thuc -> { loiO }.
function giaTriO(giaTri) {
  if (giaTri === null || giaTri === undefined) {
    return null;
  }
  if (giaTri instanceof Date || typeof giaTri === 'number' || typeof giaTri === 'boolean') {
    return giaTri;
  }
  if (typeof giaTri === 'string') {
    const chuoi = giaTri.trim();
    return chuoi === '' ? null : chuoi;
  }
  if (typeof giaTri === 'object') {
    if (Array.isArray(giaTri.richText)) {
      return giaTriO(giaTri.richText.map((p) => p.text).join(''));
    }
    if ('result' in giaTri) {
      return giaTriO(giaTri.result);
    }
    if (typeof giaTri.text === 'string') {
      return giaTriO(giaTri.text);
    }
    if (giaTri.error) {
      return { loiO: String(giaTri.error) };
    }
  }
  return giaTriO(String(giaTri));
}

// Doc mot sheet. tenCotHopLe: Set ten cot cho phep. Tra ve:
//  { coDuLieu, tieuDe: Map(ten -> chiSoCot), cacDong: [{ soDong, gia: {ten: giaTri} }], loi: [{ dong, cot, thongBao }] }
function docSheet(ws, tenCotHopLe) {
  const ketQua = { coDuLieu: false, tieuDe: new Map(), cacDong: [], loi: [] };
  const hangDau = ws.getRow(1);
  const chiSoTheoTen = new Map();
  hangDau.eachCell({ includeEmpty: false }, (o, chiSoCot) => {
    const goc = giaTriO(o.value);
    if (goc === null || typeof goc === 'object') {
      return;
    }
    const ten = String(goc).trim();
    if (COT_BO_QUA.has(boDau(ten))) {
      return;
    }
    const khoa = ten.toLowerCase();
    if (!tenCotHopLe.has(khoa)) {
      ketQua.loi.push({ dong: 1, cot: ten, thongBao: 'Cột "' + ten + '" không có trong mẫu (kiểm tra chính tả, hoặc xóa cột này).' });
      return;
    }
    if (chiSoTheoTen.has(khoa)) {
      ketQua.loi.push({ dong: 1, cot: ten, thongBao: 'Cột "' + ten + '" bị lặp hai lần.' });
      return;
    }
    chiSoTheoTen.set(khoa, chiSoCot);
  });
  ketQua.tieuDe = chiSoTheoTen;
  const cotDoc = [...chiSoTheoTen.entries()];
  ws.eachRow({ includeEmpty: false }, (hang, soDong) => {
    if (soDong === 1) {
      return;
    }
    const gia = {};
    let coGiaTri = false;
    for (const [ten, chiSo] of cotDoc) {
      const v = giaTriO(hang.getCell(chiSo).value);
      gia[ten] = v;
      if (v !== null) {
        coGiaTri = true;
      }
    }
    if (coGiaTri) {
      ketQua.cacDong.push({ soDong, gia });
    }
  });
  ketQua.coDuLieu = ketQua.cacDong.length > 0;
  if (ketQua.cacDong.length > TOI_DA_DONG) {
    ketQua.loi.push({ dong: null, cot: null, thongBao: 'Sheet có ' + ketQua.cacDong.length + ' dòng, vượt giới hạn ' + TOI_DA_DONG + ' dòng. Hãy chia nhỏ file.' });
    ketQua.cacDong = ketQua.cacDong.slice(0, TOI_DA_DONG);
  }
  return ketQua;
}

module.exports = { docTep, docSheet, giaTriO, TOI_DA_DONG };
