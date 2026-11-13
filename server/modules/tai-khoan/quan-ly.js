'use strict';
// quan-ly.js: API quan ly tai khoan va phan quyen (CHI admin).
//   GET    /nguoi-dung                    danh sach tai khoan
//   POST   /nguoi-dung                    tao tai khoan (mat khau tam, buoc doi lan dau)
//   PATCH  /nguoi-dung/:id                khoa / mo khoa, doi ho ten
//   POST   /nguoi-dung/:id/dat-lai-mat-khau
//   GET    /nguoi-dung/:id/quyen          bang tick muc / bo loc / bao cao / dinh dang xuat
//   PUT    /nguoi-dung/:id/quyen          luu quyen (canh bao + xac nhan khi cap quyen rui ro)
const { z } = require('zod');
const { phanTich, guiLoiDuLieu, boc, LoiNghiepVu } = require('./tien-ich');
const { taoTaiKhoan, datMatKhau, CAC_LOAI } = require('./dich-vu');

const lenhTao = z.object({
  tenDangNhap: z.string().min(1).max(64),
  hoTen: z.string().trim().min(1).max(100),
  loai: z.enum(CAC_LOAI.filter((l) => l !== 'admin')),
  matKhauTam: z.string().min(1).max(200),
});
const lenhSua = z
  .object({ hoTen: z.string().trim().min(1).max(100).optional(), biKhoa: z.boolean().optional() })
  .refine((d) => d.hoTen !== undefined || d.biKhoa !== undefined);
const lenhDatLai = z.object({ matKhauTam: z.string().min(1).max(200) });
const mapBool = z.record(z.string(), z.boolean());
const lenhQuyen = z.object({
  muc: mapBool.optional(),
  boLoc: mapBool.optional(),
  baoCao: mapBool.optional(),
  xuat: mapBool.optional(),
  xacNhan: z.array(z.string().max(100)).max(100).optional(),
});

// Ten truong trong lenh -> loai quyen luu trong bang quyen_tai_khoan
const LOAI_THEO_TRUONG = { muc: 'muc', boLoc: 'loc', baoCao: 'bao_cao', xuat: 'xuat' };

function dangKyQuanLy(router, boiCanh) {
  const { db, cauHinh, soDangKy, xacThuc, ghiNhatKy } = boiCanh;
  const chiAdmin = xacThuc.yeuCauAdmin;

  const mucTheoMa = new Map(soDangKy.muc.map((m) => [m.ma, m]));
  const boLocTheoId = new Map(soDangKy.boLoc.map((b) => [b.id, b]));
  const khoaHopLe = {
    muc: new Set(soDangKy.muc.map((m) => m.ma)),
    boLoc: new Set(soDangKy.boLoc.map((b) => b.id)),
    baoCao: new Set(soDangKy.baoCao.map((b) => b.id)),
    xuat: new Set(soDangKy.xuat.map((x) => x.id)),
  };

  const nhatKy = (req, hanhDong, doiTuongId, chiTiet) =>
    ghiNhatKy({
      taiKhoanId: req.nguoiDung.id,
      tenDangNhap: req.nguoiDung.tenDangNhap,
      hanhDong,
      doiTuong: 'tai_khoan',
      doiTuongId,
      chiTiet,
      may: xacThuc.layDiaChi(req),
    });

  function layNguoi(req) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      throw new LoiNghiepVu('Mã tài khoản không hợp lệ');
    }
    const nguoi = db.prepare('SELECT * FROM nguoi_dung WHERE id = ?').get(id);
    if (!nguoi) {
      throw new LoiNghiepVu('Không tìm thấy tài khoản', 404);
    }
    return nguoi;
  }

  const hienThiNguoi = (n) => ({
    id: n.id,
    tenDangNhap: n.ten_dang_nhap,
    hoTen: n.ho_ten,
    loai: n.loai,
    biKhoa: n.bi_khoa === 1,
    phaiDoiMatKhau: n.phai_doi_mat_khau === 1,
    khoaDen: n.khoa_den && Date.parse(n.khoa_den) > Date.now() ? n.khoa_den : null,
    taoLuc: n.created_at,
  });

  router.get('/nguoi-dung', chiAdmin, (req, res) => {
    res.json({ nguoiDung: db.prepare('SELECT * FROM nguoi_dung ORDER BY id').all().map(hienThiNguoi) });
  });

  router.post(
    '/nguoi-dung',
    chiAdmin,
    boc(async (req, res) => {
      const goi = phanTich(lenhTao, req.body);
      if (!goi.ok) {
        guiLoiDuLieu(res, goi.truong);
        return;
      }
      const { tenDangNhap, hoTen, loai, matKhauTam } = goi.du;
      const id = await taoTaiKhoan(db, soDangKy, { tenDangNhap, hoTen, loai, matKhau: matKhauTam, phaiDoiMatKhau: true }, cauHinh.bcryptCost);
      nhatKy(req, 'tao_tai_khoan', id, { tenDangNhap, loai });
      res.status(201).json({ id });
    })
  );

  router.patch(
    '/nguoi-dung/:id',
    chiAdmin,
    boc(async (req, res) => {
      const nguoi = layNguoi(req);
      const goi = phanTich(lenhSua, req.body);
      if (!goi.ok) {
        guiLoiDuLieu(res, goi.truong);
        return;
      }
      const { hoTen, biKhoa } = goi.du;
      if (biKhoa === true && (nguoi.loai === 'admin' || nguoi.id === req.nguoiDung.id)) {
        throw new LoiNghiepVu('Không thể khóa tài khoản admin hoặc chính mình');
      }
      db.transaction(() => {
        if (hoTen !== undefined) {
          db.prepare("UPDATE nguoi_dung SET ho_ten = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?").run(hoTen, nguoi.id);
        }
        if (biKhoa !== undefined) {
          db.prepare("UPDATE nguoi_dung SET bi_khoa = ?, so_lan_sai = 0, khoa_den = NULL, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?").run(biKhoa ? 1 : 0, nguoi.id);
          if (biKhoa) {
            xacThuc.huyTatCaPhien(nguoi.id);
          }
        }
      })();
      nhatKy(req, biKhoa === undefined ? 'sua_tai_khoan' : biKhoa ? 'khoa_tai_khoan' : 'mo_khoa_tai_khoan', nguoi.id, { tenDangNhap: nguoi.ten_dang_nhap });
      res.json({ ok: true });
    })
  );

  router.post(
    '/nguoi-dung/:id/dat-lai-mat-khau',
    chiAdmin,
    boc(async (req, res) => {
      const nguoi = layNguoi(req);
      if (nguoi.loai === 'admin') {
        throw new LoiNghiepVu('Admin tự đổi mật khẩu bằng chức năng "Đổi mật khẩu"');
      }
      const goi = phanTich(lenhDatLai, req.body);
      if (!goi.ok) {
        guiLoiDuLieu(res, goi.truong);
        return;
      }
      await datMatKhau(db, nguoi, goi.du.matKhauTam, cauHinh.bcryptCost, true);
      const soPhien = xacThuc.huyTatCaPhien(nguoi.id);
      nhatKy(req, 'dat_lai_mat_khau', nguoi.id, { tenDangNhap: nguoi.ten_dang_nhap, soPhienBiDuaRa: soPhien });
      res.json({ ok: true });
    })
  );

  // Trang thai quyen hien tai: { muc: {ma: bool}, boLoc: {...}, baoCao: {...}, xuat: {...} }
  function docTrangThaiQuyen(nguoiDungId) {
    const trangThai = { muc: {}, boLoc: {}, baoCao: {}, xuat: {} };
    for (const truong of Object.keys(trangThai)) {
      for (const khoa of khoaHopLe[truong]) {
        trangThai[truong][khoa] = false;
      }
    }
    const dong = db.prepare('SELECT loai, khoa, cho_phep FROM quyen_tai_khoan WHERE nguoi_dung_id = ?').all(nguoiDungId);
    for (const d of dong) {
      const truong = Object.keys(LOAI_THEO_TRUONG).find((t) => LOAI_THEO_TRUONG[t] === d.loai);
      if (truong && khoaHopLe[truong].has(d.khoa)) {
        trangThai[truong][d.khoa] = d.cho_phep === 1;
      }
    }
    return trangThai;
  }

  router.get('/nguoi-dung/:id/quyen', chiAdmin, (req, res) => {
    const nguoi = layNguoi(req);
    const tt = docTrangThaiQuyen(nguoi.id);
    res.json({
      nguoiDung: hienThiNguoi(nguoi),
      muc: soDangKy.muc.map((m) => ({ ma: m.ma, nhan: m.nhan || m.ma, nhayCam: Boolean(m.nhayCam), choPhep: tt.muc[m.ma] })),
      boLoc: soDangKy.boLoc.map((b) => ({ id: b.id, nhan: b.nhan || b.id, muc: b.muc, choPhep: tt.boLoc[b.id] })),
      baoCao: soDangKy.baoCao.map((b) => ({ id: b.id, nhan: b.nhan || b.id, mucCanCo: b.mucCanCo || [], choPhep: tt.baoCao[b.id] })),
      xuat: soDangKy.xuat.map((x) => ({ id: x.id, nhan: x.nhan || x.id, choPhep: tt.xuat[x.id] })),
    });
  });

  // Tinh cac canh bao can xac nhan khi chuyen tu trang thai cu sang moi.
  function tinhCanhBao(cu, moi) {
    const canhBao = [];
    for (const ma of Object.keys(moi.muc)) {
      const m = mucTheoMa.get(ma);
      if (m.nhayCam && moi.muc[ma] && !cu.muc[ma]) {
        canhBao.push({
          ma: 'muc:' + ma,
          noiDung: 'Cấp mục NHẠY CẢM "' + (m.nhan || ma) + '": tài khoản sẽ xem được toàn bộ dữ liệu thuộc mục này của mọi quân nhân.',
        });
      }
    }
    const ngoaiMuc = (tt, b) => tt.boLoc[b.id] && !tt.muc[b.muc];
    for (const b of soDangKy.boLoc) {
      if (ngoaiMuc(moi, b) && !ngoaiMuc(cu, b)) {
        const m = mucTheoMa.get(b.muc);
        canhBao.push({
          ma: 'loc:' + b.id,
          noiDung:
            'Bộ lọc "' + (b.nhan || b.id) + '" thuộc mục "' + (m.nhan || b.muc) + '" mà tài khoản KHÔNG được xem. ' +
            'Tài khoản chỉ thấy danh sách đã lọc nhưng có thể SUY RA thông tin của mục đó (ví dụ lọc theo "là đảng viên" thì biết ai là đảng viên).',
        });
      }
    }
    return canhBao;
  }

  router.put(
    '/nguoi-dung/:id/quyen',
    chiAdmin,
    boc(async (req, res) => {
      const nguoi = layNguoi(req);
      if (nguoi.loai === 'admin') {
        throw new LoiNghiepVu('Tài khoản admin luôn có toàn quyền, không chỉnh quyền được');
      }
      const goi = phanTich(lenhQuyen, req.body);
      if (!goi.ok) {
        guiLoiDuLieu(res, goi.truong);
        return;
      }
      const cu = docTrangThaiQuyen(nguoi.id);
      const moi = JSON.parse(JSON.stringify(cu));
      for (const truong of Object.keys(LOAI_THEO_TRUONG)) {
        for (const [khoa, giaTri] of Object.entries(goi.du[truong] || {})) {
          if (!khoaHopLe[truong].has(khoa)) {
            throw new LoiNghiepVu('Quyền không tồn tại: ' + truong + ':' + khoa);
          }
          moi[truong][khoa] = giaTri;
        }
      }
      const them = [];
      const bo = [];
      for (const truong of Object.keys(moi)) {
        for (const khoa of Object.keys(moi[truong])) {
          if (moi[truong][khoa] && !cu[truong][khoa]) {
            them.push(LOAI_THEO_TRUONG[truong] + ':' + khoa);
          } else if (!moi[truong][khoa] && cu[truong][khoa]) {
            bo.push(LOAI_THEO_TRUONG[truong] + ':' + khoa);
          }
        }
      }
      const canhBao = tinhCanhBao(cu, moi);
      const daXacNhan = new Set(goi.du.xacNhan || []);
      const chuaXacNhan = canhBao.filter((c) => !daXacNhan.has(c.ma));
      if (chuaXacNhan.length > 0) {
        res.status(409).json({ loi: 'Cần xác nhận các cảnh báo trước khi lưu quyền', ma: 'CAN_XAC_NHAN', canhBao: chuaXacNhan });
        return;
      }
      db.transaction(() => {
        const luu = db.prepare(
          `INSERT INTO quyen_tai_khoan (nguoi_dung_id, loai, khoa, cho_phep) VALUES (?, ?, ?, ?)
           ON CONFLICT (nguoi_dung_id, loai, khoa) DO UPDATE SET cho_phep = excluded.cho_phep`
        );
        for (const truong of Object.keys(moi)) {
          for (const khoa of Object.keys(moi[truong])) {
            if (moi[truong][khoa] !== cu[truong][khoa]) {
              luu.run(nguoi.id, LOAI_THEO_TRUONG[truong], khoa, moi[truong][khoa] ? 1 : 0);
            }
          }
        }
        nhatKy(req, 'doi_quyen', nguoi.id, {
          tenDangNhap: nguoi.ten_dang_nhap,
          them,
          bo,
          canhBaoDaXacNhan: canhBao.map((c) => c.ma),
        });
      })();
      res.json({ ok: true, them, bo });
    })
  );
}

module.exports = { dangKyQuanLy };
