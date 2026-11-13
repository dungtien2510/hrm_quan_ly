'use strict';
// tien-ich.js: cac ham nho dung chung trong mo-dun tai-khoan (kiem tra du lieu, loi nghiep vu).

// Loi do nguoi dung (du lieu sai, trung ten...), khong phai loi lap trinh. Co ma trang thai HTTP.
class LoiNghiepVu extends Error {
  constructor(thongBao, trangThai = 400, them = {}) {
    super(thongBao);
    this.trangThai = trangThai;
    this.them = them;
  }
}

// Kiem tra du lieu gui len bang zod (quy tac 5). Khong tra lai gia tri nguoi dung gui (tranh lo mat khau).
function phanTich(luocDo, duLieu) {
  const kq = luocDo.safeParse(duLieu);
  if (kq.success) {
    return { ok: true, du: kq.data };
  }
  const truong = [...new Set(kq.error.issues.map((v) => v.path.join('.') || '(du lieu)'))];
  return { ok: false, truong };
}

function guiLoiDuLieu(res, truong) {
  res.status(400).json({ loi: 'Dữ liệu gửi lên không hợp lệ', ma: 'DU_LIEU_SAI', truong });
}

// Bien LoiNghiepVu thanh phan hoi JSON; loi khac thi day tiep cho bo bat loi chung (se tra 500).
function xuLyLoi(res, next, loi) {
  if (loi instanceof LoiNghiepVu) {
    res.status(loi.trangThai).json(Object.assign({ loi: loi.message }, loi.them));
    return;
  }
  next(loi);
}

// Boc ham async cua route de loi duoc bat va xu ly thong nhat.
function boc(ham) {
  return (req, res, next) => {
    Promise.resolve(ham(req, res, next)).catch((loi) => xuLyLoi(res, next, loi));
  };
}

module.exports = { LoiNghiepVu, phanTich, guiLoiDuLieu, xuLyLoi, boc };
