// shared/bieu-mau.js: doi qua lai giua "dong CSDL" (cac cot SQL) va "bieu mau" (gia tri nhu nguoi dung nhap),
// dua tren bang khai bao truong-muc.js. May chu dung de kiem tra va ghi; giao dien dung de nap vao form va kiem tra som.
//   dongSangBieuMau(bang, dong)  -> { truong: giaTriDeHienTrongOForm }
//   bieuMauSangCot(bang, form)   -> { cot: {cot_sql: giaTri}, loi: {truong: thongBao} }
import { GIA_TRI_LUA_CHON, TRUONG } from './truong-muc.js';
import { boDau, chuanHoaNgayDu, chuanHoaNgayThieu, cotNgayThieu, hienThiNgayThieu, laSauHomNay } from './ngay-chuoi.js';

const TRUONG_THEO_BANG = {};
for (const t of TRUONG) {
  if (!TRUONG_THEO_BANG[t.bang]) {
    TRUONG_THEO_BANG[t.bang] = [];
  }
  TRUONG_THEO_BANG[t.bang].push(t);
}

export function truongCuaBang(bang) {
  const ds = TRUONG_THEO_BANG[bang];
  if (!ds) {
    throw new Error('Khong co bang: ' + bang);
  }
  return ds;
}

const SO_NGUYEN = new Set(['nam_tot_nghiep_pho_thong']);

// Moi ngay trong ho so la su viec DA XAY RA nen khong duoc o tuong lai (sau hom nay), tru cac truong sau:
// - "Den thang/nam" cua dao tao: khoa hoc dang hoc co the du kien ket thuc sau nay.
// Trang thai hang ngay co quy tac rieng (xem mo-dun trang-thai).
export const CHO_PHEP_NGAY_TUONG_LAI = new Set(['dao_tao.den_thang_nam']);
const DO_DAI_TOI_DA = 500;

export function ngayDuSangHienThi(iso) {
  if (!iso) {
    return '';
  }
  const [nam, thang, ngay] = iso.split('-');
  return ngay + '/' + thang + '/' + nam;
}

// Dong CSDL -> gia tri de dua vao o nhap. Gia tri rong la '' (hoac false voi co_khong).
export function dongSangBieuMau(bang, dong) {
  const ketQua = {};
  for (const t of truongCuaBang(bang)) {
    switch (t.kieu) {
      case 'chu': {
        const v = dong[t.cot[0]];
        ketQua[t.truong] = v === null || v === undefined ? '' : String(v);
        break;
      }
      case 'so': {
        const v = dong[t.cot[0]];
        ketQua[t.truong] = v === null || v === undefined ? '' : String(v).replace('.', ',');
        break;
      }
      case 'ngay_du':
        ketQua[t.truong] = ngayDuSangHienThi(dong[t.cot[0]]);
        break;
      case 'ngay_thieu': {
        const goc = t.goc || t.truong;
        ketQua[t.truong] = hienThiNgayThieu(dong[goc + '_nam'], dong[goc + '_thang'], dong[goc + '_ngay']);
        break;
      }
      case 'lua_chon': {
        const v = dong[t.cot[0]];
        ketQua[t.truong] = v === null || v === undefined ? '' : v;
        break;
      }
      case 'co_khong':
        ketQua[t.truong] = dong[t.cot[0]] === 1 || dong[t.cot[0]] === true;
        break;
      default:
        throw new Error('Kieu truong la: ' + t.kieu);
    }
  }
  return ketQua;
}

// Nem loi neu ngay o tuong lai (tru cac truong duoc phep).
function kiemTraTuongLai(t, ngay, homNay) {
  if (!ngay || !homNay || CHO_PHEP_NGAY_TUONG_LAI.has(t.bang + '.' + t.truong)) {
    return;
  }
  if (laSauHomNay(ngay, homNay)) {
    throw new Error('Ngày ' + ngay.hienThi + ' chưa đến (sau hôm nay ' + ngayDuSangHienThi(homNay) + '). Chỉ nhập sự việc đã xảy ra');
  }
}

// Bieu mau -> cac cot SQL. Khong nem loi: loi dua vao "loi" theo ten truong. Chi kiem tra dinh dang va
// bat buoc; viec "gia tri co nam trong danh muc khong" do may chu kiem tra them.
export function bieuMauSangCot(bang, bieuMau, tuyChon = {}) {
  const homNay = tuyChon.homNay || null; // 'yyyy-mm-dd'; khong co thi KHONG kiem tra ngay tuong lai
  const cot = {};
  const loi = {};
  for (const t of truongCuaBang(bang)) {
    const tho = bieuMau[t.truong];
    const rong = tho === undefined || tho === null || (typeof tho === 'string' && tho.trim() === '');
    try {
      switch (t.kieu) {
        case 'chu': {
          const v = rong ? null : String(tho).trim();
          if (v !== null && v.length > DO_DAI_TOI_DA) {
            throw new Error('Tối đa ' + DO_DAI_TOI_DA + ' ký tự');
          }
          cot[t.cot[0]] = v;
          break;
        }
        case 'so': {
          let v = null;
          if (!rong) {
            v = typeof tho === 'number' ? tho : Number(String(tho).replace(/\s/g, '').replace(',', '.'));
            if (!Number.isFinite(v)) {
              throw new Error('Phải là số');
            }
            if (SO_NGUYEN.has(t.truong) && (!Number.isInteger(v) || v < 1900 || v > 2200)) {
              throw new Error('Phải là năm hợp lệ (1900–2200)');
            }
            if (SO_NGUYEN.has(t.truong) && homNay && v > Number(homNay.slice(0, 4))) {
              throw new Error('Năm ' + v + ' chưa đến (sau hôm nay)');
            }
          }
          cot[t.cot[0]] = v;
          break;
        }
        case 'ngay_du': {
          const ngay = rong ? null : chuanHoaNgayThieu(String(tho).trim());
          if (ngay && ngay.ngay === null) {
            throw new Error('Cần ngày đầy đủ dd/mm/yyyy, không chỉ tháng/năm');
          }
          kiemTraTuongLai(t, ngay, homNay);
          cot[t.cot[0]] = ngay ? ngay.chuan : null;
          break;
        }
        case 'ngay_thieu': {
          const ngay = rong ? null : chuanHoaNgayThieu(typeof tho === 'string' ? tho.trim() : tho);
          kiemTraTuongLai(t, ngay, homNay);
          Object.assign(cot, cotNgayThieu(t.goc || t.truong, ngay));
          break;
        }
        case 'lua_chon': {
          let v = null;
          if (!rong) {
            if (t.danhMuc) {
              v = Number(tho);
              if (!Number.isInteger(v) || v < 1) {
                throw new Error('Giá trị không hợp lệ');
              }
            } else {
              v = String(tho);
              const hopLe = GIA_TRI_LUA_CHON[t.bang + '.' + t.truong];
              if (!hopLe || !hopLe.some((g) => g.ma === v)) {
                throw new Error('Giá trị không hợp lệ');
              }
            }
          }
          cot[t.cot[0]] = v;
          break;
        }
        case 'co_khong':
          cot[t.cot[0]] = tho === true || tho === 1 || tho === 'true' ? 1 : 0;
          break;
        default:
          throw new Error('Kieu truong la: ' + t.kieu);
      }
      if (t.batBuoc && t.kieu !== 'co_khong') {
        const giaTriChinh = t.kieu === 'ngay_thieu' ? cot[(t.goc || t.truong) + '_nam'] : cot[t.cot[0]];
        if (giaTriChinh === null || giaTriChinh === undefined) {
          throw new Error('Bắt buộc nhập');
        }
      }
    } catch (e) {
      loi[t.truong] = e.message;
    }
  }
  return { cot, loi };
}

// Gia tri cot tim_kiem cua quan_nhan: ten + ten goi khac + ma + so dien thoai, bo dau.
export function taoTimKiem(cot) {
  return boDau([cot.ho_ten_khai_sinh || '', cot.ten_goi_khac || '', cot.ma_quan_nhan || '', cot.so_dien_thoai || ''].join(' '));
}
