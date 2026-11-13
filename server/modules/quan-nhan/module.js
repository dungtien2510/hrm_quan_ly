'use strict';
// Mo-dun "quan-nhan": ho so quan nhan. Khai bao 12 muc quyen, bo loc, bao cao, dinh dang xuat.
// O Buoc 4 co API xem mot ho so (de kiem tra phan quyen); Buoc 5 them danh sach, them, sua, trang thai.
const path = require('path');
const { MUC } = require('../../../shared/truong-muc.js');
const { dangKyHoSo } = require('./ho-so');

const B = (id, nhan, muc) => ({ id, nhan, truong: id, muc });

module.exports = {
  ten: 'quan-nhan',
  migrations: path.join(__dirname, 'migrations'),
  dangKyRoute(router, boiCanh) {
    dangKyHoSo(router, boiCanh);
  },

  // 12 muc quyen (5 muc nhay cam) lay tu bang khai bao dung chung shared/truong-muc.js
  muc: MUC.map((m) => ({ ma: m.ma, nhan: m.nhan, nhayCam: m.nhayCam })),

  // Bo loc: moi bo loc gan voi muc chua truong duoc loc (mac dinh dung duoc khi co quyen xem muc do).
  boLoc: [
    B('don_vi', 'Đơn vị', 'thong_tin_co_ban'),
    B('quan_ham', 'Quân hàm', 'thong_tin_co_ban'),
    B('chuc_vu', 'Chức vụ', 'thong_tin_co_ban'),
    B('gioi_tinh', 'Giới tính', 'thong_tin_co_ban'),
    B('do_tuoi', 'Độ tuổi', 'thong_tin_co_ban'),
    B('sap_nghi_huu', 'Sắp đến tuổi nghỉ hưu', 'thong_tin_co_ban'),
    B('trang_thai', 'Trạng thái', 'trang_thai'),
    B('co_gia_dinh', 'Có vợ/chồng', 'than_nhan'),
    B('co_con', 'Có con', 'than_nhan'),
    B('con_duoi_n_tuoi', 'Con dưới N tuổi', 'than_nhan'),
    B('nam_sinh_con', 'Năm sinh con', 'than_nhan'),
    B('la_dang_vien', 'Là đảng viên', 'dac_diem_chinh_tri'),
    B('hinh_thuc_khen_thuong', 'Hình thức khen thưởng', 'khen_thuong'),
    B('nam_ky_luat', 'Năm kỷ luật', 'ky_luat'),
    B('trinh_do', 'Học hàm, học vị', 'dao_tao'),
  ],

  // Bao cao chi chay khi tai khoan duoc cap bao cao do VA co du cac muc no can.
  baoCao: [
    { id: 'con_nho', nhan: 'Quân nhân có con nhỏ', mucCanCo: ['thong_tin_co_ban', 'than_nhan'] },
    { id: 'khen_thuong', nhan: 'Khen thưởng', mucCanCo: ['thong_tin_co_ban', 'khen_thuong'] },
    { id: 'ky_luat', nhan: 'Kỷ luật', mucCanCo: ['thong_tin_co_ban', 'ky_luat'] },
    { id: 'di_phep', nhan: 'Đi phép', mucCanCo: ['thong_tin_co_ban', 'trang_thai'] },
    { id: 'syll', nhan: 'Sơ yếu lý lịch quân nhân (mẫu SYLL-2c/TC-2026)', mucCanCo: MUC.map((m) => m.ma) },
    { id: 'danh_sach_tuy_chon', nhan: 'Danh sách tùy chọn cột', mucCanCo: [] },
  ],

  xuat: [
    { id: 'xlsx', nhan: 'Excel (.xlsx)' },
    { id: 'docx', nhan: 'Word (.docx)' },
    { id: 'pdf', nhan: 'PDF' },
  ],

  menu: [],
};
