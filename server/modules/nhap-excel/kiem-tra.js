'use strict';
// kiem-tra.js: PHA KIEM TRA - doc file Excel va kiem tra toan bo, CHUA ghi gi vao CSDL.
// Tra ve { baoCao, plan }: baoCao gom loi theo (sheet, so dong, cot), danh muc la, tom tat;
// plan la ke hoach ghi (dung cho pha ap dung) khi khong co loi.
const { GIA_TRI_LUA_CHON, QUAN_HE_THEO_NHOM } = require('../../../shared/truong-muc.js');
const { bieuMauSangCot, ngayDuSangHienThi, truongCuaBang } = require('../../../shared/bieu-mau.js');
const { boDau, ngayDuongLich } = require('../../../shared/ngay-chuoi.js');
const { kiemTraNgayTuongLai } = require('../trang-thai/quy-tac');
const { kiemTraTrungThanNhan } = require('../../../shared/than-nhan.js');
const { LOAI_DANH_MUC } = require('../danh-muc/routes');
const { docTep, docSheet } = require('./doc-excel');
const { CAC_SHEET, COT_MA, cotCuaSheet } = require('./cau-hinh-sheet');

const LOAI_KHONG_TU_THEM = new Set(['trang_thai']); // trang thai co co "tinh la vang"... phai them thu cong o Danh muc
const NHAN_LOAI = Object.fromEntries(LOAI_DANH_MUC.map((l) => [l.loai, l.nhan]));
const TOI_DA_LOI = 1000;
const MAU_CO = ['co', 'x', '1', 'true', 'yes', 'dung'];
const MAU_KHONG = ['khong', '0', 'false', 'no', 'sai'];

function taiDanhMuc(db) {
  const loaiCan = [...new Set(truongTatCa().filter((t) => t.danhMuc).map((t) => t.danhMuc))];
  const ketQua = {};
  for (const loai of loaiCan) {
    const dong = db.prepare('SELECT id, ma, ten, dang_dung, cho_dang_ky_truoc FROM danh_muc WHERE loai = ? ORDER BY thu_tu, id').all(loai);
    const theoMa = new Map();
    const theoTen = new Map();
    const theoId = new Map();
    for (const d of dong) {
      theoMa.set(d.ma.toLowerCase(), d);
      theoId.set(d.id, d);
      const khoa = boDau(d.ten);
      if (!theoTen.has(khoa)) {
        theoTen.set(khoa, []);
      }
      theoTen.get(khoa).push(d);
    }
    ketQua[loai] = { theoMa, theoTen, theoId };
  }
  return ketQua;
}

function truongTatCa() {
  return CAC_SHEET.flatMap((s) => truongCuaBang(s.bang));
}

// Doi mot o Excel thanh gia tri "bieu mau" cua truong t. Tra ve { gia } hoac { loi }.
function chuyenGiaTri(t, raw, nc) {
  if (raw !== null && typeof raw === 'object' && !(raw instanceof Date)) {
    return { loi: 'Ô chứa lỗi công thức (' + raw.loiO + ')' };
  }
  switch (t.kieu) {
    case 'chu':
      if (raw instanceof Date) {
        return { loi: 'Ô này bị Excel đổi thành ngày. Hãy đặt cả cột là định dạng Text rồi nhập lại' };
      }
      // "Tên gọi khác: Không" (theo mẫu hồ sơ gốc) = không có tên gọi khác, không phải một cái tên.
      if (t.truong === 'ten_goi_khac' && raw !== null && boDau(String(raw)) === 'khong') {
        return { gia: '' };
      }
      return { gia: raw === null ? '' : String(raw) };
    case 'so':
      if (raw instanceof Date || typeof raw === 'boolean') {
        return { loi: 'Phải là số' };
      }
      // "Khong", "-" trong o so (vd phu cap kiem nhiem trong mau goc) = khong co gia tri
      if (typeof raw === 'string' && ['khong', 'khong co', '-'].includes(boDau(raw))) {
        return { gia: '' };
      }
      return { gia: raw === null ? '' : raw };
    case 'ngay_du':
    case 'ngay_thieu':
      return { gia: raw === null ? '' : raw instanceof Date ? raw : String(raw) };
    case 'co_khong': {
      if (raw === null) {
        return { gia: false };
      }
      const k = boDau(String(raw));
      if (MAU_CO.includes(k)) {
        return { gia: true };
      }
      if (MAU_KHONG.includes(k)) {
        return { gia: false };
      }
      return { loi: 'Chỉ nhập Có hoặc Không' };
    }
    case 'lua_chon':
      return t.danhMuc ? traDanhMuc(t, raw, nc) : traLuaChonCoDinh(t, raw);
    default:
      return { loi: 'Kiểu trường lạ' };
  }
}

function traLuaChonCoDinh(t, raw) {
  if (raw === null) {
    return { gia: '' };
  }
  const ds = GIA_TRI_LUA_CHON[t.bang + '.' + t.truong] || [];
  const chuoi = String(raw).trim();
  const k = boDau(chuoi);
  const g = ds.find((x) => x.ma === chuoi.toLowerCase() || boDau(x.nhan) === k || boDau(x.nhan.replace(/\s*\(.*\)\s*$/, '')) === k);
  return g ? { gia: g.ma } : { loi: 'Giá trị "' + chuoi + '" không hợp lệ. Chọn một trong: ' + ds.map((x) => x.nhan).join(', ') };
}

function traDanhMuc(t, raw, nc) {
  if (raw === null) {
    return { gia: '' };
  }
  const ten = String(raw).trim();
  const bang = nc.dm[t.danhMuc];
  let dong = bang.theoMa.get(ten.toLowerCase()) || null;
  if (!dong) {
    const ds = bang.theoTen.get(boDau(ten)) || [];
    if (ds.length > 1) {
      return { loi: 'Tên "' + ten + '" trùng ở nhiều mục (' + ds.map((d) => d.ma).join(', ') + '). Hãy ghi mã thay cho tên.' };
    }
    dong = ds[0] || null;
  }
  if (dong) {
    return dong.dang_dung === 1 ? { gia: dong.id } : { loi: 'Mục "' + dong.ten + '" đã ngừng dùng trong danh mục' };
  }
  if (LOAI_KHONG_TU_THEM.has(t.danhMuc)) {
    return { loi: 'Trạng thái "' + ten + '" chưa có trong danh mục. Hãy thêm ở màn hình Danh mục (đặt cờ "tính là vắng"...) rồi nhập lại.' };
  }
  // Muc chua co trong danh muc: ghi nhan de hoi admin co them khong
  const key = boDau(ten);
  const khoa = t.danhMuc + '|' + key;
  if (!nc.danhMucLa.has(khoa)) {
    nc.danhMucLa.set(khoa, { loai: t.danhMuc, ten, key, viTri: [] });
  }
  nc.danhMucLa.get(khoa).viTri.push({ sheet: nc.sheet, dong: nc.soDong });
  nc.moi.push({ cot: t.cot[0], loai: t.danhMuc, key });
  return { gia: 1 }; // gia tam; khi ap dung se thay bang ma that cua muc vua tao
}

// Doi mot dong Excel thanh cac cot SQL; bao loi theo cot.
function xuLyDong(sheet, dong, nc, homNay, themLoi) {
  nc.sheet = sheet.ten;
  nc.soDong = dong.soDong;
  nc.moi = [];
  const bieuMau = {};
  const loiCot = {};
  for (const t of truongCuaBang(sheet.bang)) {
    const raw = dong.gia[t.truong] === undefined ? null : dong.gia[t.truong];
    const kq = chuyenGiaTri(t, raw, nc);
    if (kq.loi) {
      loiCot[t.truong] = kq.loi;
    } else {
      bieuMau[t.truong] = kq.gia;
    }
  }
  const { cot, loi } = bieuMauSangCot(sheet.bang, bieuMau, { homNay });
  for (const [truong, thongBao] of Object.entries(loi)) {
    if (!loiCot[truong]) {
      loiCot[truong] = thongBao;
    }
  }
  for (const [truong, thongBao] of Object.entries(loiCot)) {
    themLoi(sheet.ten, dong.soDong, truong, thongBao);
  }
  return { cot, moi: nc.moi, coLoi: Object.keys(loiCot).length > 0 };
}

async function kiemTraTep(db, buffer, { cheDo = 'them_hoac_cap_nhat', homNay = ngayDuongLich() } = {}) {
  const baoCao = { cheDo, loi: [], canhBao: [], danhMucLa: [], tomTat: {} };
  const themLoi = (sheet, dong, cot, thongBao) => baoCao.loi.push({ sheet, dong, cot, thongBao });
  let wb;
  try {
    wb = await docTep(buffer);
  } catch {
    themLoi('(file)', null, null, 'Không đọc được file. File phải là Excel dạng .xlsx (không phải .xls, .csv hay file bị hỏng).');
    baoCao.soLoi = baoCao.loi.length;
    return { baoCao, plan: null };
  }

  const nc = { dm: taiDanhMuc(db), danhMucLa: new Map(), moi: [], sheet: '', soDong: 0 };
  const duLieu = {};
  const sheetHong = new Set();
  for (const sh of CAC_SHEET) {
    const ws = wb.getWorksheet(sh.ten);
    if (!ws) {
      duLieu[sh.ten] = null;
      continue;
    }
    const cacCot = cotCuaSheet(sh);
    const kq = docSheet(ws, new Set(cacCot.map((c) => c.truong.toLowerCase())));
    duLieu[sh.ten] = kq;
    for (const l of kq.loi) {
      themLoi(sh.ten, l.dong, l.cot, l.thongBao);
    }
    if (kq.coDuLieu) {
      for (const c of cacCot) {
        if (c.batBuoc && c.kieu !== 'co_khong' && !kq.tieuDe.has(c.truong.toLowerCase())) {
          themLoi(sh.ten, 1, c.truong, 'Thiếu cột bắt buộc "' + c.truong + '" (' + c.hienThi + ').');
          sheetHong.add(sh.ten);
        }
      }
    }
  }
  const coDuLieuNao = CAC_SHEET.some((s) => duLieu[s.ten] && duLieu[s.ten].coDuLieu);
  if (!coDuLieuNao) {
    themLoi('(file)', null, null, 'File không có dòng dữ liệu nào (kiểm tra tên sheet: ' + CAC_SHEET.map((s) => s.ten).join(', ') + ').');
  }
  if (cheDo === 'thay_the' && !(duLieu.quan_nhan && duLieu.quan_nhan.coDuLieu)) {
    themLoi('quan_nhan', null, null, 'Chế độ thay thế cần có ít nhất một hồ sơ ở sheet quan_nhan (tránh xóa sạch dữ liệu do nhầm file).');
  }

  // ---- Sheet quan_nhan ----
  const nguoi = new Map(); // ma -> muc cua ke hoach
  const canCuoc = new Map();
  const chinh = duLieu.quan_nhan;
  const tomTat = { cheDo, soDongTheoSheet: {}, them: 0, capNhat: 0, chiCon: 0, xoaTruoc: 0, bangConThayThe: {} };
  if (chinh && chinh.coDuLieu && !sheetHong.has('quan_nhan')) {
    for (const dong of chinh.cacDong) {
      const kq = xuLyDong(CAC_SHEET[0], dong, nc, homNay, themLoi);
      const ma = kq.cot.ma_quan_nhan;
      if (!ma) {
        continue;
      }
      if (nguoi.has(ma)) {
        themLoi('quan_nhan', dong.soDong, 'ma_quan_nhan', 'Mã "' + ma + '" bị trùng với dòng ' + nguoi.get(ma).soDong + ' của sheet này.');
        continue;
      }
      let hanhDong = 'them';
      let id = null;
      if (cheDo !== 'thay_the') {
        const hang = db.prepare('SELECT id, da_xoa FROM quan_nhan WHERE ma_quan_nhan = ?').get(ma);
        if (hang && hang.da_xoa === 1) {
          themLoi('quan_nhan', dong.soDong, 'ma_quan_nhan', 'Mã "' + ma + '" thuộc một hồ sơ đã bị xóa mềm. Dùng mã khác.');
        } else if (hang) {
          hanhDong = 'cap_nhat';
          id = hang.id;
        }
      }
      const so = kq.cot.so_can_cuoc;
      if (so) {
        if (canCuoc.has(so)) {
          themLoi('quan_nhan', dong.soDong, 'so_can_cuoc', 'Số căn cước trùng với dòng ' + canCuoc.get(so).soDong + ' (mã ' + canCuoc.get(so).ma + ') của sheet này.');
        } else {
          canCuoc.set(so, { soDong: dong.soDong, ma });
          if (cheDo !== 'thay_the') {
            const trung = db.prepare('SELECT ma_quan_nhan FROM quan_nhan WHERE so_can_cuoc = ? AND ma_quan_nhan != ?').get(so, ma);
            if (trung) {
              themLoi('quan_nhan', dong.soDong, 'so_can_cuoc', 'Số căn cước trùng với hồ sơ mã "' + trung.ma_quan_nhan + '" đã có trong CSDL.');
            }
          }
        }
      }
      nguoi.set(ma, { ma, soDong: dong.soDong, hanhDong, id, cot: kq.cot, moi: kq.moi, con: {} });
    }
  }

  // ---- Cac sheet con ----
  const layNguoiNgoai = (ma) => {
    if (cheDo === 'thay_the') {
      return null;
    }
    const hang = db.prepare('SELECT id, da_xoa FROM quan_nhan WHERE ma_quan_nhan = ?').get(ma);
    if (!hang || hang.da_xoa === 1) {
      return null;
    }
    const m = { ma, soDong: null, hanhDong: 'chi_con', id: hang.id, cot: null, moi: [], con: {} };
    nguoi.set(ma, m);
    return m;
  };
  for (const sh of CAC_SHEET.slice(1)) {
    const kq = duLieu[sh.ten];
    if (!kq || !kq.coDuLieu || sheetHong.has(sh.ten)) {
      continue;
    }
    for (const dong of kq.cacDong) {
      const raw = dong.gia[COT_MA];
      const ma = raw === null || raw === undefined ? '' : String(raw).trim();
      let m = null;
      if (!ma) {
        themLoi(sh.ten, dong.soDong, COT_MA, 'Bắt buộc nhập');
      } else {
        m = nguoi.get(ma) || layNguoiNgoai(ma);
        if (!m) {
          themLoi(sh.ten, dong.soDong, COT_MA, 'Không có quân nhân mã "' + ma + '": không có trong sheet quan_nhan của file này' + (cheDo === 'thay_the' ? '.' : ' và cũng chưa có trong CSDL.'));
        }
      }
      const kqDong = xuLyDong(sh, dong, nc, homNay, themLoi);
      if (sh.bang === 'than_nhan' && kqDong.cot.nhom && kqDong.cot.quan_he && !QUAN_HE_THEO_NHOM[kqDong.cot.nhom].includes(kqDong.cot.quan_he)) {
        themLoi(sh.ten, dong.soDong, 'quan_he', 'Quan hệ này không dùng được trong nhóm ' + (kqDong.cot.nhom === 'vo_chong' ? 'vo_chong (B.II, gia đình vợ/chồng)' : 'ban_than (B.I)') + '.');
        kqDong.coLoi = true;
      }
      if (m && !kqDong.coLoi) {
        (m.con[sh.bang] = m.con[sh.bang] || []).push({ soDong: dong.soDong, cot: kqDong.cot, moi: kqDong.moi });
      }
    }
  }

  // ---- Than nhan: khong ghi trung (cha/me cung loai, vo/chong hien tai, dong trung) trong tung quan nhan ----
  for (const m of nguoi.values()) {
    const ds = m.con.than_nhan || [];
    for (const l of kiemTraTrungThanNhan(ds.map((d) => d.cot), (i) => 'dòng ' + ds[i].soDong + ' (' + ds[i].cot.ho_ten + ')')) {
      themLoi('than_nhan', ds[l.chiSo].soDong, l.truong, l.thongBao);
    }
  }

  // ---- Trang thai: tu <= den, ngay tuong lai, khong chong nhau trong cung mot nguoi ----
  for (const m of nguoi.values()) {
    const ds = m.con.trang_thai_quan_nhan || [];
    for (const d of ds.slice()) {
      const { tu_ngay: tu, den_ngay: den, trang_thai_id: id } = d.cot;
      const loai = nc.dm.trang_thai.theoId.get(id);
      let hong = null;
      if (den && den < tu) {
        hong = { cot: 'den_ngay', thongBao: '"Đến ngày" (' + ngayDuSangHienThi(den) + ') không được trước "từ ngày" (' + ngayDuSangHienThi(tu) + ').' };
      } else if (loai) {
        const vp = kiemTraNgayTuongLai(db, loai, tu, den, homNay);
        if (vp) {
          hong = { cot: vp.truong, thongBao: vp.thongBao };
        }
      }
      if (hong) {
        themLoi('trang_thai', d.soDong, hong.cot, hong.thongBao);
        ds.splice(ds.indexOf(d), 1);
      }
    }
    const sapXep = ds.slice().sort((a, b) => (a.cot.tu_ngay < b.cot.tu_ngay ? -1 : a.cot.tu_ngay > b.cot.tu_ngay ? 1 : a.soDong - b.soDong));
    let datCuoi = null; // khoang co ngay ket thuc muon nhat tinh den thoi diem hien tai
    for (const d of sapXep) {
      if (datCuoi && d.cot.tu_ngay <= (datCuoi.cot.den_ngay || '9999-12-31')) {
        const tenCu = nc.dm.trang_thai.theoId.get(datCuoi.cot.trang_thai_id).ten;
        themLoi('trang_thai', d.soDong, 'tu_ngay', 'Khoảng thời gian bị chồng với dòng ' + datCuoi.soDong + ' (trạng thái "' + tenCu + '", ' + ngayDuSangHienThi(datCuoi.cot.tu_ngay) + ' – ' + (datCuoi.cot.den_ngay ? ngayDuSangHienThi(datCuoi.cot.den_ngay) : 'chưa kết thúc') + ') của cùng quân nhân mã "' + m.ma + '".');
      }
      if (!datCuoi || (d.cot.den_ngay || '9999-12-31') > (datCuoi.cot.den_ngay || '9999-12-31')) {
        datCuoi = d;
      }
    }
  }

  // ---- Danh muc la ----
  baoCao.danhMucLa = [...nc.danhMucLa.values()]
    .sort((a, b) => a.loai.localeCompare(b.loai) || a.ten.localeCompare(b.ten))
    .map((d) => ({ loai: d.loai, nhanLoai: NHAN_LOAI[d.loai] || d.loai, ten: d.ten, soDong: d.viTri.length, viTri: d.viTri.slice(0, 5) }));

  // ---- Tom tat ----
  for (const sh of CAC_SHEET) {
    tomTat.soDongTheoSheet[sh.ten] = duLieu[sh.ten] ? duLieu[sh.ten].cacDong.length : 0;
  }
  for (const m of nguoi.values()) {
    if (m.hanhDong === 'them') {
      tomTat.them += 1;
    } else if (m.hanhDong === 'cap_nhat') {
      tomTat.capNhat += 1;
    } else {
      tomTat.chiCon += 1;
    }
    for (const [bang, ds] of Object.entries(m.con)) {
      const mucBang = (tomTat.bangConThayThe[bang] = tomTat.bangConThayThe[bang] || { soNguoi: 0, soDongMoi: 0, soDongCu: 0 });
      mucBang.soNguoi += 1;
      mucBang.soDongMoi += ds.length;
      if (m.id) {
        mucBang.soDongCu += db.prepare('SELECT COUNT(*) AS n FROM ' + bang + ' WHERE quan_nhan_id = ?').get(m.id).n; // bang lay tu danh sach co dinh
      }
    }
  }
  if (cheDo === 'thay_the') {
    tomTat.xoaTruoc = db.prepare('SELECT COUNT(*) AS n FROM quan_nhan').get().n;
    if (tomTat.xoaTruoc > 0) {
      baoCao.canhBao.push('Chế độ thay thế sẽ XÓA toàn bộ ' + tomTat.xoaTruoc + ' hồ sơ hiện có (kể cả hồ sơ đã xóa mềm) rồi nhập ' + tomTat.them + ' hồ sơ trong file.');
    }
  } else {
    for (const [bang, m] of Object.entries(tomTat.bangConThayThe)) {
      if (m.soDongCu > 0) {
        baoCao.canhBao.push('Bảng "' + bang + '": ' + m.soNguoi + ' quân nhân có dòng trong file, nên ' + m.soDongCu + ' dòng cũ của họ sẽ được THAY bằng ' + m.soDongMoi + ' dòng trong file.');
      }
    }
  }
  baoCao.tomTat = tomTat;

  // ---- Sap xep va cat bot loi ----
  const thuTu = Object.fromEntries([['(file)', -1], ...CAC_SHEET.map((s, i) => [s.ten, i])]);
  baoCao.loi.sort((a, b) => thuTu[a.sheet] - thuTu[b.sheet] || (a.dong || 0) - (b.dong || 0));
  baoCao.soLoi = baoCao.loi.length;
  if (baoCao.loi.length > TOI_DA_LOI) {
    baoCao.loi = baoCao.loi.slice(0, TOI_DA_LOI);
    baoCao.biCatLoi = true;
  }

  const plan = {
    cheDo,
    nguoi: [...nguoi.values()],
    danhMucMoi: [...nc.danhMucLa.values()].map((d) => ({ loai: d.loai, ten: d.ten, key: d.key })),
  };
  return { baoCao, plan };
}

module.exports = { kiemTraTep };
