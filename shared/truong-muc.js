// shared/truong-muc.js: MOT bang khai bao duy nhat "truong -> muc quyen", dung chung cho
// hien thi, tim kiem, loc, xuat (quy tac 2). May chu va giao dien deu doc file nay.
// Moi truong thuoc DUNG MOT muc. "cot" la cac cot SQL that su chua truong do.
// File duoc tao tu bang truong cua Buoc 0 (file Excel buoc0_quan_ly_quan_nhan.xlsx).

// 12 muc quyen; "nhayCam" danh dau 5 muc nhay cam.
export const MUC = [
  { ma: 'thong_tin_co_ban', nhayCam: false },
  { ma: 'lien_he', nhayCam: false },
  { ma: 'than_nhan', nhayCam: false },
  { ma: 'qua_trinh_cong_tac', nhayCam: false },
  { ma: 'dao_tao', nhayCam: false },
  { ma: 'khen_thuong', nhayCam: false },
  { ma: 'trang_thai', nhayCam: false },
  { ma: 'luong', nhayCam: true },
  { ma: 'ky_luat', nhayCam: true },
  { ma: 'tien_an_tien_su', nhayCam: true },
  { ma: 'so_dinh_danh', nhayCam: true },
  { ma: 'dac_diem_chinh_tri', nhayCam: true },
];

// Cac cot ky thuat (khong thuoc truong nao, khong can phan quyen theo muc).
export const COT_KY_THUAT = ['id', 'quan_nhan_id', 'tim_kiem', 'version', 'da_xoa', 'created_at', 'updated_at'];

export const TRUONG = [
  {"bang": "quan_nhan", "truong": "ma_quan_nhan", "hienThi": "Số hiệu quân nhân", "kieu": "chu", "batBuoc": true, "muc": "thong_tin_co_ban", "cot": ["ma_quan_nhan"]},
  {"bang": "quan_nhan", "truong": "ho_ten_khai_sinh", "hienThi": "Họ và tên khai sinh", "kieu": "chu", "batBuoc": true, "muc": "thong_tin_co_ban", "cot": ["ho_ten_khai_sinh"]},
  {"bang": "quan_nhan", "truong": "ten_goi_khac", "hienThi": "Tên gọi khác", "kieu": "chu", "batBuoc": false, "muc": "thong_tin_co_ban", "cot": ["ten_goi_khac"]},
  {"bang": "quan_nhan", "truong": "ngay_sinh", "hienThi": "Ngày, tháng, năm sinh", "kieu": "ngay_du", "batBuoc": true, "muc": "thong_tin_co_ban", "cot": ["ngay_sinh"]},
  {"bang": "quan_nhan", "truong": "gioi_tinh", "hienThi": "Giới tính", "kieu": "lua_chon", "batBuoc": true, "muc": "thong_tin_co_ban", "cot": ["gioi_tinh"], "ghiChu": "Nam / Nữ"},
  {"bang": "quan_nhan", "truong": "dan_toc", "hienThi": "Dân tộc", "kieu": "lua_chon", "batBuoc": false, "muc": "thong_tin_co_ban", "cot": ["dan_toc_id"], "danhMuc": "dan_toc"},
  {"bang": "quan_nhan", "truong": "noi_dang_ky_khai_sinh", "hienThi": "Nơi đăng ký khai sinh (cũ)", "kieu": "chu", "batBuoc": false, "muc": "thong_tin_co_ban", "cot": ["noi_dang_ky_khai_sinh"]},
  {"bang": "quan_nhan", "truong": "noi_dang_ky_khai_sinh_moi", "hienThi": "Nơi đăng ký khai sinh (sau sáp nhập)", "kieu": "chu", "batBuoc": false, "muc": "thong_tin_co_ban", "cot": ["noi_dang_ky_khai_sinh_moi"]},
  {"bang": "quan_nhan", "truong": "que_quan", "hienThi": "Quê quán (cũ)", "kieu": "chu", "batBuoc": true, "muc": "thong_tin_co_ban", "cot": ["que_quan"]},
  {"bang": "quan_nhan", "truong": "que_quan_moi", "hienThi": "Quê quán (sau sáp nhập)", "kieu": "chu", "batBuoc": false, "muc": "thong_tin_co_ban", "cot": ["que_quan_moi"]},
  {"bang": "quan_nhan", "truong": "don_vi", "hienThi": "Đơn vị", "kieu": "lua_chon", "batBuoc": true, "muc": "thong_tin_co_ban", "cot": ["don_vi_id"], "danhMuc": "don_vi", "ghiChu": "Chọn từ Danh_muc, loại don_vi"},
  {"bang": "quan_nhan", "truong": "quan_ham", "hienThi": "Quân hàm hiện tại", "kieu": "lua_chon", "batBuoc": true, "muc": "thong_tin_co_ban", "cot": ["quan_ham_id"], "danhMuc": "quan_ham"},
  {"bang": "quan_nhan", "truong": "chuc_vu", "hienThi": "Chức vụ hiện tại", "kieu": "lua_chon", "batBuoc": false, "muc": "thong_tin_co_ban", "cot": ["chuc_vu_id"], "danhMuc": "chuc_vu"},
  {"bang": "quan_nhan", "truong": "ngay_bo_nhiem_chuc_vu", "hienThi": "Ngày bổ nhiệm chức vụ", "kieu": "ngay_thieu", "batBuoc": false, "muc": "thong_tin_co_ban", "cot": ["ngay_bo_nhiem_chuc_vu_nam", "ngay_bo_nhiem_chuc_vu_thang", "ngay_bo_nhiem_chuc_vu_ngay", "ngay_bo_nhiem_chuc_vu_chuan"]},
  {"bang": "quan_nhan", "truong": "ngay_bo_nhiem_lai", "hienThi": "Ngày bổ nhiệm lại", "kieu": "ngay_thieu", "batBuoc": false, "muc": "thong_tin_co_ban", "cot": ["ngay_bo_nhiem_lai_nam", "ngay_bo_nhiem_lai_thang", "ngay_bo_nhiem_lai_ngay", "ngay_bo_nhiem_lai_chuan"]},
  {"bang": "quan_nhan", "truong": "chuc_vu_kiem_nhiem", "hienThi": "Chức vụ kiêm nhiệm", "kieu": "chu", "batBuoc": false, "muc": "thong_tin_co_ban", "cot": ["chuc_vu_kiem_nhiem"]},
  {"bang": "quan_nhan", "truong": "quan_ham_chuc_vu_cao_nhat", "hienThi": "Quân hàm, chức vụ cao nhất (năm)", "kieu": "chu", "batBuoc": false, "muc": "thong_tin_co_ban", "cot": ["quan_ham_chuc_vu_cao_nhat"]},
  {"bang": "quan_nhan", "truong": "noi_thuong_tru", "hienThi": "Nơi thường trú", "kieu": "chu", "batBuoc": false, "muc": "lien_he", "cot": ["noi_thuong_tru"]},
  {"bang": "quan_nhan", "truong": "noi_o_hien_nay", "hienThi": "Nơi ở hiện nay", "kieu": "chu", "batBuoc": false, "muc": "lien_he", "cot": ["noi_o_hien_nay"]},
  {"bang": "quan_nhan", "truong": "so_dien_thoai", "hienThi": "Số thuê bao di động", "kieu": "chu", "batBuoc": false, "muc": "lien_he", "cot": ["so_dien_thoai"]},
  {"bang": "quan_nhan", "truong": "tai_khoan_zalo", "hienThi": "Zalo", "kieu": "chu", "batBuoc": false, "muc": "lien_he", "cot": ["tai_khoan_zalo"]},
  {"bang": "quan_nhan", "truong": "ton_giao", "hienThi": "Tôn giáo", "kieu": "lua_chon", "batBuoc": false, "muc": "dac_diem_chinh_tri", "cot": ["ton_giao_id"], "danhMuc": "ton_giao", "ghiChu": "Quyết định D1"},
  {"bang": "quan_nhan", "truong": "cap_uy_hien_tai", "hienThi": "Cấp ủy hiện tại", "kieu": "chu", "batBuoc": false, "muc": "dac_diem_chinh_tri", "cot": ["cap_uy_hien_tai"], "ghiChu": "Cần làm rõ (câu hỏi mở)"},
  {"bang": "quan_nhan", "truong": "cap_uy_kiem_nhiem", "hienThi": "Cấp ủy kiêm nhiệm", "kieu": "chu", "batBuoc": false, "muc": "dac_diem_chinh_tri", "cot": ["cap_uy_kiem_nhiem"]},
  {"bang": "quan_nhan", "truong": "la_dang_vien", "hienThi": "Là đảng viên", "kieu": "co_khong", "batBuoc": true, "muc": "dac_diem_chinh_tri", "cot": ["la_dang_vien"]},
  {"bang": "quan_nhan", "truong": "ngay_vao_dang", "hienThi": "Ngày vào Đảng", "kieu": "ngay_thieu", "batBuoc": false, "muc": "dac_diem_chinh_tri", "cot": ["ngay_vao_dang_nam", "ngay_vao_dang_thang", "ngay_vao_dang_ngay", "ngay_vao_dang_chuan"]},
  {"bang": "quan_nhan", "truong": "ngay_chinh_thuc", "hienThi": "Ngày chính thức", "kieu": "ngay_thieu", "batBuoc": false, "muc": "dac_diem_chinh_tri", "cot": ["ngay_chinh_thuc_nam", "ngay_chinh_thuc_thang", "ngay_chinh_thuc_ngay", "ngay_chinh_thuc_chuan"]},
  {"bang": "quan_nhan", "truong": "doi_tuong_chinh_sach", "hienThi": "Đối tượng chính sách", "kieu": "lua_chon", "batBuoc": false, "muc": "dac_diem_chinh_tri", "cot": ["doi_tuong_chinh_sach_id"], "danhMuc": "doi_tuong_chinh_sach", "ghiChu": "Quyết định D4"},
  {"bang": "quan_nhan", "truong": "co_yeu_to_nuoc_ngoai", "hienThi": "Bản thân có yếu tố nước ngoài", "kieu": "co_khong", "batBuoc": false, "muc": "dac_diem_chinh_tri", "cot": ["co_yeu_to_nuoc_ngoai"]},
  {"bang": "quan_nhan", "truong": "than_nhan_co_yeu_to_nuoc_ngoai", "hienThi": "Thân nhân có yếu tố nước ngoài", "kieu": "co_khong", "batBuoc": false, "muc": "dac_diem_chinh_tri", "cot": ["than_nhan_co_yeu_to_nuoc_ngoai"]},
  {"bang": "quan_nhan", "truong": "ghi_chu_yeu_to_nuoc_ngoai", "hienThi": "Ghi chú yếu tố nước ngoài", "kieu": "chu", "batBuoc": false, "muc": "dac_diem_chinh_tri", "cot": ["ghi_chu_yeu_to_nuoc_ngoai"]},
  {"bang": "quan_nhan", "truong": "so_can_cuoc", "hienThi": "Số căn cước", "kieu": "chu", "batBuoc": false, "muc": "so_dinh_danh", "cot": ["so_can_cuoc"]},
  {"bang": "quan_nhan", "truong": "ngay_cap_can_cuoc", "hienThi": "Ngày cấp căn cước", "kieu": "ngay_du", "batBuoc": false, "muc": "so_dinh_danh", "cot": ["ngay_cap_can_cuoc"]},
  {"bang": "quan_nhan", "truong": "noi_cap_can_cuoc", "hienThi": "Nơi cấp căn cước", "kieu": "chu", "batBuoc": false, "muc": "so_dinh_danh", "cot": ["noi_cap_can_cuoc"]},
  {"bang": "quan_nhan", "truong": "so_bhxh", "hienThi": "Số sổ BHXH", "kieu": "chu", "batBuoc": false, "muc": "so_dinh_danh", "cot": ["so_bhxh"]},
  {"bang": "quan_nhan", "truong": "so_the_bhyt", "hienThi": "Số thẻ BHYT", "kieu": "chu", "batBuoc": false, "muc": "so_dinh_danh", "cot": ["so_the_bhyt"]},
  {"bang": "quan_nhan", "truong": "nghe_nghiep_truoc_tuyen_dung", "hienThi": "Nghề nghiệp trước khi tuyển dụng", "kieu": "chu", "batBuoc": false, "muc": "qua_trinh_cong_tac", "cot": ["nghe_nghiep_truoc_tuyen_dung"]},
  {"bang": "quan_nhan", "truong": "ngay_tuyen_dung_lan_dau", "hienThi": "Ngày được tuyển dụng lần đầu", "kieu": "ngay_thieu", "batBuoc": true, "muc": "qua_trinh_cong_tac", "cot": ["ngay_tuyen_dung_lan_dau_nam", "ngay_tuyen_dung_lan_dau_thang", "ngay_tuyen_dung_lan_dau_ngay", "ngay_tuyen_dung_lan_dau_chuan"], "ghiChu": "Giữ chữ 'tuyển dụng' hay đổi: câu hỏi mở"},
  {"bang": "quan_nhan", "truong": "co_quan_tuyen_dung_lan_dau", "hienThi": "Cơ quan tuyển dụng lần đầu", "kieu": "chu", "batBuoc": false, "muc": "qua_trinh_cong_tac", "cot": ["co_quan_tuyen_dung_lan_dau"]},
  {"bang": "quan_nhan", "truong": "ngay_tuyen_dung_lan_sau", "hienThi": "Ngày được tuyển dụng lần sau", "kieu": "ngay_thieu", "batBuoc": false, "muc": "qua_trinh_cong_tac", "cot": ["ngay_tuyen_dung_lan_sau_nam", "ngay_tuyen_dung_lan_sau_thang", "ngay_tuyen_dung_lan_sau_ngay", "ngay_tuyen_dung_lan_sau_chuan"]},
  {"bang": "quan_nhan", "truong": "co_quan_tuyen_dung_lan_sau", "hienThi": "Cơ quan tuyển dụng lần sau", "kieu": "chu", "batBuoc": false, "muc": "qua_trinh_cong_tac", "cot": ["co_quan_tuyen_dung_lan_sau"]},
  {"bang": "quan_nhan", "truong": "ngay_vao_co_quan_hien_tai", "hienThi": "Ngày vào đơn vị hiện đang công tác", "kieu": "ngay_thieu", "batBuoc": false, "muc": "qua_trinh_cong_tac", "cot": ["ngay_vao_co_quan_hien_tai_nam", "ngay_vao_co_quan_hien_tai_thang", "ngay_vao_co_quan_hien_tai_ngay", "ngay_vao_co_quan_hien_tai_chuan"]},
  {"bang": "quan_nhan", "truong": "ngay_nhap_ngu", "hienThi": "Ngày nhập ngũ", "kieu": "ngay_thieu", "batBuoc": false, "muc": "qua_trinh_cong_tac", "cot": ["ngay_nhap_ngu_nam", "ngay_nhap_ngu_thang", "ngay_nhap_ngu_ngay", "ngay_nhap_ngu_chuan"]},
  {"bang": "quan_nhan", "truong": "ngay_xuat_ngu", "hienThi": "Ngày xuất ngũ", "kieu": "ngay_thieu", "batBuoc": false, "muc": "qua_trinh_cong_tac", "cot": ["ngay_xuat_ngu_nam", "ngay_xuat_ngu_thang", "ngay_xuat_ngu_ngay", "ngay_xuat_ngu_chuan"]},
  {"bang": "quan_nhan", "truong": "ngay_tai_ngu", "hienThi": "Ngày tái ngũ", "kieu": "ngay_thieu", "batBuoc": false, "muc": "qua_trinh_cong_tac", "cot": ["ngay_tai_ngu_nam", "ngay_tai_ngu_thang", "ngay_tai_ngu_ngay", "ngay_tai_ngu_chuan"]},
  {"bang": "quan_nhan", "truong": "ngay_bat_dau_tinh_tham_nien", "hienThi": "Ngày bắt đầu tính thâm niên", "kieu": "ngay_thieu", "batBuoc": false, "muc": "qua_trinh_cong_tac", "cot": ["ngay_bat_dau_tinh_tham_nien_nam", "ngay_bat_dau_tinh_tham_nien_thang", "ngay_bat_dau_tinh_tham_nien_ngay", "ngay_bat_dau_tinh_tham_nien_chuan"], "ghiChu": "Thêm mới, Bước 9 cần (D7)"},
  {"bang": "quan_nhan", "truong": "so_truong_cong_tac", "hienThi": "Sở trường công tác", "kieu": "chu", "batBuoc": false, "muc": "qua_trinh_cong_tac", "cot": ["so_truong_cong_tac"]},
  {"bang": "quan_nhan", "truong": "cong_viec_lam_lau_nhat", "hienThi": "Công việc làm lâu nhất", "kieu": "chu", "batBuoc": false, "muc": "qua_trinh_cong_tac", "cot": ["cong_viec_lam_lau_nhat"]},
  {"bang": "quan_nhan", "truong": "trinh_do_pho_thong", "hienThi": "Giáo dục phổ thông (vd 12/12)", "kieu": "chu", "batBuoc": false, "muc": "dao_tao", "cot": ["trinh_do_pho_thong"]},
  {"bang": "quan_nhan", "truong": "nam_tot_nghiep_pho_thong", "hienThi": "Năm tốt nghiệp phổ thông", "kieu": "so", "batBuoc": false, "muc": "dao_tao", "cot": ["nam_tot_nghiep_pho_thong"]},
  {"bang": "quan_nhan", "truong": "chuyen_mon_nghiep_vu", "hienThi": "Chuyên môn nghiệp vụ", "kieu": "chu", "batBuoc": false, "muc": "dao_tao", "cot": ["chuyen_mon_nghiep_vu"]},
  {"bang": "quan_nhan", "truong": "ly_luan_chinh_tri", "hienThi": "Lý luận chính trị", "kieu": "chu", "batBuoc": false, "muc": "dao_tao", "cot": ["ly_luan_chinh_tri"]},
  {"bang": "quan_nhan", "truong": "hoc_ham_hoc_vi_cao_nhat", "hienThi": "Học hàm, học vị cao nhất", "kieu": "lua_chon", "batBuoc": false, "muc": "dao_tao", "cot": ["hoc_ham_hoc_vi_cao_nhat_id"], "danhMuc": "hoc_ham_hoc_vi"},
  {"bang": "quan_nhan", "truong": "ngoai_ngu", "hienThi": "Ngoại ngữ", "kieu": "chu", "batBuoc": false, "muc": "dao_tao", "cot": ["ngoai_ngu"]},
  {"bang": "quan_nhan", "truong": "tin_hoc", "hienThi": "Tin học", "kieu": "chu", "batBuoc": false, "muc": "dao_tao", "cot": ["tin_hoc"]},
  {"bang": "quan_nhan", "truong": "tieng_dan_toc_thieu_so", "hienThi": "Tiếng dân tộc thiểu số", "kieu": "chu", "batBuoc": false, "muc": "dao_tao", "cot": ["tieng_dan_toc_thieu_so"]},
  {"bang": "quan_nhan", "truong": "quan_ly_nha_nuoc", "hienThi": "Quản lý nhà nước", "kieu": "chu", "batBuoc": false, "muc": "dao_tao", "cot": ["quan_ly_nha_nuoc"]},
  {"bang": "quan_nhan", "truong": "boi_duong_chuc_danh_nghe_nghiep", "hienThi": "Bồi dưỡng chức danh nghề nghiệp", "kieu": "chu", "batBuoc": false, "muc": "dao_tao", "cot": ["boi_duong_chuc_danh_nghe_nghiep"]},
  {"bang": "quan_nhan", "truong": "ngach_chuc_danh", "hienThi": "Ngạch, chức danh nghề nghiệp", "kieu": "chu", "batBuoc": false, "muc": "luong", "cot": ["ngach_chuc_danh"]},
  {"bang": "quan_nhan", "truong": "ma_so_ngach", "hienThi": "Mã số ngạch", "kieu": "chu", "batBuoc": false, "muc": "luong", "cot": ["ma_so_ngach"]},
  {"bang": "quan_nhan", "truong": "bac_luong", "hienThi": "Bậc lương hiện tại", "kieu": "chu", "batBuoc": false, "muc": "luong", "cot": ["bac_luong"]},
  {"bang": "quan_nhan", "truong": "he_so_luong", "hienThi": "Hệ số lương hiện tại", "kieu": "so", "batBuoc": false, "muc": "luong", "cot": ["he_so_luong"], "ghiChu": "Phải khớp dòng lương mới nhất"},
  {"bang": "quan_nhan", "truong": "ngay_huong_luong", "hienThi": "Ngày hưởng", "kieu": "ngay_thieu", "batBuoc": false, "muc": "luong", "cot": ["ngay_huong_luong_nam", "ngay_huong_luong_thang", "ngay_huong_luong_ngay", "ngay_huong_luong_chuan"]},
  {"bang": "quan_nhan", "truong": "phu_cap_chuc_vu", "hienThi": "Phụ cấp chức vụ", "kieu": "so", "batBuoc": false, "muc": "luong", "cot": ["phu_cap_chuc_vu"]},
  {"bang": "quan_nhan", "truong": "phu_cap_kiem_nhiem", "hienThi": "Phụ cấp kiêm nhiệm", "kieu": "so", "batBuoc": false, "muc": "luong", "cot": ["phu_cap_kiem_nhiem"]},
  {"bang": "quan_nhan", "truong": "phu_cap_khac", "hienThi": "Phụ cấp khác", "kieu": "chu", "batBuoc": false, "muc": "luong", "cot": ["phu_cap_khac"]},
  {"bang": "quan_nhan", "truong": "danh_hieu_duoc_phong", "hienThi": "Danh hiệu được phong (tháng, năm)", "kieu": "chu", "batBuoc": false, "muc": "khen_thuong", "cot": ["danh_hieu_duoc_phong"]},
  {"bang": "qua_trinh_truoc_tuyen_dung", "truong": "tu_thang_nam", "hienThi": "Từ tháng, năm", "kieu": "ngay_thieu", "batBuoc": true, "muc": "qua_trinh_cong_tac", "cot": ["tu_nam", "tu_thang", "tu_ngay", "tu_chuan"], "goc": "tu"},
  {"bang": "qua_trinh_truoc_tuyen_dung", "truong": "den_thang_nam", "hienThi": "Đến tháng, năm", "kieu": "ngay_thieu", "batBuoc": true, "muc": "qua_trinh_cong_tac", "cot": ["den_nam", "den_thang", "den_ngay", "den_chuan"], "goc": "den"},
  {"bang": "qua_trinh_truoc_tuyen_dung", "truong": "hoc_tap_lam_gi_o_dau", "hienThi": "Học tập, làm gì, ở đâu", "kieu": "chu", "batBuoc": true, "muc": "qua_trinh_cong_tac", "cot": ["hoc_tap_lam_gi_o_dau"]},
  {"bang": "qua_trinh_cong_tac", "truong": "tu_thang_nam", "hienThi": "Từ tháng, năm", "kieu": "ngay_thieu", "batBuoc": true, "muc": "qua_trinh_cong_tac", "cot": ["tu_nam", "tu_thang", "tu_ngay", "tu_chuan"], "goc": "tu"},
  {"bang": "qua_trinh_cong_tac", "truong": "den_thang_nam", "hienThi": "Đến tháng, năm", "kieu": "ngay_thieu", "batBuoc": false, "muc": "qua_trinh_cong_tac", "cot": ["den_nam", "den_thang", "den_ngay", "den_chuan"], "goc": "den", "ghiChu": "Trống = đến nay"},
  {"bang": "qua_trinh_cong_tac", "truong": "chuc_danh_chuc_vu_don_vi", "hienThi": "Chức danh, chức vụ, đơn vị công tác", "kieu": "chu", "batBuoc": true, "muc": "qua_trinh_cong_tac", "cot": ["chuc_danh_chuc_vu_don_vi"]},
  {"bang": "dao_tao", "truong": "ten_truong_co_so", "hienThi": "Tên trường/cơ sở đào tạo", "kieu": "chu", "batBuoc": true, "muc": "dao_tao", "cot": ["ten_truong_co_so"]},
  {"bang": "dao_tao", "truong": "nganh_hoc_lop_hoc", "hienThi": "Ngành học hoặc tên lớp", "kieu": "chu", "batBuoc": false, "muc": "dao_tao", "cot": ["nganh_hoc_lop_hoc"]},
  {"bang": "dao_tao", "truong": "tu_thang_nam", "hienThi": "Từ tháng, năm", "kieu": "ngay_thieu", "batBuoc": false, "muc": "dao_tao", "cot": ["tu_nam", "tu_thang", "tu_ngay", "tu_chuan"], "goc": "tu"},
  {"bang": "dao_tao", "truong": "den_thang_nam", "hienThi": "Đến tháng, năm", "kieu": "ngay_thieu", "batBuoc": false, "muc": "dao_tao", "cot": ["den_nam", "den_thang", "den_ngay", "den_chuan"], "goc": "den"},
  {"bang": "dao_tao", "truong": "hinh_thuc", "hienThi": "Hình thức đào tạo", "kieu": "lua_chon", "batBuoc": false, "muc": "dao_tao", "cot": ["hinh_thuc_id"], "danhMuc": "hinh_thuc_dao_tao"},
  {"bang": "dao_tao", "truong": "van_bang_chung_chi", "hienThi": "Văn bằng, chứng chỉ, trình độ", "kieu": "chu", "batBuoc": false, "muc": "dao_tao", "cot": ["van_bang_chung_chi"]},
  {"bang": "khen_thuong", "truong": "thang_nam", "hienThi": "Tháng, năm", "kieu": "ngay_thieu", "batBuoc": true, "muc": "khen_thuong", "cot": ["thoi_diem_nam", "thoi_diem_thang", "thoi_diem_ngay", "thoi_diem_chuan"], "goc": "thoi_diem"},
  {"bang": "khen_thuong", "truong": "so_quyet_dinh_co_quan", "hienThi": "Số quyết định, cơ quan", "kieu": "chu", "batBuoc": false, "muc": "khen_thuong", "cot": ["so_quyet_dinh_co_quan"]},
  {"bang": "khen_thuong", "truong": "hinh_thuc_khen_thuong", "hienThi": "Hình thức khen thưởng", "kieu": "lua_chon", "batBuoc": false, "muc": "khen_thuong", "cot": ["hinh_thuc_khen_thuong_id"], "danhMuc": "hinh_thuc_khen_thuong"},
  {"bang": "khen_thuong", "truong": "danh_hieu_thi_dua", "hienThi": "Danh hiệu thi đua", "kieu": "chu", "batBuoc": false, "muc": "khen_thuong", "cot": ["danh_hieu_thi_dua"]},
  {"bang": "ky_luat_tien_an_tien_su", "truong": "loai", "hienThi": "Loại (ky_luat / tien_an / tien_su)", "kieu": "lua_chon", "batBuoc": true, "muc": "ky_luat", "cot": ["loai"], "ghiChu": "Quyền theo dòng: ky_luat cần mục ky_luat; tien_an, tien_su cần mục tien_an_tien_su"},
  {"bang": "ky_luat_tien_an_tien_su", "truong": "thang_nam", "hienThi": "Tháng, năm", "kieu": "ngay_thieu", "batBuoc": false, "muc": "ky_luat", "cot": ["thoi_diem_nam", "thoi_diem_thang", "thoi_diem_ngay", "thoi_diem_chuan"], "goc": "thoi_diem", "ghiChu": "Như trên"},
  {"bang": "ky_luat_tien_an_tien_su", "truong": "so_quyet_dinh_ban_an_co_quan", "hienThi": "Số quyết định, bản án, cơ quan", "kieu": "chu", "batBuoc": false, "muc": "ky_luat", "cot": ["so_quyet_dinh_ban_an_co_quan"], "ghiChu": "Như trên"},
  {"bang": "ky_luat_tien_an_tien_su", "truong": "hinh_thuc", "hienThi": "Hình thức", "kieu": "chu", "batBuoc": false, "muc": "ky_luat", "cot": ["hinh_thuc"], "ghiChu": "Như trên"},
  {"bang": "ky_luat_tien_an_tien_su", "truong": "hanh_vi_vi_pham", "hienThi": "Hành vi vi phạm", "kieu": "chu", "batBuoc": false, "muc": "ky_luat", "cot": ["hanh_vi_vi_pham"], "ghiChu": "Như trên"},
  {"bang": "ky_luat_tien_an_tien_su", "truong": "con_hieu_luc", "hienThi": "Còn hiệu lực", "kieu": "co_khong", "batBuoc": false, "muc": "ky_luat", "cot": ["con_hieu_luc"], "ghiChu": "Như trên"},
  {"bang": "luong", "truong": "tu_thang_nam", "hienThi": "Từ tháng, năm", "kieu": "ngay_thieu", "batBuoc": true, "muc": "luong", "cot": ["tu_nam", "tu_thang", "tu_ngay", "tu_chuan"], "goc": "tu"},
  {"bang": "luong", "truong": "den_thang_nam", "hienThi": "Đến tháng, năm", "kieu": "ngay_thieu", "batBuoc": false, "muc": "luong", "cot": ["den_nam", "den_thang", "den_ngay", "den_chuan"], "goc": "den"},
  {"bang": "luong", "truong": "ma_so", "hienThi": "Mã số", "kieu": "chu", "batBuoc": false, "muc": "luong", "cot": ["ma_so"]},
  {"bang": "luong", "truong": "bac_luong", "hienThi": "Bậc lương", "kieu": "chu", "batBuoc": false, "muc": "luong", "cot": ["bac_luong"]},
  {"bang": "luong", "truong": "he_so_luong", "hienThi": "Hệ số lương", "kieu": "so", "batBuoc": true, "muc": "luong", "cot": ["he_so_luong"]},
  {"bang": "luong", "truong": "tien_luong_theo_vi_tri", "hienThi": "Tiền lương theo vị trí việc làm", "kieu": "so", "batBuoc": false, "muc": "luong", "cot": ["tien_luong_theo_vi_tri"]},
  {"bang": "than_nhan", "truong": "nhom", "hienThi": "Nhóm (ban_than / vo_chong)", "kieu": "lua_chon", "batBuoc": true, "muc": "than_nhan", "cot": ["nhom"]},
  {"bang": "than_nhan", "truong": "quan_he", "hienThi": "Quan hệ", "kieu": "lua_chon", "batBuoc": true, "muc": "than_nhan", "cot": ["quan_he"], "ghiChu": "cha, me, nguoi_nuoi_duong, vo, chong, con, anh_chi_em"},
  {"bang": "than_nhan", "truong": "ho_ten", "hienThi": "Họ và tên", "kieu": "chu", "batBuoc": true, "muc": "than_nhan", "cot": ["ho_ten"]},
  {"bang": "than_nhan", "truong": "gioi_tinh", "hienThi": "Giới tính", "kieu": "lua_chon", "batBuoc": false, "muc": "than_nhan", "cot": ["gioi_tinh"]},
  {"bang": "than_nhan", "truong": "ngay_sinh", "hienThi": "Ngày, tháng, năm sinh", "kieu": "ngay_thieu", "batBuoc": false, "muc": "than_nhan", "cot": ["ngay_sinh_nam", "ngay_sinh_thang", "ngay_sinh_ngay", "ngay_sinh_chuan"], "ghiChu": "Tuổi con tự tính, không lưu"},
  {"bang": "than_nhan", "truong": "dan_toc", "hienThi": "Dân tộc", "kieu": "lua_chon", "batBuoc": false, "muc": "than_nhan", "cot": ["dan_toc_id"], "danhMuc": "dan_toc"},
  {"bang": "than_nhan", "truong": "quoc_tich", "hienThi": "Quốc tịch", "kieu": "chu", "batBuoc": false, "muc": "than_nhan", "cot": ["quoc_tich"]},
  {"bang": "than_nhan", "truong": "que_quan", "hienThi": "Quê quán", "kieu": "chu", "batBuoc": false, "muc": "than_nhan", "cot": ["que_quan"]},
  {"bang": "than_nhan", "truong": "noi_thuong_tru", "hienThi": "Nơi thường trú", "kieu": "chu", "batBuoc": false, "muc": "than_nhan", "cot": ["noi_thuong_tru"]},
  {"bang": "than_nhan", "truong": "noi_o_hien_nay", "hienThi": "Nơi ở hiện nay", "kieu": "chu", "batBuoc": false, "muc": "than_nhan", "cot": ["noi_o_hien_nay"]},
  {"bang": "than_nhan", "truong": "nghe_nghiep_noi_lam_viec", "hienThi": "Nghề nghiệp, nơi làm việc", "kieu": "chu", "batBuoc": false, "muc": "than_nhan", "cot": ["nghe_nghiep_noi_lam_viec"]},
  {"bang": "than_nhan", "truong": "nam_ket_hon_ly_hon", "hienThi": "Năm kết hôn/ly hôn", "kieu": "chu", "batBuoc": false, "muc": "than_nhan", "cot": ["nam_ket_hon_ly_hon"]},
  {"bang": "than_nhan", "truong": "so_can_cuoc", "hienThi": "Số căn cước", "kieu": "chu", "batBuoc": false, "muc": "so_dinh_danh", "cot": ["so_can_cuoc"]},
  {"bang": "than_nhan", "truong": "ton_giao", "hienThi": "Tôn giáo", "kieu": "lua_chon", "batBuoc": false, "muc": "dac_diem_chinh_tri", "cot": ["ton_giao_id"], "danhMuc": "ton_giao"},
  {"bang": "than_nhan", "truong": "thai_do_chinh_tri", "hienThi": "Thái độ chính trị", "kieu": "chu", "batBuoc": false, "muc": "dac_diem_chinh_tri", "cot": ["thai_do_chinh_tri"]},
  {"bang": "than_nhan", "truong": "lien_quan_che_do_cu", "hienThi": "Liên quan chế độ cũ", "kieu": "chu", "batBuoc": false, "muc": "dac_diem_chinh_tri", "cot": ["lien_quan_che_do_cu"]},
  {"bang": "than_nhan", "truong": "tien_an", "hienThi": "Tiền án", "kieu": "chu", "batBuoc": false, "muc": "tien_an_tien_su", "cot": ["tien_an"]},
  {"bang": "trang_thai_quan_nhan", "truong": "trang_thai", "hienThi": "Trạng thái", "kieu": "lua_chon", "batBuoc": true, "muc": "trang_thai", "cot": ["trang_thai_id"], "danhMuc": "trang_thai", "ghiChu": "Chọn từ Danh_muc"},
  {"bang": "trang_thai_quan_nhan", "truong": "tu_ngay", "hienThi": "Từ ngày", "kieu": "ngay_du", "batBuoc": true, "muc": "trang_thai", "cot": ["tu_ngay"]},
  {"bang": "trang_thai_quan_nhan", "truong": "den_ngay", "hienThi": "Đến ngày", "kieu": "ngay_du", "batBuoc": false, "muc": "trang_thai", "cot": ["den_ngay"], "ghiChu": "Trống = chưa kết thúc"},
  {"bang": "trang_thai_quan_nhan", "truong": "ly_do_hoac_noi", "hienThi": "Lý do hoặc nơi", "kieu": "chu", "batBuoc": false, "muc": "trang_thai", "cot": ["ly_do_hoac_noi"], "ghiChu": "Ghi ngắn, không ghi bệnh (D3)"}
];

// Bang co phan quyen THEO TUNG DONG: cung mot bang nhung dong "ky luat" can muc ky_luat,
// dong "tien an / tien su" can muc tien_an_tien_su.
export const PHAN_QUYEN_THEO_DONG = {
  ky_luat_tien_an_tien_su: {
    cot: 'loai',
    mucTheoGiaTri: { ky_luat: 'ky_luat', tien_an: 'tien_an_tien_su', tien_su: 'tien_an_tien_su' },
  },
};

const MA_MUC = new Set(MUC.map((m) => m.ma));

export function laMucNhayCam(ma) {
  const muc = MUC.find((m) => m.ma === ma);
  if (!muc) {
    throw new Error('Muc quyen khong ton tai: ' + ma);
  }
  return muc.nhayCam;
}

// Muc quyen cua mot truong.
export function mucCuaTruong(bang, truong) {
  const t = TRUONG.find((x) => x.bang === bang && x.truong === truong);
  if (!t) {
    throw new Error('Khong co truong ' + bang + '.' + truong);
  }
  return t.muc;
}

// Muc quyen can co de doc MOT DONG cua bang (dung cho bang phan quyen theo dong).
export function mucCuaDong(bang, dong) {
  const cauHinh = PHAN_QUYEN_THEO_DONG[bang];
  if (!cauHinh) {
    return null;
  }
  const muc = cauHinh.mucTheoGiaTri[dong[cauHinh.cot]];
  if (!muc) {
    throw new Error('Gia tri "' + dong[cauHinh.cot] + '" khong hop le o cot ' + cauHinh.cot);
  }
  return muc;
}

// Cac cot SQL ma tai khoan co cac muc "danhSachMuc" duoc phep doc.
// - Co tham so "bang": tra ve mang ten cot cua bang do.
// - Khong co: tra ve doi tuong { ten_bang: [cac cot] } cho moi bang.
export function cotTheoMuc(danhSachMuc, bang) {
  for (const ma of danhSachMuc) {
    if (!MA_MUC.has(ma)) {
      throw new Error('Muc quyen khong ton tai: ' + ma);
    }
  }
  const duocPhep = new Set(danhSachMuc);
  const ketQua = {};
  for (const t of TRUONG) {
    if (bang !== undefined && t.bang !== bang) {
      continue;
    }
    if (!ketQua[t.bang]) {
      ketQua[t.bang] = [];
    }
    if (duocPhep.has(t.muc)) {
      ketQua[t.bang].push(...t.cot);
    }
  }
  if (bang !== undefined) {
    return ketQua[bang] || [];
  }
  return ketQua;
}
