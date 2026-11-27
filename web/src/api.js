// api.js: goi API cua may chu. Tu dong gui ma CSRF cho cac yeu cau thay doi du lieu.
let maCsrf = null;

export function datMaCsrf(ma) {
  maCsrf = ma;
}

// Doc phan hoi JSON; loi thi nem Error co .trangThai va .du
async function docPhanHoi(phanHoi) {
  let du = null;
  try {
    du = await phanHoi.json();
  } catch {
    du = null;
  }
  if (!phanHoi.ok) {
    const loi = new Error((du && du.loi) || 'Lỗi ' + phanHoi.status);
    loi.trangThai = phanHoi.status;
    loi.du = du;
    throw loi;
  }
  return du;
}

// goiApi('/api/...', { phuongThuc: 'POST', body: {...} }) -> du lieu JSON; loi thi nem Error co .trangThai va .du
export async function goiApi(duongDan, tuyChon = {}) {
  const { phuongThuc = 'GET', body, huy } = tuyChon;
  const tieuDe = {};
  if (body !== undefined) {
    tieuDe['Content-Type'] = 'application/json';
  }
  if (phuongThuc !== 'GET' && maCsrf) {
    tieuDe['X-CSRF-Token'] = maCsrf;
  }
  const phanHoi = await fetch(duongDan, {
    method: phuongThuc,
    headers: tieuDe,
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: 'same-origin',
    signal: huy,
  });
  return docPhanHoi(phanHoi);
}

// Gui noi dung mot file (File) lam than yeu cau POST (vd file Excel). Tra ve JSON.
export async function guiTep(duongDan, tep) {
  const noiDung = await tep.arrayBuffer();
  const tieuDe = { 'Content-Type': 'application/octet-stream' };
  if (maCsrf) {
    tieuDe['X-CSRF-Token'] = maCsrf;
  }
  const phanHoi = await fetch(duongDan, { method: 'POST', headers: tieuDe, body: noiDung, credentials: 'same-origin' });
  return docPhanHoi(phanHoi);
}

// Tai mot file ve may (vd file Excel mau) qua trinh duyet.
export async function taiTep(duongDan, tenFile) {
  const phanHoi = await fetch(duongDan, { credentials: 'same-origin' });
  if (!phanHoi.ok) {
    await docPhanHoi(phanHoi);
  }
  const blob = await phanHoi.blob();
  const url = URL.createObjectURL(blob);
  const lien = document.createElement('a');
  lien.href = url;
  lien.download = tenFile;
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
  URL.revokeObjectURL(url);
}

// Mat khau tam ngau nhien (14 ky tu de doc + "a9" de du chu va so). Chi hien cho admin MOT LAN.
export function taoMatKhauNgauNhien() {
  const kyTu = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const so = new Uint8Array(14);
  crypto.getRandomValues(so);
  let kq = '';
  for (const b of so) {
    kq += kyTu[b % kyTu.length];
  }
  return kq + 'a9';
}
