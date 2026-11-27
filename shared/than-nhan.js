// shared/than-nhan.js: quy tac "khong ghi trung" cho than nhan cua MOT quan nhan (dung chung may chu, nhap Excel, giao dien).
//  1. Trong cung mot nhom (B.I ban_than / B.II vo_chong): moi (cha, me) chi co MOT nguoi cho moi "loai quan he":
//     me de, me nuoi, me ke la ba nguoi khac nhau (duoc phep), nhung hai "me de" thi bao loi. De trong = de.
//  2. Chi co MOT vo/chong HIEN TAI (de trong loai); vo/chong cu chon "Da ly hon" thi khong gioi han.
//  3. Hai dong trung hoan toan (cung nhom, quan he, ho ten, ngay sinh) la nhap trung.
//  4. "Loai quan he" chi dung cho quan he phu hop (vd con: de/nuoi; anh chi em: khong co).
import { GIA_TRI_LUA_CHON, QUAN_HE_THEO_NHOM, TINH_CHAT_THEO_QUAN_HE } from './truong-muc.js';
import { boDau } from './ngay-chuoi.js';

const NHAN_QUAN_HE = Object.fromEntries(GIA_TRI_LUA_CHON['than_nhan.quan_he'].map((g) => [g.ma, g.nhan]));
const NHAN_TINH_CHAT = Object.fromEntries(GIA_TRI_LUA_CHON['than_nhan.tinh_chat'].map((g) => [g.ma, g.nhan]));
const TEN_CHAT = { de: 'đẻ', nuoi: 'nuôi', ke: 'kế', da_ly_hon: 'đã ly hôn' };

// dong: mang cac dong da chuan hoa { nhom, quan_he, tinh_chat, ho_ten, ngay_sinh_chuan } (gia tri ma, khong phai nhan).
// moTa(i): ham tra ve cach goi dong thu i trong thong bao (vd ten nguoi, hoac "dòng 5 của sheet"); mac dinh "dòng i+1".
// Tra ve [{ chiSo, truong: 'quan_he' | 'tinh_chat' | 'ho_ten', thongBao }]
export function kiemTraTrungThanNhan(dong, moTa = (i) => 'dòng ' + (i + 1)) {
  const loi = [];
  const themLoi = (chiSo, truong, thongBao) => loi.push({ chiSo, truong, thongBao });
  const daCoChaMe = new Map();
  const daCoVoChong = new Map();
  const daCoY = new Map();
  dong.forEach((d, i) => {
    if (!d.quan_he) {
      return;
    }
    const tc = d.tinh_chat || null;
    const hopLe = TINH_CHAT_THEO_QUAN_HE[d.quan_he] || [];
    if (tc && !hopLe.includes(tc)) {
      themLoi(
        i,
        'tinh_chat',
        'Loại quan hệ "' + (NHAN_TINH_CHAT[tc] || tc) + '" không dùng được cho "' + (NHAN_QUAN_HE[d.quan_he] || d.quan_he) + '"' +
          (hopLe.length > 0 ? ' (chỉ dùng: ' + hopLe.map((m) => NHAN_TINH_CHAT[m]).join(', ') + ')' : ' (quan hệ này không có loại, để trống)') + '.'
      );
      return;
    }
    if (d.nhom && !(QUAN_HE_THEO_NHOM[d.nhom] || []).includes(d.quan_he)) {
      return; // sai nhom: da co loi rieng
    }
    if (d.quan_he === 'cha' || d.quan_he === 'me') {
      const khoa = d.nhom + '|' + d.quan_he + '|' + (tc || 'de');
      if (daCoChaMe.has(khoa)) {
        const ten = NHAN_QUAN_HE[d.quan_he].toLowerCase();
        themLoi(
          i,
          'tinh_chat',
          'Đã có ' + ten + ' ' + TEN_CHAT[tc || 'de'] + ' là ' + moTa(daCoChaMe.get(khoa)) + '. Mỗi người chỉ có một ' + ten + ' ' + TEN_CHAT[tc || 'de'] +
            '. Nếu đây là ' + ten + ' nuôi hoặc ' + ten + ' kế thì chọn "Loại quan hệ" tương ứng; nếu nhập nhầm hoặc trùng thì xóa một dòng.'
        );
      } else {
        daCoChaMe.set(khoa, i);
      }
    }
    if ((d.quan_he === 'vo' || d.quan_he === 'chong') && !tc) {
      const khoa = d.nhom || '';
      if (daCoVoChong.has(khoa)) {
        themLoi(
          i,
          'quan_he',
          'Đã có vợ/chồng hiện tại là ' + moTa(daCoVoChong.get(khoa)) + '. Chỉ có một vợ/chồng hiện tại; người đã ly hôn thì chọn "Loại quan hệ" = Đã ly hôn.'
        );
      } else {
        daCoVoChong.set(khoa, i);
      }
    }
    const khoaY = [d.nhom, d.quan_he, boDau(d.ho_ten || ''), d.ngay_sinh_chuan || ''].join('|');
    if (d.ho_ten && daCoY.has(khoaY)) {
      themLoi(i, 'ho_ten', 'Trùng với ' + moTa(daCoY.get(khoaY)) + ': cùng quan hệ, họ tên và ngày sinh. Xóa một dòng.');
    } else if (d.ho_ten) {
      daCoY.set(khoaY, i);
    }
  });
  return loi;
}
