'use strict';
// xac-thuc.js: phien dang nhap, cookie, chong CSRF va cac "bao ve" (middleware) cho API.
//   yeuCauDangNhap, yeuCauAdmin, yeuCauMuc(...), yeuCauBoLoc(id), yeuCauBaoCao(id), yeuCauXuat(id)
// Quy tac: kiem tra quyen o MAY CHU (khong dua vao viec giau nut); khong du quyen thi tra 403.
// Ma phien chi nam trong cookie; trong bang phien chi luu gia tri BAM (SHA-256) cua no.
const crypto = require('crypto');
const { ghiNhatKy } = require('./nhat-ky');
const { taiQuyen } = require('./quyen');

const TEN_COOKIE = 'hrm_phien';
const TOI_DA_GIO = 12; // phien song toi da 12 gio ke tu luc dang nhap
const CHU_KY_CAP_NHAT_GIAY = 30; // chi ghi lai "hoat dong cuoi" moi 30 giay de do ghi dia
const PHUONG_THUC_DOC = new Set(['GET', 'HEAD', 'OPTIONS']);

const bamSha256 = (chuoi) => crypto.createHash('sha256').update(chuoi, 'utf8').digest('hex');
const bayGio = () => new Date().toISOString();

// Dia chi may goi (chi tin dia chi ket noi that, KHONG tin header X-Forwarded-For).
function layDiaChi(req) {
  const dia = (req.socket && req.socket.remoteAddress) || '';
  return dia.startsWith('::ffff:') ? dia.slice(7) : dia;
}

function laMayChu(diaChi) {
  return diaChi === '127.0.0.1' || diaChi === '::1';
}

function docCookie(tieuDe) {
  const ketQua = {};
  if (!tieuDe) {
    return ketQua;
  }
  for (const phan of tieuDe.split(';')) {
    const viTri = phan.indexOf('=');
    if (viTri > 0) {
      ketQua[phan.slice(0, viTri).trim()] = phan.slice(viTri + 1).trim();
    }
  }
  return ketQua;
}

function soSanhAnToan(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

function taoXacThuc({ db, soDangKy, cauHinh }) {
  const phutHetPhien = cauHinh.phutHetPhien;
  const hauToCookie = '; Path=/; HttpOnly; SameSite=Strict' + (cauHinh.batHttps ? '; Secure' : '');

  function datCookie(res, maPhien) {
    res.setHeader('Set-Cookie', TEN_COOKIE + '=' + maPhien + hauToCookie);
  }
  function xoaCookie(res) {
    res.setHeader('Set-Cookie', TEN_COOKIE + '=; Max-Age=0' + hauToCookie);
  }

  // Tao phien moi cho mot nguoi dung; tra ve ma phien (chi gui vao cookie) va ma CSRF.
  function taoPhien(res, nguoiDungId, diaChi) {
    const maPhien = crypto.randomBytes(32).toString('base64url');
    const csrf = crypto.randomBytes(24).toString('base64url');
    const hetHan = new Date(Date.now() + TOI_DA_GIO * 3600 * 1000).toISOString();
    db.prepare('INSERT INTO phien (id, nguoi_dung_id, csrf_token, dia_chi_may, het_han_luc) VALUES (?, ?, ?, ?, ?)').run(
      bamSha256(maPhien), nguoiDungId, csrf, diaChi, hetHan
    );
    datCookie(res, maPhien);
    return { maPhien, csrf };
  }

  function huyPhienHienTai(req, res) {
    if (req.phien) {
      db.prepare('DELETE FROM phien WHERE id = ?').run(req.phien.id);
    }
    xoaCookie(res);
  }

  // Xoa moi phien cua mot nguoi (tru phien "giuLai" neu co).
  function huyTatCaPhien(nguoiDungId, giuLaiId = null) {
    return db.prepare('DELETE FROM phien WHERE nguoi_dung_id = ? AND id IS NOT ?').run(nguoiDungId, giuLaiId).changes;
  }

  function phienConHieuLuc(dong) {
    const bay = Date.now();
    return Date.parse(dong.het_han_luc) > bay && Date.parse(dong.hoat_dong_cuoi_luc) + phutHetPhien * 60 * 1000 > bay;
  }

  // Co phien admin nao dang hoat dong khong (chi cho phep mot phien admin tai mot thoi diem).
  function coPhienAdminDangHoatDong() {
    const dsPhien = db
      .prepare("SELECT p.het_han_luc, p.hoat_dong_cuoi_luc FROM phien p JOIN nguoi_dung n ON n.id = p.nguoi_dung_id WHERE n.loai = 'admin'")
      .all();
    return dsPhien.some(phienConHieuLuc);
  }

  // Doc cookie, tim phien, gan req.nguoiDung / req.phien / req.quyen (hoac null). Chay cho moi yeu cau.
  function nap(req, res, next) {
    req.nguoiDung = null;
    req.phien = null;
    req.quyen = null;
    const maPhien = docCookie(req.headers.cookie)[TEN_COOKIE];
    if (!maPhien) {
      next();
      return;
    }
    const id = bamSha256(maPhien);
    const dong = db
      .prepare(
        `SELECT p.id AS phien_id, p.csrf_token, p.het_han_luc, p.hoat_dong_cuoi_luc, n.id, n.ten_dang_nhap, n.ho_ten, n.loai,
                n.bi_khoa, n.phai_doi_mat_khau
           FROM phien p JOIN nguoi_dung n ON n.id = p.nguoi_dung_id WHERE p.id = ?`
      )
      .get(id);
    const diaChi = layDiaChi(req);
    const hopLe = dong && phienConHieuLuc(dong) && !dong.bi_khoa && (dong.loai !== 'admin' || laMayChu(diaChi));
    if (!hopLe) {
      if (dong && !phienConHieuLuc(dong)) {
        db.prepare('DELETE FROM phien WHERE id = ?').run(id); // phien het han thi xoa luon
      }
      xoaCookie(res);
      next();
      return;
    }
    if (Date.now() - Date.parse(dong.hoat_dong_cuoi_luc) > CHU_KY_CAP_NHAT_GIAY * 1000) {
      db.prepare('UPDATE phien SET hoat_dong_cuoi_luc = ? WHERE id = ?').run(bayGio(), id);
    }
    req.phien = { id, csrfToken: dong.csrf_token };
    req.nguoiDung = {
      id: dong.id,
      tenDangNhap: dong.ten_dang_nhap,
      hoTen: dong.ho_ten,
      loai: dong.loai,
      phaiDoiMatKhau: dong.phai_doi_mat_khau === 1,
    };
    req.quyen = taiQuyen(db, req.nguoiDung, soDangKy);
    next();
  }

  // Chong CSRF: yeu cau thay doi du lieu (khac GET) cua nguoi da dang nhap phai kem header X-CSRF-Token.
  function kiemTraCsrf(req, res, next) {
    if (PHUONG_THUC_DOC.has(req.method) || !req.phien) {
      next();
      return;
    }
    const maGui = req.headers['x-csrf-token'];
    if (!maGui || !soSanhAnToan(maGui, req.phien.csrfToken)) {
      res.status(403).json({ loi: 'Thiếu hoặc sai mã bảo vệ CSRF. Hãy tải lại trang.', ma: 'CSRF' });
      return;
    }
    next();
  }

  function tuChoi(req, res, loaiQuyen, khoa, thongBao, ma) {
    try {
      ghiNhatKy(db, {
        taiKhoanId: req.nguoiDung.id,
        tenDangNhap: req.nguoiDung.tenDangNhap,
        hanhDong: 'tu_choi_quyen',
        doiTuong: req.method + ' ' + req.baseUrl + req.path,
        chiTiet: { loai: loaiQuyen, khoa },
        may: layDiaChi(req),
      });
    } catch (loi) {
      console.error('[LOI] Khong ghi duoc nhat ky tu choi: ' + loi.message);
    }
    res.status(403).json({ loi: thongBao, ma, khoa });
  }

  // Bao ve co ban cua moi API can dang nhap.
  //  - Chua dang nhap: 401.
  //  - Con phai doi mat khau lan dau: 403 (tru API doi mat khau/dang xuat/xem "toi").
  //  - Tai khoan KHONG phai admin ma goi thao tac ghi (POST/PUT/PATCH/DELETE): 403, tru khi
  //    API cho phep ro rang (tuy chon choPhepGhi) nhu doi mat khau cua chinh minh.
  function yeuCauDangNhap(tuyChon = {}) {
    return function baoVe(req, res, next) {
      if (!req.nguoiDung) {
        res.status(401).json({ loi: 'Chưa đăng nhập', ma: 'CHUA_DANG_NHAP' });
        return;
      }
      if (req.nguoiDung.phaiDoiMatKhau && !tuyChon.choPhepChuaDoiMatKhau) {
        res.status(403).json({ loi: 'Cần đổi mật khẩu trước khi tiếp tục', ma: 'PHAI_DOI_MAT_KHAU' });
        return;
      }
      if (!PHUONG_THUC_DOC.has(req.method) && req.nguoiDung.loai !== 'admin' && !tuyChon.choPhepGhi) {
        tuChoi(req, res, 'ghi', req.method, 'Chỉ tài khoản admin được thêm, sửa, xóa dữ liệu', 'CHI_ADMIN_GHI');
        return;
      }
      next();
    };
  }

  const baoVeDangNhap = yeuCauDangNhap();

  function yeuCauAdmin(req, res, next) {
    baoVeDangNhap(req, res, (loi) => {
      if (loi) {
        next(loi);
        return;
      }
      if (req.nguoiDung.loai !== 'admin') {
        tuChoi(req, res, 'admin', 'admin', 'Chỉ tài khoản admin được dùng chức năng này', 'CHI_ADMIN');
        return;
      }
      next();
    });
  }

  // Tao bao ve theo loai quyen. Ten quyen sai (khong co trong so dang ky) -> loi lap trinh, nem ngay khi khai bao.
  function taoBaoVeQuyen(loaiQuyen, danhSachKhoa, kiemTraTonTai, kiemTraDuoc, thongBao) {
    for (const khoa of danhSachKhoa) {
      if (!kiemTraTonTai(khoa)) {
        throw new Error('Khai bao bao ve quyen sai: "' + khoa + '" khong co trong so dang ky (' + loaiQuyen + ')');
      }
    }
    return function baoVe(req, res, next) {
      baoVeDangNhap(req, res, (loi) => {
        if (loi) {
          next(loi);
          return;
        }
        for (const khoa of danhSachKhoa) {
          if (!kiemTraDuoc(req.quyen, khoa)) {
            tuChoi(req, res, loaiQuyen, khoa, thongBao + ': ' + khoa, 'THIEU_QUYEN_' + loaiQuyen.toUpperCase());
            return;
          }
        }
        next();
      });
    };
  }

  const yeuCauMuc = (...dsMuc) =>
    taoBaoVeQuyen('muc', dsMuc, (k) => soDangKy.muc.some((m) => m.ma === k), (q, k) => q.coMuc(k), 'Không có quyền xem mục');
  const yeuCauBoLoc = (...dsId) =>
    taoBaoVeQuyen('loc', dsId, (k) => soDangKy.boLoc.some((b) => b.id === k), (q, k) => q.coBoLoc(k), 'Không có quyền dùng bộ lọc');
  const yeuCauBaoCao = (...dsId) =>
    taoBaoVeQuyen('bao_cao', dsId, (k) => soDangKy.baoCao.some((b) => b.id === k), (q, k) => q.coBaoCao(k), 'Không có quyền dùng báo cáo');
  const yeuCauXuat = (...dsId) =>
    taoBaoVeQuyen('xuat', dsId, (k) => soDangKy.xuat.some((x) => x.id === k), (q, k) => q.coXuat(k), 'Không có quyền xuất định dạng');

  return {
    nap, kiemTraCsrf, yeuCauDangNhap, yeuCauAdmin, yeuCauMuc, yeuCauBoLoc, yeuCauBaoCao, yeuCauXuat,
    taoPhien, huyPhienHienTai, huyTatCaPhien, coPhienAdminDangHoatDong, layDiaChi, laMayChu,
  };
}

module.exports = { taoXacThuc, layDiaChi, laMayChu, docCookie, bamSha256, TEN_COOKIE };
