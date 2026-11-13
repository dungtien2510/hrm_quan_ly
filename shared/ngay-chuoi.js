// shared/ngay-chuoi.js: ham dung chung cho may chu va giao dien: bo dau tieng Viet va xu ly ngay thieu.

// Bo dau: "Nguyễn Văn Đạt" -> "nguyen van dat". Dung cho cot tim_kiem.
export function boDau(chuoi) {
  if (chuoi === null || chuoi === undefined) {
    return '';
  }
  return String(chuoi)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function soNgayTrongThang(nam, thang) {
  return new Date(Date.UTC(nam, thang, 0)).getUTCDate();
}

function hai(so) {
  return String(so).padStart(2, '0');
}

// Chuan hoa ngay thieu. Nhan "dd/mm/yyyy", "d/m/yyyy", "mm/yyyy", "m/yyyy" hoac doi tuong Date
// (o Excel doc ra). Tra ve null neu rong; nem loi (tieng Viet) neu sai.
// Ket qua: { nam, thang, ngay (hoac null), chuan: 'yyyy-mm-dd', hienThi: 'dd/mm/yyyy' hoac 'mm/yyyy' }
// "chuan" cua ngay chi co thang/nam la ngay 1 cua thang do (de loc va so sanh).
export function chuanHoaNgayThieu(giaTri) {
  if (giaTri === null || giaTri === undefined || giaTri === '') {
    return null;
  }
  let nam;
  let thang;
  let ngay = null;
  if (giaTri instanceof Date) {
    if (Number.isNaN(giaTri.getTime())) {
      throw new Error('Ngày không hợp lệ');
    }
    nam = giaTri.getUTCFullYear();
    thang = giaTri.getUTCMonth() + 1;
    ngay = giaTri.getUTCDate();
  } else {
    const chuoi = String(giaTri).trim();
    const day = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(chuoi);
    const thieu = /^(\d{1,2})\/(\d{4})$/.exec(chuoi);
    if (day) {
      ngay = Number(day[1]);
      thang = Number(day[2]);
      nam = Number(day[3]);
    } else if (thieu) {
      thang = Number(thieu[1]);
      nam = Number(thieu[2]);
    } else {
      throw new Error('Ngày "' + chuoi + '" không đúng dạng dd/mm/yyyy hoặc mm/yyyy');
    }
  }
  if (nam < 1900 || nam > 2200) {
    throw new Error('Năm ' + nam + ' ngoài khoảng 1900–2200');
  }
  if (thang < 1 || thang > 12) {
    throw new Error('Tháng ' + thang + ' không hợp lệ');
  }
  if (ngay !== null && (ngay < 1 || ngay > soNgayTrongThang(nam, thang))) {
    throw new Error('Ngày ' + ngay + ' không có trong tháng ' + thang + '/' + nam);
  }
  return {
    nam,
    thang,
    ngay,
    chuan: nam + '-' + hai(thang) + '-' + hai(ngay === null ? 1 : ngay),
    hienThi: ngay === null ? hai(thang) + '/' + nam : hai(ngay) + '/' + hai(thang) + '/' + nam,
  };
}

// Chuan hoa ngay DAY DU (bat buoc co ngay). Tra ve 'yyyy-mm-dd' hoac null neu rong.
export function chuanHoaNgayDu(giaTri) {
  const kq = chuanHoaNgayThieu(giaTri);
  if (kq === null) {
    return null;
  }
  if (kq.ngay === null) {
    throw new Error('Cần ngày đầy đủ dd/mm/yyyy, không chỉ tháng/năm');
  }
  return kq.chuan;
}

// Doi ket qua cua chuanHoaNgayThieu thanh 4 cot SQL: <goc>_nam, <goc>_thang, <goc>_ngay, <goc>_chuan.
export function cotNgayThieu(goc, ngay) {
  return {
    [goc + '_nam']: ngay ? ngay.nam : null,
    [goc + '_thang']: ngay ? ngay.thang : null,
    [goc + '_ngay']: ngay ? ngay.ngay : null,
    [goc + '_chuan']: ngay ? ngay.chuan : null,
  };
}

// Doi 3 cot SQL ve chuoi hien thi: 'dd/mm/yyyy' hoac 'mm/yyyy' (hoac '' neu rong).
export function hienThiNgayThieu(nam, thang, ngay) {
  if (!nam || !thang) {
    return '';
  }
  return ngay ? hai(ngay) + '/' + hai(thang) + '/' + nam : hai(thang) + '/' + nam;
}

// Ngay duong lich theo GIO DIA PHUONG cua may (khong phai gio UTC), dang 'yyyy-mm-dd'.
// Luu y: KHONG dung date.toISOString().slice(0, 10) de lay "hom nay": o Viet Nam (UTC+7) tu 0h den 7h sang
// ham do se tra ve ngay HOM QUA. Moi cho can "hom nay" (trang thai, nghi huu, canh bao) phai dung ham nay.
export function ngayDuongLich(ngay = new Date()) {
  return ngay.getFullYear() + '-' + hai(ngay.getMonth() + 1) + '-' + hai(ngay.getDate());
}
