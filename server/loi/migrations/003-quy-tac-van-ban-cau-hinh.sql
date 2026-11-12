-- Quy tac nghi huu / nghi phep (admin nhap, KHONG ghi cung con so trong ma),
-- cau hinh van ban (Huong dan 05), so van ban va cau hinh chung.

CREATE TABLE quy_tac (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  loai TEXT NOT NULL CHECK (loai IN ('nghi_huu', 'phep_nam', 'ngay_di_duong')),
  ten TEXT NOT NULL,
  can_cu TEXT,                                -- chuoi do admin nhap, vd ten van ban
  dieu_kien TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(dieu_kien)),
  ket_qua TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(ket_qua)),
  hieu_luc_tu TEXT CHECK (hieu_luc_tu IS NULL OR hieu_luc_tu GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  hieu_luc_den TEXT CHECK (hieu_luc_den IS NULL OR hieu_luc_den GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  dang_dung INTEGER NOT NULL DEFAULT 1 CHECK (dang_dung IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX ix_quy_tac_loai ON quy_tac (loai, dang_dung);

CREATE TABLE cau_hinh_van_ban (
  khoa TEXT PRIMARY KEY,                      -- vd co_quan_cap_tren, ten_co_quan, dia_danh, nguoi_ky_chuc_vu
  gia_tri TEXT,
  cap_nhat_luc TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- So van ban: ghi lien tuc tu 01 cho moi ten loai van ban trong mot nhiem ky cap uy.
CREATE TABLE so_van_ban (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  loai_van_ban TEXT NOT NULL,
  nhiem_ky TEXT NOT NULL,
  so_tiep_theo INTEGER NOT NULL DEFAULT 1 CHECK (so_tiep_theo >= 1),
  UNIQUE (loai_van_ban, nhiem_ky)
);

CREATE TABLE cau_hinh (
  khoa TEXT PRIMARY KEY,
  gia_tri TEXT,
  cap_nhat_luc TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
