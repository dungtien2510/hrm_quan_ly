-- Danh muc sua duoc (don vi, quan ham, chuc vu, trang thai, loai phep, hinh thuc khen thuong...).
-- Khong viet cung trong ma. Don vi la danh muc dang CAY nen co cot cha_id.

CREATE TABLE danh_muc (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  loai TEXT NOT NULL,                         -- vd don_vi, quan_ham, chuc_vu, trang_thai, loai_phep
  ma TEXT NOT NULL,
  ten TEXT NOT NULL,
  thu_tu INTEGER NOT NULL DEFAULT 0,
  mau TEXT,
  tinh_la_vang INTEGER NOT NULL DEFAULT 0 CHECK (tinh_la_vang IN (0, 1)),  -- chi dung cho loai trang_thai
  dang_dung INTEGER NOT NULL DEFAULT 1 CHECK (dang_dung IN (0, 1)),
  cha_id INTEGER REFERENCES danh_muc (id),
  UNIQUE (loai, ma)
);
CREATE INDEX ix_danh_muc_loai ON danh_muc (loai, thu_tu);
CREATE INDEX ix_danh_muc_cha ON danh_muc (cha_id);
