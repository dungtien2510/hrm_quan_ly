-- Dem so lan dang nhap sai theo DIA CHI MAY de khoa tam may do (chong do mat khau).
-- (Khoa theo tai khoan nam san o bang nguoi_dung: so_lan_sai, khoa_den.)
CREATE TABLE dang_nhap_sai_theo_may (
  dia_chi TEXT PRIMARY KEY,
  so_lan INTEGER NOT NULL DEFAULT 0,
  khoa_den TEXT,
  lan_cuoi_luc TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
