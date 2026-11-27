-- Loai quan he cua than nhan: de (ruot), nuoi, ke (duong, me ke), da_ly_hon (vo/chong cu).
-- De trong = quan he "mac dinh" (cha/me/con DE; vo/chong HIEN TAI). Dung de phan biet vd "me de" voi "me nuoi",
-- nen mot nguoi co the co nhieu "me" nhung moi loai chi mot (xem shared/than-nhan.js).
ALTER TABLE than_nhan ADD COLUMN tinh_chat TEXT CHECK (tinh_chat IS NULL OR tinh_chat IN ('de', 'nuoi', 'ke', 'da_ly_hon'));
