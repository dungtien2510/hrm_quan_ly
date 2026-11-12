-- Tai khoan, phien dang nhap, quyen tung tai khoan va nhat ky thao tac.

CREATE TABLE nguoi_dung (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ten_dang_nhap TEXT NOT NULL UNIQUE COLLATE NOCASE,
  ho_ten TEXT NOT NULL,
  mat_khau_bam TEXT NOT NULL,                 -- chuoi bam bcryptjs, KHONG bao gio luu mat khau goc
  loai TEXT NOT NULL CHECK (loai IN ('admin', 'xem_day_du', 'xem_mot_so_muc')),
  bi_khoa INTEGER NOT NULL DEFAULT 0 CHECK (bi_khoa IN (0, 1)),
  phai_doi_mat_khau INTEGER NOT NULL DEFAULT 1 CHECK (phai_doi_mat_khau IN (0, 1)),
  so_lan_sai INTEGER NOT NULL DEFAULT 0,
  khoa_den TEXT,                              -- thoi diem het khoa tam do sai nhieu lan
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
-- Chi cho phep DUNG MOT tai khoan admin.
CREATE UNIQUE INDEX ux_mot_admin ON nguoi_dung (loai) WHERE loai = 'admin';

CREATE TABLE phien (
  id TEXT PRIMARY KEY,                        -- gia tri BAM cua ma phien (khong luu ma phien goc)
  nguoi_dung_id INTEGER NOT NULL REFERENCES nguoi_dung (id) ON DELETE CASCADE,
  csrf_token TEXT NOT NULL,
  dia_chi_may TEXT,
  tao_luc TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  hoat_dong_cuoi_luc TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  het_han_luc TEXT NOT NULL
);
CREATE INDEX ix_phien_nguoi_dung ON phien (nguoi_dung_id);

-- Quyen that cua tung tai khoan: ba lop (muc, bo loc, bao cao) va dinh dang xuat.
CREATE TABLE quyen_tai_khoan (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nguoi_dung_id INTEGER NOT NULL REFERENCES nguoi_dung (id) ON DELETE CASCADE,
  loai TEXT NOT NULL CHECK (loai IN ('muc', 'loc', 'bao_cao', 'xuat')),
  khoa TEXT NOT NULL,
  cho_phep INTEGER NOT NULL DEFAULT 0 CHECK (cho_phep IN (0, 1)),
  UNIQUE (nguoi_dung_id, loai, khoa)
);

-- Nhat ky CHI GHI THEM. Khong co khoa ngoai de xoa tai khoan khong lam mat nhat ky.
CREATE TABLE nhat_ky (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  thoi_diem TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  tai_khoan_id INTEGER,
  ten_dang_nhap TEXT,
  hanh_dong TEXT NOT NULL,                    -- vd dang_nhap, xem_ho_so, sua, xuat_file, doi_quyen
  doi_tuong TEXT,
  doi_tuong_id TEXT,
  chi_tiet TEXT CHECK (chi_tiet IS NULL OR json_valid(chi_tiet)),
  may TEXT
);
CREATE INDEX ix_nhat_ky_thoi_diem ON nhat_ky (thoi_diem);
CREATE INDEX ix_nhat_ky_tai_khoan ON nhat_ky (tai_khoan_id);
CREATE INDEX ix_nhat_ky_hanh_dong ON nhat_ky (hanh_dong);

CREATE TRIGGER nhat_ky_chan_sua BEFORE UPDATE ON nhat_ky
BEGIN
  SELECT RAISE(ABORT, 'nhat_ky chi duoc ghi them, khong duoc sua');
END;

CREATE TRIGGER nhat_ky_chan_xoa BEFORE DELETE ON nhat_ky
BEGIN
  SELECT RAISE(ABORT, 'nhat_ky chi duoc ghi them, khong duoc xoa');
END;
