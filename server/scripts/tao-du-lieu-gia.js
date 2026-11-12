'use strict';
// tao-du-lieu-gia.js: tao 100 ho so quan nhan GIA (ma GIA.001 ... GIA.100) de thu phan mem.
// Chay:  node server/scripts/tao-du-lieu-gia.js             tao du lieu gia (neu chua co)
//        node server/scripts/tao-du-lieu-gia.js --lam-lai   xoa du lieu gia cu roi tao lai
//        node server/scripts/tao-du-lieu-gia.js --xoa       chi xoa du lieu gia
// An toan: khong chay neu trong co so du lieu da co ho so THAT (ma khong bat dau bang GIA.).
// Du lieu sinh ngau nhien nhung co hat giong co dinh nen lan nao cung ra cung mot bo (tinh theo ngay chay).
const os = require('os');
const path = require('path');
const { docEnv, layCauHinh } = require('../loi/doc-env');
const { napMoDun } = require('../loi/nap-mo-dun');
const { moCsdl, chayMigrations, nguonMigration } = require('../loi/csdl');
const { boDau, cotNgayThieu } = require('../../shared/ngay-chuoi.js');
const { TRUONG, COT_KY_THUAT } = require('../../shared/truong-muc.js');

// ---- Danh sach cot hop le (ten bang/cot khong the dung dau ? nen chi cho phep ten nam trong bang khai bao) ----
const COT_HOP_LE = {};
for (const t of TRUONG) {
  if (!COT_HOP_LE[t.bang]) {
    COT_HOP_LE[t.bang] = new Set();
  }
  for (const c of t.cot) {
    COT_HOP_LE[t.bang].add(c);
  }
}

function chen(db, bang, dong) {
  const hopLe = COT_HOP_LE[bang];
  if (!hopLe) {
    throw new Error('Bang khong co trong truong-muc: ' + bang);
  }
  const cot = Object.keys(dong);
  for (const c of cot) {
    if (!hopLe.has(c) && !COT_KY_THUAT.includes(c)) {
      throw new Error('Cot khong hop le: ' + bang + '.' + c);
    }
  }
  const sql = 'INSERT INTO ' + bang + ' (' + cot.join(', ') + ') VALUES (' + cot.map(() => '?').join(', ') + ')';
  return db.prepare(sql).run(...cot.map((c) => dong[c])).lastInsertRowid;
}

// ---- Bo sinh so ngau nhien co hat giong (mulberry32) ----
function taoRng(hatGiong) {
  let a = hatGiong >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---- Ngay thang ----
const hai = (so) => String(so).padStart(2, '0');
const MOT_NGAY = 86400000;
const iso = (d) => d.toISOString().slice(0, 10);
const congNgay = (d, n) => new Date(d.getTime() + n * MOT_NGAY);
const ngayUTC = (nam, thang, ngay) => new Date(Date.UTC(nam, thang - 1, ngay));
function ngayThieu(nam, thang, ngay) {
  return { nam, thang, ngay: ngay === null || ngay === undefined ? null : ngay, chuan: nam + '-' + hai(thang) + '-' + hai(ngay || 1) };
}
function thangTruoc(nam, thang) {
  return thang === 1 ? { nam: nam - 1, thang: 12 } : { nam, thang: thang - 1 };
}

// ---- Danh muc mau ----
const DON_VI = [
  ['gia_sd', 'Sư đoàn mẫu', null],
  ['gia_e1', 'Trung đoàn mẫu 1', 'gia_sd'],
  ['gia_e2', 'Trung đoàn mẫu 2', 'gia_sd'],
  ['gia_d1', 'Tiểu đoàn mẫu 1', 'gia_e1'],
  ['gia_d2', 'Tiểu đoàn mẫu 2', 'gia_e1'],
  ['gia_d3', 'Tiểu đoàn mẫu 3', 'gia_e2'],
  ['gia_d4', 'Tiểu đoàn mẫu 4', 'gia_e2'],
  ['gia_c1', 'Đại đội mẫu 1', 'gia_d1'],
  ['gia_c2', 'Đại đội mẫu 2', 'gia_d1'],
  ['gia_c3', 'Đại đội mẫu 3', 'gia_d2'],
  ['gia_c4', 'Đại đội mẫu 4', 'gia_d2'],
  ['gia_c5', 'Đại đội mẫu 5', 'gia_d3'],
  ['gia_c6', 'Đại đội mẫu 6', 'gia_d3'],
  ['gia_c7', 'Đại đội mẫu 7', 'gia_d4'],
  ['gia_c8', 'Đại đội mẫu 8', 'gia_d4'],
];
const DON_VI_LA = DON_VI.filter((d) => d[0].startsWith('gia_c')).map((d) => d[0]);
const QUAN_HAM = [
  ['binh_nhi', 'Binh nhì'], ['binh_nhat', 'Binh nhất'], ['ha_si', 'Hạ sĩ'], ['trung_si', 'Trung sĩ'], ['thuong_si', 'Thượng sĩ'],
  ['thieu_uy', 'Thiếu úy'], ['trung_uy', 'Trung úy'], ['thuong_uy', 'Thượng úy'], ['dai_uy', 'Đại úy'],
  ['thieu_ta', 'Thiếu tá'], ['trung_ta', 'Trung tá'], ['thuong_ta', 'Thượng tá'],
];
const CHUC_VU = [
  ['chien_si', 'Chiến sĩ'], ['tieu_doi_truong', 'Tiểu đội trưởng'], ['trung_doi_truong', 'Trung đội trưởng'],
  ['pho_dai_doi_truong', 'Phó đại đội trưởng'], ['dai_doi_truong', 'Đại đội trưởng'], ['tro_ly', 'Trợ lý'],
  ['pho_tieu_doan_truong', 'Phó tiểu đoàn trưởng'], ['tieu_doan_truong', 'Tiểu đoàn trưởng'],
];
const CHUC_VU_THEO_QUAN_HAM = {
  binh_nhi: ['chien_si'], binh_nhat: ['chien_si'], ha_si: ['chien_si'], trung_si: ['tieu_doi_truong'], thuong_si: ['tieu_doi_truong'],
  thieu_uy: ['trung_doi_truong'], trung_uy: ['trung_doi_truong'], thuong_uy: ['pho_dai_doi_truong'], dai_uy: ['dai_doi_truong', 'tro_ly'],
  thieu_ta: ['pho_tieu_doan_truong'], trung_ta: ['tieu_doan_truong'], thuong_ta: ['tieu_doan_truong'],
};
const QUAN_HAM_THEO_TUOI = [
  [22, ['binh_nhi', 'binh_nhat', 'ha_si']],
  [27, ['ha_si', 'trung_si', 'thuong_si', 'thieu_uy', 'trung_uy']],
  [35, ['thuong_si', 'thieu_uy', 'trung_uy', 'thuong_uy', 'dai_uy']],
  [200, ['thuong_uy', 'dai_uy', 'thieu_ta', 'trung_ta', 'thuong_ta']],
];
const DANH_MUC_KHAC = [
  ['dan_toc', [['kinh', 'Kinh'], ['tay', 'Tày'], ['thai', 'Thái'], ['muong', 'Mường'], ['nung', 'Nùng'], ['hoa', 'Hoa']]],
  ['ton_giao', [['khong', 'Không'], ['phat_giao', 'Phật giáo'], ['cong_giao', 'Công giáo']]],
  ['doi_tuong_chinh_sach', [['doi_tuong_mau_a', 'Đối tượng chính sách mẫu A'], ['doi_tuong_mau_b', 'Đối tượng chính sách mẫu B']]],
  ['hoc_ham_hoc_vi', [['trung_cap', 'Trung cấp'], ['cao_dang', 'Cao đẳng'], ['cu_nhan', 'Cử nhân'], ['ky_su', 'Kỹ sư'], ['thac_si', 'Thạc sĩ']]],
  ['hinh_thuc_dao_tao', [['chinh_quy', 'Chính quy'], ['tai_chuc', 'Tại chức'], ['tu_xa', 'Từ xa']]],
  ['hinh_thuc_khen_thuong', [['giay_khen', 'Giấy khen'], ['bang_khen', 'Bằng khen'], ['chien_si_thi_dua', 'Chiến sĩ thi đua'], ['chien_si_tien_tien', 'Chiến sĩ tiên tiến']]],
];

const HO = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Vũ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương'];
const DEM_NAM = ['Văn', 'Đức', 'Minh', 'Quang', 'Hữu', 'Thanh', 'Xuân', 'Ngọc', 'Công', 'Đình'];
const DEM_NU = ['Thị', 'Ngọc', 'Thu', 'Hồng', 'Mai', 'Thanh'];
const TEN_NAM = ['An', 'Bình', 'Cường', 'Dũng', 'Hải', 'Hùng', 'Khánh', 'Long', 'Nam', 'Phong', 'Quân', 'Sơn', 'Thắng', 'Trung', 'Tuấn', 'Việt', 'Đạt', 'Hiếu', 'Kiên', 'Lâm'];
const TEN_NU = ['Anh', 'Chi', 'Dung', 'Giang', 'Hà', 'Hạnh', 'Lan', 'Linh', 'Ngân', 'Phương', 'Thảo', 'Trang', 'Vy', 'Yến'];
const XA = ['Thành Long', 'Hòa Bình', 'Tân Phú', 'Phú Lộc', 'Đông Hưng', 'Vĩnh An', 'Bình Minh', 'Tam Thanh'];
const TINH = ['Nghệ An', 'Thanh Hóa', 'Hà Tĩnh', 'Quảng Bình', 'Thái Bình', 'Nam Định', 'Đà Nẵng', 'Phú Thọ', 'Bắc Giang'];
const NGHE = ['Làm ruộng', 'Hưu trí', 'Buôn bán', 'Công nhân', 'Giáo viên', 'Tự do'];
const THAI_DO = 'Chấp hành nghiêm đường lối, chính sách của Đảng, pháp luật Nhà nước.';

function taoBoChon(rng) {
  return {
    ngauNhien: rng,
    so: (min, max) => min + Math.floor(rng() * (max - min + 1)),
    chon: (mang) => mang[Math.floor(rng() * mang.length)],
    xacSuat: (p) => rng() < p,
    tron(mang) {
      const ban = mang.slice();
      for (let i = ban.length - 1; i > 0; i -= 1) {
        const j = Math.floor(rng() * (i + 1));
        [ban[i], ban[j]] = [ban[j], ban[i]];
      }
      return ban;
    },
  };
}

function xoaDuLieuGia(db) {
  return db.transaction(() => {
    const soHoSo = db.prepare("DELETE FROM quan_nhan WHERE ma_quan_nhan LIKE 'GIA.%'").run().changes;
    db.prepare("DELETE FROM danh_muc WHERE loai = 'don_vi' AND ma LIKE 'gia\\_%' ESCAPE '\\'").run();
    return soHoSo;
  })();
}

function taoDanhMucMau(db) {
  const chenDm = db.prepare('INSERT OR IGNORE INTO danh_muc (loai, ma, ten, thu_tu, cha_id) VALUES (?, ?, ?, ?, ?)');
  const layId = db.prepare('SELECT id FROM danh_muc WHERE loai = ? AND ma = ?');
  DON_VI.forEach(([ma, ten, cha], i) => {
    chenDm.run('don_vi', ma, ten, i + 1, cha ? layId.get('don_vi', cha).id : null);
  });
  QUAN_HAM.forEach(([ma, ten], i) => chenDm.run('quan_ham', ma, ten, i + 1, null));
  CHUC_VU.forEach(([ma, ten], i) => chenDm.run('chuc_vu', ma, ten, i + 1, null));
  for (const [loai, ds] of DANH_MUC_KHAC) {
    ds.forEach(([ma, ten], i) => chenDm.run(loai, ma, ten, i + 1, null));
  }
  const dm = {};
  for (const dong of db.prepare('SELECT id, loai, ma, ten FROM danh_muc').all()) {
    dm[dong.loai + ':' + dong.ma] = dong;
  }
  return dm;
}

function taoDuLieuGia(db, tuyChon = {}) {
  const homNay = tuyChon.homNay || new Date();
  const soLuong = tuyChon.soLuong || 100;
  const { ngauNhien, so, chon, xacSuat, tron } = taoBoChon(taoRng(tuyChon.hatGiong || 20261111));

  const soThat = db.prepare("SELECT COUNT(*) AS n FROM quan_nhan WHERE ma_quan_nhan NOT LIKE 'GIA.%'").get().n;
  if (soThat > 0) {
    throw new Error('Co so du lieu da co ' + soThat + ' ho so THAT. Khong tao du lieu gia de tranh tron lan.');
  }
  const soGia = db.prepare("SELECT COUNT(*) AS n FROM quan_nhan WHERE ma_quan_nhan LIKE 'GIA.%'").get().n;
  if (soGia > 0 && !tuyChon.lamLai) {
    return { daCo: soGia, taoMoi: 0 };
  }

  const homNayUTC = ngayUTC(homNay.getFullYear(), homNay.getMonth() + 1, homNay.getDate());
  const namNay = homNay.getFullYear();
  const thangNay = homNay.getMonth() + 1;
  const ngayNay = homNay.getDate();
  let demCanCuoc = 0;
  const soGiaMa = (tien) => tien + String(++demCanCuoc).padStart(8, '0'); // bat dau bang 9: khong trung can cuoc that

  return db.transaction(() => {
    if (soGia > 0) {
      xoaDuLieuGia(db);
    }
    const dm = taoDanhMucMau(db);
    const id = (loai, ma) => dm[loai + ':' + ma].id;
    const ten = (loai, ma) => dm[loai + ':' + ma].ten;
    const dsHoSo = [];

    function diaChiGia() {
      return 'Xã ' + chon(XA) + ', tỉnh ' + chon(TINH) + ' (dữ liệu giả)';
    }
    function hoTen(ho, nu) {
      return ho + ' ' + chon(nu ? DEM_NU : DEM_NAM) + ' ' + chon(nu ? TEN_NU : TEN_NAM);
    }
    // Ngay sinh than nhan: 70% day du, 30% chi co thang/nam
    function ngaySinhGia(nam) {
      const thang = so(1, 12);
      return ngayThieu(nam, thang, xacSuat(0.7) ? so(1, 28) : null);
    }

    for (let i = 1; i <= soLuong; i += 1) {
      const nu = xacSuat(0.12);
      const tuoi = 19 + Math.floor(Math.pow(ngauNhien(), 1.4) * 30); // 19 den 48 tuoi, nghieng ve nguoi tre
      const namSinh = namNay - tuoi;
      const ngaySinh = ngayUTC(namSinh, so(1, 12), so(1, 28));
      const ho = chon(HO);
      const maQN = 'GIA.' + String(i).padStart(3, '0');
      const hoTenQN = hoTen(ho, nu);

      const nhomHam = QUAN_HAM_THEO_TUOI.find((x) => tuoi < x[0])[1];
      const maHam = chon(nhomHam);
      const maChucVu = chon(CHUC_VU_THEO_QUAN_HAM[maHam]);
      const maDonVi = chon(DON_VI_LA);
      const chiSoHam = QUAN_HAM.findIndex((x) => x[0] === maHam);
      const laSiQuan = chiSoHam >= 5;

      const namNhapNgu = Math.min(namSinh + so(18, 20), namNay - 1);
      const thangNhapNgu = so(1, 12);
      const ngayNhapNgu = xacSuat(0.5) ? so(1, 28) : null;
      const nhapNgu = ngayThieu(namNhapNgu, thangNhapNgu, ngayNhapNgu);

      // Dang vien (mot so ngay chi co thang/nam)
      const laDangVien = tuoi >= 22 && xacSuat(0.45);
      let vaoDang = null;
      let chinhThuc = null;
      if (laDangVien) {
        const namVao = namNhapNgu + so(1, Math.max(1, namNay - 1 - namNhapNgu));
        const thangVao = so(1, 12);
        const ngayVao = xacSuat(0.7) ? so(1, 28) : null;
        vaoDang = ngayThieu(namVao, thangVao, ngayVao);
        if (namVao <= namNay - 2) {
          chinhThuc = ngayThieu(namVao + 1, thangVao, ngayVao);
        }
      }

      // Luong: 1 den 3 dong, dong cuoi dang huong
      const soDongLuong = Math.max(1, Math.min(3, Math.floor((namNay - namNhapNgu) / 3)));
      const heSoCoBan = Math.round((1.5 + chiSoHam * 0.4 + so(0, 30) / 100) * 100) / 100;
      const dongLuong = [];
      let tuNam = namNay - 1;
      const tuThang = so(1, 12);
      let denHan = null;
      for (let k = soDongLuong - 1; k >= 0; k -= 1) {
        dongLuong.unshift({
          tu: ngayThieu(tuNam, tuThang, null),
          den: denHan,
          bac: 'Bậc ' + (k + 1 + chiSoHam),
          heSo: Math.round((heSoCoBan - 0.3 * (soDongLuong - 1 - k)) * 10) / 10,
        });
        denHan = ngayThieu(thangTruoc(tuNam, tuThang).nam, thangTruoc(tuNam, tuThang).thang, null);
        tuNam -= 2;
      }
      const luongCuoi = dongLuong[dongLuong.length - 1];

      // Hoc vi
      const coBang = tuoi >= 22 && xacSuat(0.7);
      const maHocVi = coBang ? chon(['cao_dang', 'cu_nhan', 'cu_nhan', 'ky_su', 'thac_si']) : null;

      const soDienThoai = '0900' + String(100000 + i * 37).slice(0, 6);
      const quanNhan = {
        ma_quan_nhan: maQN,
        ho_ten_khai_sinh: hoTenQN.toUpperCase(),
        ten_goi_khac: xacSuat(0.05) ? hoTen(ho, nu) : null,
        ngay_sinh: iso(ngaySinh),
        gioi_tinh: nu ? 'nu' : 'nam',
        dan_toc_id: id('dan_toc', xacSuat(0.8) ? 'kinh' : chon(['tay', 'thai', 'muong', 'nung', 'hoa'])),
        noi_dang_ky_khai_sinh: diaChiGia(),
        que_quan: diaChiGia(),
        don_vi_id: id('don_vi', maDonVi),
        quan_ham_id: id('quan_ham', maHam),
        chuc_vu_id: id('chuc_vu', maChucVu),
        ...cotNgayThieu('ngay_bo_nhiem_chuc_vu', ngayThieu(Math.max(namNhapNgu, namNay - so(1, 4)), so(1, 12), null)),
        quan_ham_chuc_vu_cao_nhat: ten('quan_ham', maHam) + ', ' + ten('chuc_vu', maChucVu),
        noi_thuong_tru: diaChiGia(),
        noi_o_hien_nay: diaChiGia(),
        so_dien_thoai: soDienThoai,
        ton_giao_id: id('ton_giao', xacSuat(0.85) ? 'khong' : chon(['phat_giao', 'cong_giao'])),
        la_dang_vien: laDangVien ? 1 : 0,
        ...cotNgayThieu('ngay_vao_dang', vaoDang),
        ...cotNgayThieu('ngay_chinh_thuc', chinhThuc),
        doi_tuong_chinh_sach_id: xacSuat(0.08) ? id('doi_tuong_chinh_sach', chon(['doi_tuong_mau_a', 'doi_tuong_mau_b'])) : null,
        co_yeu_to_nuoc_ngoai: 0,
        than_nhan_co_yeu_to_nuoc_ngoai: i % 33 === 0 ? 1 : 0,
        so_can_cuoc: soGiaMa('9'),
        ngay_cap_can_cuoc: iso(ngayUTC(namNay - so(2, 5), so(1, 12), so(1, 28))),
        noi_cap_can_cuoc: 'Nơi cấp mẫu (dữ liệu giả)',
        so_bhxh: soGiaMa('8'),
        so_the_bhyt: 'GIA' + String(i).padStart(7, '0'),
        nghe_nghiep_truoc_tuyen_dung: 'Học sinh',
        ...cotNgayThieu('ngay_tuyen_dung_lan_dau', nhapNgu),
        co_quan_tuyen_dung_lan_dau: 'Đơn vị tuyển chọn mẫu',
        ...cotNgayThieu('ngay_vao_co_quan_hien_tai', ngayThieu(Math.max(namNhapNgu, namNay - so(1, 6)), so(1, 12), null)),
        ...cotNgayThieu('ngay_nhap_ngu', nhapNgu),
        ...cotNgayThieu('ngay_bat_dau_tinh_tham_nien', nhapNgu),
        so_truong_cong_tac: chon(['Chỉ huy', 'Hậu cần', 'Kỹ thuật', 'Văn thư']),
        cong_viec_lam_lau_nhat: chon(['Chỉ huy', 'Hậu cần', 'Kỹ thuật', 'Văn thư']),
        trinh_do_pho_thong: '12/12',
        nam_tot_nghiep_pho_thong: namSinh + 18,
        hoc_ham_hoc_vi_cao_nhat_id: maHocVi ? id('hoc_ham_hoc_vi', maHocVi) : null,
        bac_luong: luongCuoi.bac,
        he_so_luong: luongCuoi.heSo,
        ...cotNgayThieu('ngay_huong_luong', luongCuoi.tu),
        phu_cap_chuc_vu: laSiQuan ? Math.round((0.1 + chiSoHam * 0.03) * 100) / 100 : null,
      };
      quanNhan.tim_kiem = boDau([quanNhan.ho_ten_khai_sinh, quanNhan.ten_goi_khac || '', maQN, soDienThoai].join(' '));
      const quanNhanId = chen(db, 'quan_nhan', quanNhan);
      dsHoSo.push({ id: quanNhanId, i, nu, tuoi, namSinh, namNhapNgu, thangNhapNgu, maHam, maChucVu, maDonVi, ho });

      // Truoc tuyen dung
      chen(db, 'qua_trinh_truoc_tuyen_dung', {
        quan_nhan_id: quanNhanId,
        ...cotNgayThieu('tu', ngayThieu(namNhapNgu - 3, 9, null)),
        ...cotNgayThieu('den', ngayThieu(namNhapNgu, 8, null)),
        hoc_tap_lam_gi_o_dau: 'Học sinh, Trường THPT mẫu (dữ liệu giả)',
      });
      // Qua trinh cong tac: 1 den 3 dong lien tiep, dong cuoi dang lam
      const soDongCT = Math.max(1, Math.min(3, Math.floor((namNay - namNhapNgu) / 3)));
      let tuCT = { nam: namNhapNgu, thang: thangNhapNgu };
      for (let k = 0; k < soDongCT; k += 1) {
        const cuoi = k === soDongCT - 1;
        const denCT = cuoi ? null : { nam: tuCT.nam + Math.max(1, Math.floor((namNay - namNhapNgu) / soDongCT)), thang: tuCT.thang };
        chen(db, 'qua_trinh_cong_tac', {
          quan_nhan_id: quanNhanId,
          ...cotNgayThieu('tu', ngayThieu(tuCT.nam, tuCT.thang, null)),
          ...cotNgayThieu('den', denCT ? ngayThieu(denCT.nam, denCT.thang, null) : null),
          chuc_danh_chuc_vu_don_vi: (cuoi ? ten('chuc_vu', maChucVu) : 'Chiến sĩ') + ', ' + ten('don_vi', maDonVi),
        });
        if (denCT) {
          tuCT = denCT;
        }
      }
      // Dao tao
      if (coBang) {
        chen(db, 'dao_tao', {
          quan_nhan_id: quanNhanId,
          ten_truong_co_so: 'Trường mẫu ' + chon(['A', 'B', 'C', 'D']) + ' (dữ liệu giả)',
          nganh_hoc_lop_hoc: chon(['Quản lý', 'Kỹ thuật', 'Chỉ huy', 'Hậu cần']),
          ...cotNgayThieu('tu', ngayThieu(namNhapNgu, 9, null)),
          ...cotNgayThieu('den', ngayThieu(namNhapNgu + 4, 8, null)),
          hinh_thuc_id: id('hinh_thuc_dao_tao', chon(['chinh_quy', 'chinh_quy', 'tai_chuc', 'tu_xa'])),
          van_bang_chung_chi: ten('hoc_ham_hoc_vi', maHocVi),
        });
      } else {
        chen(db, 'dao_tao', {
          quan_nhan_id: quanNhanId,
          ten_truong_co_so: 'Lớp bồi dưỡng mẫu (dữ liệu giả)',
          ...cotNgayThieu('tu', ngayThieu(namNhapNgu, 3, null)),
          ...cotNgayThieu('den', ngayThieu(namNhapNgu, 5, null)),
          hinh_thuc_id: id('hinh_thuc_dao_tao', 'chinh_quy'),
          van_bang_chung_chi: 'Chứng chỉ mẫu',
        });
      }
      // Khen thuong
      if (xacSuat(0.45) && namNay - 1 > namNhapNgu) {
        const soKT = so(1, 2);
        for (let k = 0; k < soKT; k += 1) {
          chen(db, 'khen_thuong', {
            quan_nhan_id: quanNhanId,
            ...cotNgayThieu('thoi_diem', ngayThieu(so(namNhapNgu + 1, namNay - 1), xacSuat(0.6) ? 12 : so(1, 12), xacSuat(0.3) ? so(1, 28) : null)),
            so_quyet_dinh_co_quan: so(10, 300) + '/QĐ-mẫu',
            hinh_thuc_khen_thuong_id: id('hinh_thuc_khen_thuong', chon(['giay_khen', 'giay_khen', 'bang_khen', 'chien_si_thi_dua', 'chien_si_tien_tien'])),
          });
        }
      }
      // Luong
      for (const d of dongLuong) {
        chen(db, 'luong', {
          quan_nhan_id: quanNhanId,
          ...cotNgayThieu('tu', d.tu),
          ...cotNgayThieu('den', d.den),
          bac_luong: d.bac,
          he_so_luong: d.heSo,
        });
      }

      // ---- Than nhan ----
      const dongThanNhan = [];
      function themThanNhan(nhom, quanHe, hoThan, gioiNu, namSinhThan, moRong = {}) {
        const treCon = namNay - namSinhThan < 14;
        dongThanNhan.push({
          quan_nhan_id: quanNhanId,
          nhom,
          quan_he: quanHe,
          ho_ten: hoTen(hoThan, gioiNu),
          gioi_tinh: gioiNu ? 'nu' : 'nam',
          ...cotNgayThieu('ngay_sinh', moRong.ngaySinh || ngaySinhGia(namSinhThan)),
          dan_toc_id: id('dan_toc', 'kinh'),
          quoc_tich: 'Việt Nam',
          que_quan: diaChiGia(),
          noi_thuong_tru: diaChiGia(),
          noi_o_hien_nay: diaChiGia(),
          nghe_nghiep_noi_lam_viec: treCon ? 'Còn nhỏ' : chon(NGHE),
          nam_ket_hon_ly_hon: moRong.namKetHon || null,
          so_can_cuoc: treCon ? null : soGiaMa('9'),
          ton_giao_id: id('ton_giao', 'khong'),
          thai_do_chinh_tri: treCon ? 'Còn nhỏ, sống phụ thuộc gia đình' : THAI_DO,
          lien_quan_che_do_cu: 'Không',
          tien_an: 'Không',
        });
      }
      themThanNhan('ban_than', 'cha', ho, false, namSinh - so(22, 32));
      themThanNhan('ban_than', 'me', chon(HO), true, namSinh - so(20, 30));
      for (let k = so(0, 2); k > 0; k -= 1) {
        const em = xacSuat(0.5);
        themThanNhan('ban_than', 'anh_chi_em', ho, em, namSinh + so(-6, 6));
      }
      let conDuoi6 = 0;
      const daKetHon = tuoi >= 24 && xacSuat(0.55);
      if (daKetHon) {
        const namKetHon = Math.min(namNay - 1, namSinh + so(22, 28));
        const hoVC = chon(HO);
        themThanNhan('ban_than', nu ? 'chong' : 'vo', hoVC, !nu, namSinh + so(-3, 3), { namKetHon: String(namKetHon) });
        themThanNhan('vo_chong', 'cha', hoVC, false, namSinh - so(20, 28));
        themThanNhan('vo_chong', 'me', chon(HO), true, namSinh - so(18, 26));
        for (let k = so(0, 3); k > 0; k -= 1) {
          const namCon = so(namKetHon + 1, namNay);
          const thangCon = namCon === namNay ? so(1, thangNay) : so(1, 12);
          const ngayCon = namCon === namNay && thangCon === thangNay ? so(1, ngayNay) : so(1, 28);
          themThanNhan('ban_than', 'con', ho, xacSuat(0.5), namCon, { ngaySinh: ngayThieu(namCon, thangCon, xacSuat(0.85) ? ngayCon : null) });
          if (namNay - namCon < 6) {
            conDuoi6 += 1;
          }
        }
      }
      for (const dong of dongThanNhan) {
        chen(db, 'than_nhan', dong);
      }
      dsHoSo[dsHoSo.length - 1].conDuoi6 = conDuoi6;
    }

    // ---- Ky luat (con va het hieu luc) va 2 dong tien su (de thu phan quyen theo dong) ----
    const thuTuNgauNhien = tron(dsHoSo.filter((h) => h.tuoi >= 21));
    thuTuNgauNhien.slice(0, 6).forEach((h, k) => {
      const thangCach = so(1, 11);
      const moc = new Date(Date.UTC(namNay, thangNay - 1 - thangCach, 1));
      chen(db, 'ky_luat_tien_an_tien_su', {
        quan_nhan_id: h.id,
        loai: 'ky_luat',
        ...cotNgayThieu('thoi_diem', ngayThieu(moc.getUTCFullYear(), moc.getUTCMonth() + 1, null)),
        so_quyet_dinh_ban_an_co_quan: so(10, 99) + '/QĐ-mẫu',
        hinh_thuc: k % 2 === 0 ? 'Khiển trách' : 'Cảnh cáo',
        hanh_vi_vi_pham: 'Vi phạm mẫu (dữ liệu giả)',
        con_hieu_luc: 1,
      });
    });
    thuTuNgauNhien.slice(6, 12).forEach((h) => {
      chen(db, 'ky_luat_tien_an_tien_su', {
        quan_nhan_id: h.id,
        loai: 'ky_luat',
        ...cotNgayThieu('thoi_diem', ngayThieu(namNay - so(3, 6), so(1, 12), null)),
        so_quyet_dinh_ban_an_co_quan: so(10, 99) + '/QĐ-mẫu',
        hinh_thuc: 'Khiển trách',
        hanh_vi_vi_pham: 'Vi phạm mẫu (dữ liệu giả)',
        con_hieu_luc: 0,
      });
    });
    thuTuNgauNhien.slice(12, 14).forEach((h) => {
      chen(db, 'ky_luat_tien_an_tien_su', {
        quan_nhan_id: h.id,
        loai: 'tien_su',
        ...cotNgayThieu('thoi_diem', ngayThieu(namNay - so(8, 12), so(1, 12), null)),
        so_quyet_dinh_ban_an_co_quan: 'Cơ quan mẫu',
        hinh_thuc: 'Mẫu (dữ liệu giả)',
        hanh_vi_vi_pham: 'Vi phạm hành chính mẫu (dữ liệu giả)',
        con_hieu_luc: 0,
      });
    });

    // ---- Trang thai: du moi loai "hom nay" va cac dong qua khu, khong chong nhau ----
    const trangThai = db.prepare("SELECT id, ma FROM danh_muc WHERE loai = 'trang_thai'").all();
    const idTT = Object.fromEntries(trangThai.map((t) => [t.ma, t.id]));
    const lyDo = { nghi_phep: 'Phép năm', cong_tac: 'Công tác mẫu', benh_vien: 'Điều trị mẫu', benh_xa: 'Khám mẫu', khac: 'Việc khác (mẫu)' };
    const cacNguoi = tron(dsHoSo);
    const KE_HOACH = [['nghi_phep', 8], ['cong_tac', 5], ['benh_vien', 3], ['benh_xa', 4], ['khac', 2]];
    const tuHomNay = new Map();
    let vt = 0;
    for (const [ma, soNguoi] of KE_HOACH) {
      for (let k = 0; k < soNguoi; k += 1) {
        const h = cacNguoi[vt];
        vt += 1;
        const tu = k === 0 ? homNayUTC : congNgay(homNayUTC, -so(0, 6));
        let den = congNgay(homNayUTC, so(1, 14));
        if (k === 1) {
          den = homNayUTC;
        }
        if (k === 2 && (ma === 'cong_tac' || ma === 'benh_xa')) {
          den = null;
        }
        tuHomNay.set(h.id, tu);
        chen(db, 'trang_thai_quan_nhan', {
          quan_nhan_id: h.id,
          trang_thai_id: idTT[ma],
          tu_ngay: iso(tu),
          den_ngay: den ? iso(den) : null,
          ly_do_hoac_noi: lyDo[ma],
        });
      }
    }
    // Dong qua khu cho 20 nguoi (ket thuc truoc dong hom nay it nhat 15 ngay)
    for (const h of cacNguoi.slice(10, 30)) {
      const moc = tuHomNay.get(h.id) || homNayUTC;
      const den = congNgay(moc, -so(15, 120));
      const tu = congNgay(den, -so(1, 10));
      const ma = chon(['nghi_phep', 'nghi_phep', 'cong_tac', 'benh_xa', 'khac']);
      chen(db, 'trang_thai_quan_nhan', {
        quan_nhan_id: h.id,
        trang_thai_id: idTT[ma],
        tu_ngay: iso(tu),
        den_ngay: iso(den),
        ly_do_hoac_noi: lyDo[ma],
      });
    }

    const tong = {
      quanNhan: db.prepare("SELECT COUNT(*) AS n FROM quan_nhan WHERE ma_quan_nhan LIKE 'GIA.%'").get().n,
      thanNhan: db.prepare('SELECT COUNT(*) AS n FROM than_nhan').get().n,
      kyLuat: db.prepare("SELECT COUNT(*) AS n FROM ky_luat_tien_an_tien_su WHERE loai = 'ky_luat'").get().n,
    };
    db.prepare('INSERT INTO nhat_ky (hanh_dong, doi_tuong, chi_tiet, may) VALUES (?, ?, ?, ?)').run(
      'tao_du_lieu_gia', 'quan_nhan', JSON.stringify(tong), os.hostname()
    );
    return { daCo: 0, taoMoi: tong.quanNhan, ...tong };
  })();
}

function thongKe(db, ngay) {
  const homNay = iso(ngay || new Date());
  return {
    quanNhan: db.prepare('SELECT COUNT(*) AS n FROM quan_nhan').get().n,
    dangVien: db.prepare('SELECT COUNT(*) AS n FROM quan_nhan WHERE la_dang_vien = 1').get().n,
    conDuoi6Tuoi: db.prepare("SELECT COUNT(*) AS n FROM than_nhan WHERE quan_he = 'con' AND ngay_sinh_chuan > date(?, '-6 years')").get(homNay).n,
    kyLuatCon: db.prepare("SELECT COUNT(*) AS n FROM ky_luat_tien_an_tien_su WHERE loai = 'ky_luat' AND con_hieu_luc = 1").get().n,
    kyLuatHet: db.prepare("SELECT COUNT(*) AS n FROM ky_luat_tien_an_tien_su WHERE loai = 'ky_luat' AND con_hieu_luc = 0").get().n,
    ngayChiCoThang: db.prepare('SELECT COUNT(*) AS n FROM quan_nhan WHERE ngay_vao_dang_nam IS NOT NULL AND ngay_vao_dang_ngay IS NULL').get().n,
    trangThaiHomNay: db
      .prepare(
        `SELECT d.ten AS ten, COUNT(*) AS n FROM trang_thai_quan_nhan t JOIN danh_muc d ON d.id = t.trang_thai_id
         WHERE t.tu_ngay <= ? AND (t.den_ngay IS NULL OR t.den_ngay >= ?) GROUP BY d.ten ORDER BY d.ten`
      )
      .all(homNay, homNay),
  };
}

function main() {
  const doiSo = process.argv.slice(2);
  const goc = path.resolve(__dirname, '..', '..');
  docEnv(path.join(goc, '.env'));
  const cauHinh = layCauHinh(goc);
  const { dsMoDun } = napMoDun(path.join(goc, 'server', 'modules'));
  const db = moCsdl(cauHinh.duongDanDb);
  try {
    chayMigrations(db, nguonMigration(dsMoDun));
    if (doiSo.includes('--xoa')) {
      console.log('Da xoa ' + xoaDuLieuGia(db) + ' ho so gia.');
      return;
    }
    const kq = taoDuLieuGia(db, { lamLai: doiSo.includes('--lam-lai') });
    if (kq.taoMoi === 0) {
      console.log('Da co ' + kq.daCo + ' ho so gia, khong tao them. Dung --lam-lai de tao lai tu dau.');
    } else {
      console.log('Da tao ' + kq.quanNhan + ' ho so gia, ' + kq.thanNhan + ' than nhan, ' + kq.kyLuat + ' dong ky luat.');
    }
    const tk = thongKe(db);
    console.log('Thong ke: ' + JSON.stringify(tk));
  } finally {
    db.close();
  }
}

if (require.main === module) {
  try {
    main();
  } catch (loi) {
    console.error('[LOI] ' + loi.message);
    process.exit(1);
  }
}

module.exports = { taoDuLieuGia, xoaDuLieuGia, thongKe };
