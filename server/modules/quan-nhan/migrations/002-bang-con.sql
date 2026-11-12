-- Tao tu bang truong cua Buoc 0 (shared/truong-muc.js). KHONG sua file nay sau khi da chay; muon doi cau truc thi them file migration moi.

CREATE TABLE qua_trinh_truoc_tuyen_dung (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quan_nhan_id INTEGER NOT NULL REFERENCES quan_nhan (id) ON DELETE CASCADE,
  tu_nam INTEGER NOT NULL,
  tu_thang INTEGER NOT NULL,
  tu_ngay INTEGER,
  tu_chuan TEXT,
  den_nam INTEGER NOT NULL,
  den_thang INTEGER NOT NULL,
  den_ngay INTEGER,
  den_chuan TEXT,
  hoc_tap_lam_gi_o_dau TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (tu_nam IS NULL OR tu_nam BETWEEN 1900 AND 2200),
  CHECK (tu_thang IS NULL OR tu_thang BETWEEN 1 AND 12),
  CHECK (tu_ngay IS NULL OR tu_ngay BETWEEN 1 AND 31),
  CHECK (tu_ngay IS NULL OR tu_thang IS NOT NULL),
  CHECK (tu_chuan IS NULL OR tu_chuan GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  CHECK (den_nam IS NULL OR den_nam BETWEEN 1900 AND 2200),
  CHECK (den_thang IS NULL OR den_thang BETWEEN 1 AND 12),
  CHECK (den_ngay IS NULL OR den_ngay BETWEEN 1 AND 31),
  CHECK (den_ngay IS NULL OR den_thang IS NOT NULL),
  CHECK (den_chuan IS NULL OR den_chuan GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]')
);
CREATE INDEX ix_qua_trinh_truoc_tuyen_dung_quan_nhan_id ON qua_trinh_truoc_tuyen_dung (quan_nhan_id);

CREATE TABLE qua_trinh_cong_tac (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quan_nhan_id INTEGER NOT NULL REFERENCES quan_nhan (id) ON DELETE CASCADE,
  tu_nam INTEGER NOT NULL,
  tu_thang INTEGER NOT NULL,
  tu_ngay INTEGER,
  tu_chuan TEXT,
  den_nam INTEGER,
  den_thang INTEGER,
  den_ngay INTEGER,
  den_chuan TEXT,
  chuc_danh_chuc_vu_don_vi TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (tu_nam IS NULL OR tu_nam BETWEEN 1900 AND 2200),
  CHECK (tu_thang IS NULL OR tu_thang BETWEEN 1 AND 12),
  CHECK (tu_ngay IS NULL OR tu_ngay BETWEEN 1 AND 31),
  CHECK (tu_ngay IS NULL OR tu_thang IS NOT NULL),
  CHECK (tu_chuan IS NULL OR tu_chuan GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  CHECK (den_nam IS NULL OR den_nam BETWEEN 1900 AND 2200),
  CHECK (den_thang IS NULL OR den_thang BETWEEN 1 AND 12),
  CHECK (den_ngay IS NULL OR den_ngay BETWEEN 1 AND 31),
  CHECK (den_ngay IS NULL OR den_thang IS NOT NULL),
  CHECK (den_chuan IS NULL OR den_chuan GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]')
);
CREATE INDEX ix_qua_trinh_cong_tac_quan_nhan_id ON qua_trinh_cong_tac (quan_nhan_id);

CREATE TABLE dao_tao (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quan_nhan_id INTEGER NOT NULL REFERENCES quan_nhan (id) ON DELETE CASCADE,
  ten_truong_co_so TEXT NOT NULL,
  nganh_hoc_lop_hoc TEXT,
  tu_nam INTEGER,
  tu_thang INTEGER,
  tu_ngay INTEGER,
  tu_chuan TEXT,
  den_nam INTEGER,
  den_thang INTEGER,
  den_ngay INTEGER,
  den_chuan TEXT,
  hinh_thuc_id INTEGER REFERENCES danh_muc (id),
  van_bang_chung_chi TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (tu_nam IS NULL OR tu_nam BETWEEN 1900 AND 2200),
  CHECK (tu_thang IS NULL OR tu_thang BETWEEN 1 AND 12),
  CHECK (tu_ngay IS NULL OR tu_ngay BETWEEN 1 AND 31),
  CHECK (tu_ngay IS NULL OR tu_thang IS NOT NULL),
  CHECK (tu_chuan IS NULL OR tu_chuan GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  CHECK (den_nam IS NULL OR den_nam BETWEEN 1900 AND 2200),
  CHECK (den_thang IS NULL OR den_thang BETWEEN 1 AND 12),
  CHECK (den_ngay IS NULL OR den_ngay BETWEEN 1 AND 31),
  CHECK (den_ngay IS NULL OR den_thang IS NOT NULL),
  CHECK (den_chuan IS NULL OR den_chuan GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]')
);
CREATE INDEX ix_dao_tao_quan_nhan_id ON dao_tao (quan_nhan_id);

CREATE TABLE khen_thuong (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quan_nhan_id INTEGER NOT NULL REFERENCES quan_nhan (id) ON DELETE CASCADE,
  thoi_diem_nam INTEGER NOT NULL,
  thoi_diem_thang INTEGER NOT NULL,
  thoi_diem_ngay INTEGER,
  thoi_diem_chuan TEXT,
  so_quyet_dinh_co_quan TEXT,
  hinh_thuc_khen_thuong_id INTEGER REFERENCES danh_muc (id),
  danh_hieu_thi_dua TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (thoi_diem_nam IS NULL OR thoi_diem_nam BETWEEN 1900 AND 2200),
  CHECK (thoi_diem_thang IS NULL OR thoi_diem_thang BETWEEN 1 AND 12),
  CHECK (thoi_diem_ngay IS NULL OR thoi_diem_ngay BETWEEN 1 AND 31),
  CHECK (thoi_diem_ngay IS NULL OR thoi_diem_thang IS NOT NULL),
  CHECK (thoi_diem_chuan IS NULL OR thoi_diem_chuan GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]')
);
CREATE INDEX ix_khen_thuong_quan_nhan_id ON khen_thuong (quan_nhan_id);
CREATE INDEX ix_khen_thuong_hinh_thuc_khen_thuong_id ON khen_thuong (hinh_thuc_khen_thuong_id);

CREATE TABLE ky_luat_tien_an_tien_su (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quan_nhan_id INTEGER NOT NULL REFERENCES quan_nhan (id) ON DELETE CASCADE,
  loai TEXT NOT NULL CHECK (loai IN ('ky_luat', 'tien_an', 'tien_su')),
  thoi_diem_nam INTEGER,
  thoi_diem_thang INTEGER,
  thoi_diem_ngay INTEGER,
  thoi_diem_chuan TEXT,
  so_quyet_dinh_ban_an_co_quan TEXT,
  hinh_thuc TEXT,
  hanh_vi_vi_pham TEXT,
  con_hieu_luc INTEGER NOT NULL DEFAULT 0 CHECK (con_hieu_luc IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (thoi_diem_nam IS NULL OR thoi_diem_nam BETWEEN 1900 AND 2200),
  CHECK (thoi_diem_thang IS NULL OR thoi_diem_thang BETWEEN 1 AND 12),
  CHECK (thoi_diem_ngay IS NULL OR thoi_diem_ngay BETWEEN 1 AND 31),
  CHECK (thoi_diem_ngay IS NULL OR thoi_diem_thang IS NOT NULL),
  CHECK (thoi_diem_chuan IS NULL OR thoi_diem_chuan GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]')
);
CREATE INDEX ix_ky_luat_tien_an_tien_su_quan_nhan_id ON ky_luat_tien_an_tien_su (quan_nhan_id);
CREATE INDEX ix_ky_luat_tien_an_tien_su_loai_con_hieu_luc ON ky_luat_tien_an_tien_su (loai, con_hieu_luc);

CREATE TABLE luong (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quan_nhan_id INTEGER NOT NULL REFERENCES quan_nhan (id) ON DELETE CASCADE,
  tu_nam INTEGER NOT NULL,
  tu_thang INTEGER NOT NULL,
  tu_ngay INTEGER,
  tu_chuan TEXT,
  den_nam INTEGER,
  den_thang INTEGER,
  den_ngay INTEGER,
  den_chuan TEXT,
  ma_so TEXT,
  bac_luong TEXT,
  he_so_luong REAL NOT NULL,
  tien_luong_theo_vi_tri REAL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (tu_nam IS NULL OR tu_nam BETWEEN 1900 AND 2200),
  CHECK (tu_thang IS NULL OR tu_thang BETWEEN 1 AND 12),
  CHECK (tu_ngay IS NULL OR tu_ngay BETWEEN 1 AND 31),
  CHECK (tu_ngay IS NULL OR tu_thang IS NOT NULL),
  CHECK (tu_chuan IS NULL OR tu_chuan GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  CHECK (den_nam IS NULL OR den_nam BETWEEN 1900 AND 2200),
  CHECK (den_thang IS NULL OR den_thang BETWEEN 1 AND 12),
  CHECK (den_ngay IS NULL OR den_ngay BETWEEN 1 AND 31),
  CHECK (den_ngay IS NULL OR den_thang IS NOT NULL),
  CHECK (den_chuan IS NULL OR den_chuan GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]')
);
CREATE INDEX ix_luong_quan_nhan_id ON luong (quan_nhan_id);
