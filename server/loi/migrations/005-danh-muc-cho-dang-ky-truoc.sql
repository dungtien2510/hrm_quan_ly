-- Trang thai nao duoc phep dang ky TRUOC (ngay bat dau o tuong lai).
-- Nghi phep va cong tac thuong duoc duyet truoc; benh vien, benh xa, khac chi ghi nhan viec da hoac dang xay ra.
-- Admin doi duoc o man hinh Danh muc.
ALTER TABLE danh_muc ADD COLUMN cho_dang_ky_truoc INTEGER NOT NULL DEFAULT 0 CHECK (cho_dang_ky_truoc IN (0, 1));

UPDATE danh_muc SET cho_dang_ky_truoc = 1 WHERE loai = 'trang_thai' AND ma IN ('nghi_phep', 'cong_tac');
