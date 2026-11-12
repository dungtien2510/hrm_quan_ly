-- Tao tu bang truong cua Buoc 0 (shared/truong-muc.js). KHONG sua file nay sau khi da chay; muon doi cau truc thi them file migration moi.

CREATE TABLE than_nhan (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quan_nhan_id INTEGER NOT NULL REFERENCES quan_nhan (id) ON DELETE CASCADE,
  nhom TEXT NOT NULL CHECK (nhom IN ('ban_than', 'vo_chong')),
  quan_he TEXT NOT NULL CHECK (quan_he IN ('cha', 'me', 'nguoi_nuoi_duong', 'vo', 'chong', 'con', 'anh_chi_em')),
  ho_ten TEXT NOT NULL,
  gioi_tinh TEXT CHECK (gioi_tinh IN ('nam', 'nu')),
  ngay_sinh_nam INTEGER,
  ngay_sinh_thang INTEGER,
  ngay_sinh_ngay INTEGER,
  ngay_sinh_chuan TEXT,
  dan_toc_id INTEGER REFERENCES danh_muc (id),
  quoc_tich TEXT,
  que_quan TEXT,
  noi_thuong_tru TEXT,
  noi_o_hien_nay TEXT,
  nghe_nghiep_noi_lam_viec TEXT,
  nam_ket_hon_ly_hon TEXT,
  so_can_cuoc TEXT,
  ton_giao_id INTEGER REFERENCES danh_muc (id),
  thai_do_chinh_tri TEXT,
  lien_quan_che_do_cu TEXT,
  tien_an TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (ngay_sinh_nam IS NULL OR ngay_sinh_nam BETWEEN 1900 AND 2200),
  CHECK (ngay_sinh_thang IS NULL OR ngay_sinh_thang BETWEEN 1 AND 12),
  CHECK (ngay_sinh_ngay IS NULL OR ngay_sinh_ngay BETWEEN 1 AND 31),
  CHECK (ngay_sinh_ngay IS NULL OR ngay_sinh_thang IS NOT NULL),
  CHECK (ngay_sinh_chuan IS NULL OR ngay_sinh_chuan GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]')
);
CREATE INDEX ix_than_nhan_quan_nhan_id_nhom_quan_he ON than_nhan (quan_nhan_id, nhom, quan_he);
CREATE INDEX ix_than_nhan_ngay_sinh_chuan ON than_nhan (ngay_sinh_chuan);

CREATE TABLE trang_thai_quan_nhan (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quan_nhan_id INTEGER NOT NULL REFERENCES quan_nhan (id) ON DELETE CASCADE,
  trang_thai_id INTEGER NOT NULL REFERENCES danh_muc (id),
  tu_ngay TEXT NOT NULL,
  den_ngay TEXT,
  ly_do_hoac_noi TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (tu_ngay IS NULL OR tu_ngay GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  CHECK (den_ngay IS NULL OR den_ngay GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  CHECK (den_ngay IS NULL OR den_ngay >= tu_ngay)
);
CREATE INDEX ix_trang_thai_quan_nhan_quan_nhan_id ON trang_thai_quan_nhan (quan_nhan_id);
CREATE INDEX ix_trang_thai_quan_nhan_tu_ngay_den_ngay ON trang_thai_quan_nhan (tu_ngay, den_ngay);
