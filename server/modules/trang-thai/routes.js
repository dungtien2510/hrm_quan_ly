'use strict';
//   GET    /api/trang-thai/quan-nhan/:id   cac khoang trang thai cua mot nguoi (can muc trang_thai)
//   POST   /api/trang-thai/quan-nhan/:id   them khoang (chi admin)
//   PUT    /api/trang-thai/:id             sua khoang (chi admin)
//   DELETE /api/trang-thai/:id             xoa khoang (chi admin)
// Khong cho hai khoang cua mot nguoi chong nhau (tinh ca ngay dau va ngay cuoi).
const { z } = require('zod');
const { chuanHoaNgayDu, ngayDuongLich } = require('../../../shared/ngay-chuoi.js');
const { ngayDuSangHienThi } = require('../../../shared/bieu-mau.js');
const { phanTich, guiLoiDuLieu, boc, LoiNghiepVu } = require('../tai-khoan/tien-ich');
const { trangThaiNgay, timKhoangChong } = require('./trang-thai-ngay');

const luocDo = z
  .object({
    trang_thai_id: z.number().int().min(1),
    tu_ngay: z.string().max(20),
    den_ngay: z.string().max(20).nullable().optional(),
    ly_do_hoac_noi: z.string().max(500).nullable().optional(),
  })
  .strict();

function dangKyTrangThai(router, boiCanh) {
  const { db, xacThuc, ghiNhatKy } = boiCanh;
  const doc = [xacThuc.yeuCauDangNhap(), xacThuc.yeuCauMuc('trang_thai')];
  const ghi = [xacThuc.yeuCauAdmin];

  const nhatKy = (req, hanhDong, quanNhanId, chiTiet) =>
    ghiNhatKy({
      taiKhoanId: req.nguoiDung.id,
      tenDangNhap: req.nguoiDung.tenDangNhap,
      hanhDong,
      doiTuong: 'trang_thai_quan_nhan',
      doiTuongId: quanNhanId,
      chiTiet,
      may: xacThuc.layDiaChi(req),
    });

  const soNguyen = (chuoi, ten) => {
    const so = Number(chuoi);
    if (!Number.isInteger(so) || so < 1) {
      throw new LoiNghiepVu(ten + ' không hợp lệ');
    }
    return so;
  };

  function layQuanNhan(id) {
    const hang = db.prepare('SELECT id FROM quan_nhan WHERE id = ? AND da_xoa = 0').get(id);
    if (!hang) {
      throw new LoiNghiepVu('Không tìm thấy hồ sơ', 404);
    }
  }

  // Kiem tra du lieu gui len, doi ngay, kiem tra loai trang thai va khoang chong nhau.
  function chuanBi(du, quanNhanId, boQuaDongId) {
    let tu;
    let den = null;
    try {
      tu = chuanHoaNgayDu(du.tu_ngay);
      den = du.den_ngay ? chuanHoaNgayDu(du.den_ngay) : null;
    } catch (e) {
      throw new LoiNghiepVu(e.message);
    }
    if (!tu) {
      throw new LoiNghiepVu('Cần nhập "từ ngày"');
    }
    if (den && den < tu) {
      throw new LoiNghiepVu('"Đến ngày" không được trước "từ ngày"');
    }
    const loai = db.prepare("SELECT id, ma, ten, dang_dung, cho_dang_ky_truoc FROM danh_muc WHERE id = ? AND loai = 'trang_thai'").get(du.trang_thai_id);
    if (!loai) {
      throw new LoiNghiepVu('Loại trạng thái không có trong danh mục');
    }
    // Ngay o tuong lai: chi cac loai duoc phep dang ky truoc (vd nghi phep, cong tac).
    // Loai con lai (benh vien, benh xa...) chi ghi nhan viec DA/DANG xay ra: "tu ngay" va "den ngay" khong sau hom nay;
    // neu van dang o trang thai do thi de trong "den ngay" (he thong hieu la chua ket thuc).
    if (!loai.cho_dang_ky_truoc) {
      const homNay = ngayDuongLich();
      const duocTruoc = db
        .prepare("SELECT ten FROM danh_muc WHERE loai = 'trang_thai' AND cho_dang_ky_truoc = 1 AND dang_dung = 1 ORDER BY thu_tu, id")
        .all()
        .map((d) => '"' + d.ten + '"');
      const goiY = duocTruoc.length > 0 ? ' Chỉ ' + duocTruoc.join(', ') + ' mới đăng ký trước được (đổi ở màn hình Danh mục).' : '';
      if (tu > homNay) {
        throw new LoiNghiepVu(
          'Trạng thái "' + loai.ten + '" không đăng ký trước được: "từ ngày" ' + ngayDuSangHienThi(tu) + ' đang ở tương lai (hôm nay là ' + ngayDuSangHienThi(homNay) + ').' + goiY,
          400,
          { ma: 'NGAY_TUONG_LAI' }
        );
      }
      if (den && den > homNay) {
        throw new LoiNghiepVu(
          'Trạng thái "' + loai.ten + '": "đến ngày" ' + ngayDuSangHienThi(den) + ' đang ở tương lai. Nếu vẫn đang ở trạng thái này thì để trống "đến ngày" (hiểu là chưa kết thúc).' + goiY,
          400,
          { ma: 'NGAY_TUONG_LAI' }
        );
      }
    }
    const chong = timKhoangChong(db, quanNhanId, tu, den, boQuaDongId);
    if (chong) {
      throw new LoiNghiepVu(
        'Khoảng thời gian bị chồng với trạng thái "' + chong.ten + '" (' + ngayDuSangHienThi(chong.tu_ngay) + ' – ' +
          (chong.den_ngay ? ngayDuSangHienThi(chong.den_ngay) : 'chưa kết thúc') + '). Hãy sửa hoặc kết thúc khoảng đó trước.',
        409,
        { ma: 'TRUNG_KHOANG_NGAY', xungDot: { id: chong.dong_id, trang_thai: chong.ten, tu_ngay: chong.tu_ngay, den_ngay: chong.den_ngay } }
      );
    }
    return { tu, den, loai };
  }

  router.get('/quan-nhan/:id', ...doc, (req, res) => {
    const id = soNguyen(req.params.id, 'Mã hồ sơ');
    layQuanNhan(id);
    const dong = db
      .prepare(
        `SELECT t.id, t.trang_thai_id, d.ma AS ma_trang_thai, d.ten AS ten_trang_thai, d.mau, d.tinh_la_vang, t.tu_ngay, t.den_ngay, t.ly_do_hoac_noi
           FROM trang_thai_quan_nhan t JOIN danh_muc d ON d.id = t.trang_thai_id WHERE t.quan_nhan_id = ? ORDER BY t.tu_ngay DESC, t.id DESC`
      )
      .all(id);
    res.json({ dong, homNay: trangThaiNgay(db, id) });
  });

  router.post(
    '/quan-nhan/:id',
    ...ghi,
    boc(async (req, res) => {
      const id = soNguyen(req.params.id, 'Mã hồ sơ');
      layQuanNhan(id);
      const goi = phanTich(luocDo, req.body);
      if (!goi.ok) {
        guiLoiDuLieu(res, goi.truong);
        return;
      }
      const { tu, den, loai } = chuanBi(goi.du, id, null);
      const dongId = db
        .prepare('INSERT INTO trang_thai_quan_nhan (quan_nhan_id, trang_thai_id, tu_ngay, den_ngay, ly_do_hoac_noi) VALUES (?, ?, ?, ?, ?)')
        .run(id, loai.id, tu, den, goi.du.ly_do_hoac_noi || null).lastInsertRowid;
      nhatKy(req, 'them_trang_thai', id, { dongId: Number(dongId), trangThai: loai.ma, tu, den });
      res.status(201).json({ id: Number(dongId) });
    })
  );

  router.put(
    '/:id',
    ...ghi,
    boc(async (req, res) => {
      const dongId = soNguyen(req.params.id, 'Mã dòng trạng thái');
      const cu = db.prepare('SELECT * FROM trang_thai_quan_nhan WHERE id = ?').get(dongId);
      if (!cu) {
        throw new LoiNghiepVu('Không tìm thấy khoảng trạng thái', 404);
      }
      const goi = phanTich(luocDo, req.body);
      if (!goi.ok) {
        guiLoiDuLieu(res, goi.truong);
        return;
      }
      const { tu, den, loai } = chuanBi(goi.du, cu.quan_nhan_id, dongId);
      db.prepare(
        "UPDATE trang_thai_quan_nhan SET trang_thai_id = ?, tu_ngay = ?, den_ngay = ?, ly_do_hoac_noi = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?"
      ).run(loai.id, tu, den, goi.du.ly_do_hoac_noi || null, dongId);
      nhatKy(req, 'sua_trang_thai', cu.quan_nhan_id, { dongId, trangThai: loai.ma, tu, den });
      res.json({ ok: true });
    })
  );

  router.delete(
    '/:id',
    ...ghi,
    boc(async (req, res) => {
      const dongId = soNguyen(req.params.id, 'Mã dòng trạng thái');
      const cu = db.prepare('SELECT * FROM trang_thai_quan_nhan WHERE id = ?').get(dongId);
      if (!cu) {
        throw new LoiNghiepVu('Không tìm thấy khoảng trạng thái', 404);
      }
      db.prepare('DELETE FROM trang_thai_quan_nhan WHERE id = ?').run(dongId);
      nhatKy(req, 'xoa_trang_thai', cu.quan_nhan_id, { dongId, tu: cu.tu_ngay, den: cu.den_ngay });
      res.json({ ok: true });
    })
  );
}

module.exports = { dangKyTrangThai };
