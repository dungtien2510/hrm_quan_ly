// api.js: goi API cua may chu. Tu dong gui ma CSRF cho cac yeu cau thay doi du lieu.
let maCsrf = null;

export function datMaCsrf(ma) {
  maCsrf = ma;
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
