-- Danh muc can co san de phan mem hoat dong: trang thai hang ngay va loai phep.
-- (Don vi, quan ham, chuc vu... do admin tu nhap.) Co the sua ten, mau, them trang thai moi tren giao dien.

INSERT INTO danh_muc (loai, ma, ten, thu_tu, mau, tinh_la_vang) VALUES
  ('trang_thai', 'co_mat',    'Có mặt',    1, '#2e7d32', 0),
  ('trang_thai', 'nghi_phep', 'Nghỉ phép', 2, '#f9a825', 1),
  ('trang_thai', 'cong_tac',  'Công tác',  3, '#1565c0', 1),
  ('trang_thai', 'benh_vien', 'Bệnh viện', 4, '#c62828', 1),
  ('trang_thai', 'benh_xa',   'Bệnh xá',   5, '#ef6c00', 1),
  ('trang_thai', 'khac',      'Khác',      6, '#757575', 1);

INSERT INTO danh_muc (loai, ma, ten, thu_tu) VALUES
  ('loai_phep', 'phep_nam',   'Phép năm',        1),
  ('loai_phep', 'viec_rieng', 'Nghỉ việc riêng', 2),
  ('loai_phep', 'nghi_om',    'Nghỉ ốm',         3),
  ('loai_phep', 'nghi_khac',  'Nghỉ khác',       4);
