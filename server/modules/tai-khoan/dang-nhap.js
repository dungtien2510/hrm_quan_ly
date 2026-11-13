'use strict';
// dang-nhap.js: dang nhap, dang xuat, "toi la ai", doi mat khau.
//  - Khoa tam tai khoan (5 lan sai) va khoa tam theo dia chi may (20 lan sai) trong 15 phut.
//  - Admin chi dang nhap tu chinh may chu (127.0.0.1 / ::1) va chi MOT phien admin cung luc.
//  - Khong tiet lo tai khoan co ton tai hay khong: sai ten hay sai mat khau deu cung mot thong bao.
const crypto = require('crypto');
const { z } = require('zod');
const { phanTich, guiLoiDuLieu, boc, LoiNghiepVu } = require('./tien-ich');
const { kiemTraMatKhau, soSanhMatKhau, datMatKhau, bamMatKhau } = require('./dich-vu');

const KHOA_PHUT = 15;
const TOI_DA_SAI_TAI_KHOAN = 5;
const TOI_DA_SAI_MAY = 20;
const THONG_BAO_SAI = 'Tên đăng nhập hoặc mật khẩu không đúng';

const lenhDangNhap = z.object({
  tenDangNhap: z.string().min(1).max(64),
  matKhau: z.string().min(1).max(200),
  dayPhienCu: z.boolean().optional(),
});
const lenhDoiMatKhau = z.object({
  matKhauCu: z.string().min(1).max(200),
  matKhauMoi: z.string().min(1).max(200),
});

const phutConLai = (denIso) => Math.max(1, Math.ceil((Date.parse(denIso) - Date.now()) / 60000));
const tuongLai = () => new Date(Date.now() + KHOA_PHUT * 60 * 1000).toISOString();

function dangKyDangNhap(router, boiCanh) {
  const { db, cauHinh, xacThuc, ghiNhatKy } = boiCanh;
  const dangNhapDaCoDang = xacThuc.yeuCauDangNhap({ choPhepChuaDoiMatKhau: true, choPhepGhi: true });
  let hashGia = null;

  // Bam gia de thoi gian xu ly khong lo viec ten dang nhap co ton tai hay khong.
  async function layHashGia() {
    if (!hashGia) {
      hashGia = await bamMatKhau(crypto.randomBytes(16).toString('hex'), cauHinh.bcryptCost);
    }
    return hashGia;
  }

  function layKhoaMay(diaChi) {
    const dong = db.prepare('SELECT khoa_den FROM dang_nhap_sai_theo_may WHERE dia_chi = ?').get(diaChi);
    return dong && dong.khoa_den && Date.parse(dong.khoa_den) > Date.now() ? dong.khoa_den : null;
  }

  function ghiSaiMay(diaChi) {
    const dong = db.prepare('SELECT so_lan, lan_cuoi_luc FROM dang_nhap_sai_theo_may WHERE dia_chi = ?').get(diaChi);
    let soLan = 1;
    if (dong && Date.parse(dong.lan_cuoi_luc) + KHOA_PHUT * 60 * 1000 > Date.now()) {
      soLan = dong.so_lan + 1;
    }
    let khoaDen = null;
    if (soLan >= TOI_DA_SAI_MAY) {
      khoaDen = tuongLai();
      soLan = 0;
    }
    db.prepare(
      `INSERT INTO dang_nhap_sai_theo_may (dia_chi, so_lan, khoa_den, lan_cuoi_luc) VALUES (?, ?, ?, ?)
       ON CONFLICT (dia_chi) DO UPDATE SET so_lan = excluded.so_lan, khoa_den = excluded.khoa_den, lan_cuoi_luc = excluded.lan_cuoi_luc`
    ).run(diaChi, soLan, khoaDen, new Date().toISOString());
  }

  function ghiSaiTaiKhoan(nguoi) {
    let soLan = nguoi.so_lan_sai + 1;
    let khoaDen = null;
    if (soLan >= TOI_DA_SAI_TAI_KHOAN) {
      khoaDen = tuongLai();
      soLan = 0;
    }
    db.prepare('UPDATE nguoi_dung SET so_lan_sai = ?, khoa_den = ? WHERE id = ?').run(soLan, khoaDen, nguoi.id);
  }

  const nhatKyDangNhap = (nguoi, hanhDong, diaChi, chiTiet) =>
    ghiNhatKy({
      taiKhoanId: nguoi ? nguoi.id : null,
      tenDangNhap: nguoi ? nguoi.ten_dang_nhap : null,
      hanhDong,
      doiTuong: 'tai_khoan',
      doiTuongId: nguoi ? nguoi.id : null,
      chiTiet,
      may: diaChi,
    });

  router.post(
    '/dang-nhap',
    boc(async (req, res) => {
      const goi = phanTich(lenhDangNhap, req.body);
      if (!goi.ok) {
        guiLoiDuLieu(res, goi.truong);
        return;
      }
      const { tenDangNhap, matKhau, dayPhienCu } = goi.du;
      const diaChi = xacThuc.layDiaChi(req);

      const khoaMay = layKhoaMay(diaChi);
      if (khoaMay) {
        res.status(429).json({ loi: 'Máy này tạm bị khóa do nhập sai nhiều lần. Thử lại sau ' + phutConLai(khoaMay) + ' phút.', ma: 'MAY_BI_KHOA' });
        return;
      }

      let nguoi = db.prepare('SELECT * FROM nguoi_dung WHERE ten_dang_nhap = ?').get(tenDangNhap);

      // Admin chi dang nhap tu chinh may chu: tu choi NGAY, khong kiem tra mat khau (khong cho do mat khau tu xa).
      if (nguoi && nguoi.loai === 'admin' && !xacThuc.laMayChu(diaChi)) {
        ghiSaiMay(diaChi);
        nhatKyDangNhap(nguoi, 'dang_nhap_admin_tu_xa', diaChi, { lyDo: 'admin chi dang nhap tu may chu' });
        res.status(403).json({
          loi: 'Tài khoản admin chỉ đăng nhập được trên chính máy chủ (mở http://localhost:' + cauHinh.cong + ' trên máy chủ).',
          ma: 'ADMIN_CHI_O_MAY_CHU',
        });
        return;
      }

      if (nguoi && nguoi.khoa_den) {
        if (Date.parse(nguoi.khoa_den) > Date.now()) {
          nhatKyDangNhap(nguoi, 'dang_nhap_bi_khoa_tam', diaChi, { lyDo: 'khoa tam do sai nhieu lan' });
          res.status(423).json({ loi: 'Tài khoản tạm khóa do nhập sai nhiều lần. Thử lại sau ' + phutConLai(nguoi.khoa_den) + ' phút.', ma: 'TAI_KHOAN_TAM_KHOA' });
          return;
        }
        db.prepare('UPDATE nguoi_dung SET khoa_den = NULL, so_lan_sai = 0 WHERE id = ?').run(nguoi.id);
        nguoi = Object.assign({}, nguoi, { khoa_den: null, so_lan_sai: 0 });
      }

      const dung = await soSanhMatKhau(matKhau, nguoi ? nguoi.mat_khau_bam : await layHashGia());
      if (!nguoi || !dung) {
        ghiSaiMay(diaChi);
        if (nguoi) {
          ghiSaiTaiKhoan(nguoi);
        }
        nhatKyDangNhap(nguoi, 'dang_nhap_that_bai', diaChi, { lyDo: nguoi ? 'sai mat khau' : 'khong co tai khoan' });
        res.status(401).json({ loi: THONG_BAO_SAI, ma: 'SAI_THONG_TIN' });
        return;
      }
      if (nguoi.bi_khoa) {
        nhatKyDangNhap(nguoi, 'dang_nhap_tai_khoan_bi_khoa', diaChi, null);
        res.status(403).json({ loi: 'Tài khoản đã bị khóa. Liên hệ quản trị viên.', ma: 'TAI_KHOAN_BI_KHOA' });
        return;
      }

      db.prepare('DELETE FROM phien WHERE het_han_luc < ?').run(new Date().toISOString());
      if (nguoi.loai === 'admin' && xacThuc.coPhienAdminDangHoatDong()) {
        if (!dayPhienCu) {
          res.status(409).json({ loi: 'Đang có một phiên admin khác đang đăng nhập. Đăng nhập lại sẽ đưa phiên cũ ra.', ma: 'CO_PHIEN_ADMIN_CU', coPhienCu: true });
          return;
        }
        const soPhien = xacThuc.huyTatCaPhien(nguoi.id);
        nhatKyDangNhap(nguoi, 'day_phien_admin_cu', diaChi, { soPhienBiDuaRa: soPhien });
      }

      db.prepare('UPDATE nguoi_dung SET so_lan_sai = 0, khoa_den = NULL WHERE id = ?').run(nguoi.id);
      const { csrf } = xacThuc.taoPhien(res, nguoi.id, diaChi);
      nhatKyDangNhap(nguoi, 'dang_nhap', diaChi, { loai: nguoi.loai });
      res.json({
        nguoiDung: { id: nguoi.id, tenDangNhap: nguoi.ten_dang_nhap, hoTen: nguoi.ho_ten, loai: nguoi.loai, phaiDoiMatKhau: nguoi.phai_doi_mat_khau === 1 },
        csrfToken: csrf,
      });
    })
  );

  router.post('/dang-xuat', dangNhapDaCoDang, (req, res) => {
    nhatKyDangNhap({ id: req.nguoiDung.id, ten_dang_nhap: req.nguoiDung.tenDangNhap }, 'dang_xuat', xacThuc.layDiaChi(req), null);
    xacThuc.huyPhienHienTai(req, res);
    res.json({ ok: true });
  });

  router.get('/toi', dangNhapDaCoDang, (req, res) => {
    res.json({
      nguoiDung: req.nguoiDung,
      csrfToken: req.phien.csrfToken,
      quyen: {
        laAdmin: req.quyen.laAdmin,
        muc: req.quyen.danhSachMuc(),
        boLoc: req.quyen.danhSachBoLoc(),
        baoCao: req.quyen.danhSachBaoCao(),
        xuat: req.quyen.danhSachXuat(),
      },
    });
  });

  router.post(
    '/doi-mat-khau',
    dangNhapDaCoDang,
    boc(async (req, res) => {
      const goi = phanTich(lenhDoiMatKhau, req.body);
      if (!goi.ok) {
        guiLoiDuLieu(res, goi.truong);
        return;
      }
      const { matKhauCu, matKhauMoi } = goi.du;
      const diaChi = xacThuc.layDiaChi(req);
      const nguoi = db.prepare('SELECT * FROM nguoi_dung WHERE id = ?').get(req.nguoiDung.id);
      if (!(await soSanhMatKhau(matKhauCu, nguoi.mat_khau_bam))) {
        ghiSaiMay(diaChi);
        nhatKyDangNhap(nguoi, 'doi_mat_khau_that_bai', diaChi, { lyDo: 'sai mat khau cu' });
        throw new LoiNghiepVu('Mật khẩu cũ không đúng', 403);
      }
      if (matKhauMoi === matKhauCu) {
        throw new LoiNghiepVu('Mật khẩu mới phải khác mật khẩu cũ');
      }
      const loiMk = kiemTraMatKhau(matKhauMoi, nguoi.ten_dang_nhap);
      if (loiMk) {
        throw new LoiNghiepVu(loiMk);
      }
      await datMatKhau(db, nguoi, matKhauMoi, cauHinh.bcryptCost, false);
      const soPhienKhac = xacThuc.huyTatCaPhien(nguoi.id, req.phien.id);
      nhatKyDangNhap(nguoi, 'doi_mat_khau', diaChi, { soPhienBiDuaRa: soPhienKhac });
      res.json({ ok: true });
    })
  );
}

module.exports = { dangKyDangNhap };
