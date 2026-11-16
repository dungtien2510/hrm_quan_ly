'use strict';
//   GET    /api/danh-muc/loai          cac loai danh muc (moi tai khoan da dang nhap)
//   GET    /api/danh-muc?loai=don_vi   cac muc cua mot loai (moi tai khoan da dang nhap, de do vao o chon)
//   POST   /api/danh-muc               them (chi admin)
//   PUT    /api/danh-muc/:id           sua ten, thu tu, mau, ngung dung, cha... (chi admin)
//   DELETE /api/danh-muc/:id           xoa neu chua ai dung (chi admin); neu da dung thi chi "ngung dung"
const { z } = require('zod');
const { phanTich, guiLoiDuLieu, boc, LoiNghiepVu } = require('../tai-khoan/tien-ich');

// Cac loai danh muc. cay: co cap cha-con. coTinhLaVang: chi trang thai. Ma "baoVe" khong duoc xoa/tat vi phan mem dung truc tiep.
const LOAI_DANH_MUC = [
  { loai: 'don_vi', nhan: 'Đơn vị', cay: true },
  { loai: 'quan_ham', nhan: 'Quân hàm' },
  { loai: 'chuc_vu', nhan: 'Chức vụ' },
  { loai: 'trang_thai', nhan: 'Trạng thái', coTinhLaVang: true, coMau: true, coDangKyTruoc: true, baoVe: ['co_mat'] },
  { loai: 'loai_phep', nhan: 'Loại phép' },
  { loai: 'hinh_thuc_khen_thuong', nhan: 'Hình thức khen thưởng' },
  { loai: 'dan_toc', nhan: 'Dân tộc' },
  { loai: 'ton_giao', nhan: 'Tôn giáo' },
  { loai: 'doi_tuong_chinh_sach', nhan: 'Đối tượng chính sách' },
  { loai: 'hoc_ham_hoc_vi', nhan: 'Học hàm, học vị' },
  { loai: 'hinh_thuc_dao_tao', nhan: 'Hình thức đào tạo' },
];
const THEO_LOAI = Object.fromEntries(LOAI_DANH_MUC.map((l) => [l.loai, l]));

const mauHex = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const luocDoTao = z
  .object({
    loai: z.string().max(40),
    ma: z.string().regex(/^[a-z0-9_]{1,40}$/),
    ten: z.string().trim().min(1).max(200),
    thu_tu: z.number().int().min(0).max(100000).optional(),
    mau: mauHex.nullable().optional(),
    tinh_la_vang: z.boolean().optional(),
    cho_dang_ky_truoc: z.boolean().optional(),
    cha_id: z.number().int().min(1).nullable().optional(),
  })
  .strict();
const luocDoSua = z
  .object({
    ten: z.string().trim().min(1).max(200).optional(),
    thu_tu: z.number().int().min(0).max(100000).optional(),
    mau: mauHex.nullable().optional(),
    tinh_la_vang: z.boolean().optional(),
    cho_dang_ky_truoc: z.boolean().optional(),
    dang_dung: z.boolean().optional(),
    cha_id: z.number().int().min(1).nullable().optional(),
  })
  .strict();

function dangKyDanhMuc(router, boiCanh) {
  const { db, xacThuc, ghiNhatKy } = boiCanh;
  const dangNhap = xacThuc.yeuCauDangNhap();
  const chiAdmin = xacThuc.yeuCauAdmin;

  const nhatKy = (req, hanhDong, id, chiTiet) =>
    ghiNhatKy({
      taiKhoanId: req.nguoiDung.id,
      tenDangNhap: req.nguoiDung.tenDangNhap,
      hanhDong,
      doiTuong: 'danh_muc',
      doiTuongId: id,
      chiTiet,
      may: xacThuc.layDiaChi(req),
    });

  function layMuc(chuoiId) {
    const id = Number(chuoiId);
    if (!Number.isInteger(id) || id < 1) {
      throw new LoiNghiepVu('Mã danh mục không hợp lệ');
    }
    const muc = db.prepare('SELECT * FROM danh_muc WHERE id = ?').get(id);
    if (!muc) {
      throw new LoiNghiepVu('Không tìm thấy mục danh mục', 404);
    }
    return muc;
  }

  // Cha phai cung loai, loai co cay, va khong tao vong lap (cha khong duoc la chinh no hay con chau cua no).
  function kiemTraCha(loai, chaId, id) {
    if (chaId === null || chaId === undefined) {
      return;
    }
    if (!THEO_LOAI[loai].cay) {
      throw new LoiNghiepVu('Loại danh mục này không có cấp cha-con');
    }
    const cha = db.prepare('SELECT id, loai FROM danh_muc WHERE id = ?').get(chaId);
    if (!cha || cha.loai !== loai) {
      throw new LoiNghiepVu('Mục cha không tồn tại hoặc khác loại');
    }
    let cur = cha.id;
    const daThay = new Set();
    while (cur !== null && cur !== undefined && !daThay.has(cur)) {
      if (id !== null && cur === id) {
        throw new LoiNghiepVu('Không thể chọn chính nó hoặc cấp dưới của nó làm cấp trên');
      }
      daThay.add(cur);
      const dong = db.prepare('SELECT cha_id FROM danh_muc WHERE id = ?').get(cur);
      cur = dong ? dong.cha_id : null;
    }
  }

  router.get('/loai', dangNhap, (req, res) => {
    res.json({ loai: LOAI_DANH_MUC });
  });

  router.get('/', dangNhap, (req, res) => {
    const loai = String(req.query.loai || '');
    if (!THEO_LOAI[loai]) {
      res.status(400).json({ loi: 'Loại danh mục không hợp lệ' });
      return;
    }
    const tatCa = req.query.tatCa === '1' && req.nguoiDung.loai === 'admin';
    const dong = db
      .prepare('SELECT id, loai, ma, ten, thu_tu, mau, tinh_la_vang, cho_dang_ky_truoc, dang_dung, cha_id FROM danh_muc WHERE loai = ? ORDER BY thu_tu, id')
      .all(loai)
      .filter((d) => tatCa || d.dang_dung === 1);
    res.json({ loai: THEO_LOAI[loai], dong });
  });

  router.post(
    '/',
    chiAdmin,
    boc(async (req, res) => {
      const goi = phanTich(luocDoTao, req.body);
      if (!goi.ok) {
        guiLoiDuLieu(res, goi.truong);
        return;
      }
      const d = goi.du;
      const cauHinh = THEO_LOAI[d.loai];
      if (!cauHinh) {
        throw new LoiNghiepVu('Loại danh mục không hợp lệ');
      }
      if (d.tinh_la_vang !== undefined && !cauHinh.coTinhLaVang) {
        throw new LoiNghiepVu('Chỉ loại "Trạng thái" mới có cờ "tính là vắng"');
      }
      if (d.cho_dang_ky_truoc !== undefined && !cauHinh.coDangKyTruoc) {
        throw new LoiNghiepVu('Chỉ loại "Trạng thái" mới có cờ "cho đăng ký trước"');
      }
      kiemTraCha(d.loai, d.cha_id, null);
      let id;
      try {
        id = db
          .prepare('INSERT INTO danh_muc (loai, ma, ten, thu_tu, mau, tinh_la_vang, cho_dang_ky_truoc, cha_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
          .run(d.loai, d.ma, d.ten, d.thu_tu === undefined ? 100 : d.thu_tu, d.mau || null, d.tinh_la_vang ? 1 : 0, d.cho_dang_ky_truoc ? 1 : 0, d.cha_id || null).lastInsertRowid;
      } catch (loi) {
        if (/UNIQUE/.test(loi.message)) {
          throw new LoiNghiepVu('Mã "' + d.ma + '" đã có trong loại này', 409);
        }
        throw loi;
      }
      nhatKy(req, 'them_danh_muc', Number(id), { loai: d.loai, ma: d.ma });
      res.status(201).json({ id: Number(id) });
    })
  );

  router.put(
    '/:id',
    chiAdmin,
    boc(async (req, res) => {
      const muc = layMuc(req.params.id);
      const goi = phanTich(luocDoSua, req.body);
      if (!goi.ok) {
        guiLoiDuLieu(res, goi.truong);
        return;
      }
      const d = goi.du;
      const cauHinh = THEO_LOAI[muc.loai];
      const baoVe = (cauHinh && cauHinh.baoVe) || [];
      if (baoVe.includes(muc.ma) && (d.dang_dung === false || d.tinh_la_vang !== undefined || d.cho_dang_ky_truoc !== undefined || d.cha_id)) {
        throw new LoiNghiepVu('Mục "' + muc.ten + '" là mục mặc định của phần mềm: chỉ đổi được tên, màu và thứ tự');
      }
      if (d.tinh_la_vang !== undefined && !(cauHinh && cauHinh.coTinhLaVang)) {
        throw new LoiNghiepVu('Chỉ loại "Trạng thái" mới có cờ "tính là vắng"');
      }
      if (d.cho_dang_ky_truoc !== undefined && !(cauHinh && cauHinh.coDangKyTruoc)) {
        throw new LoiNghiepVu('Chỉ loại "Trạng thái" mới có cờ "cho đăng ký trước"');
      }
      if (d.cha_id !== undefined) {
        kiemTraCha(muc.loai, d.cha_id, muc.id);
      }
      const moi = {
        ten: d.ten === undefined ? muc.ten : d.ten,
        thu_tu: d.thu_tu === undefined ? muc.thu_tu : d.thu_tu,
        mau: d.mau === undefined ? muc.mau : d.mau,
        tinh_la_vang: d.tinh_la_vang === undefined ? muc.tinh_la_vang : d.tinh_la_vang ? 1 : 0,
        cho_dang_ky_truoc: d.cho_dang_ky_truoc === undefined ? muc.cho_dang_ky_truoc : d.cho_dang_ky_truoc ? 1 : 0,
        dang_dung: d.dang_dung === undefined ? muc.dang_dung : d.dang_dung ? 1 : 0,
        cha_id: d.cha_id === undefined ? muc.cha_id : d.cha_id,
      };
      db.prepare('UPDATE danh_muc SET ten = ?, thu_tu = ?, mau = ?, tinh_la_vang = ?, cho_dang_ky_truoc = ?, dang_dung = ?, cha_id = ? WHERE id = ?').run(
        moi.ten, moi.thu_tu, moi.mau, moi.tinh_la_vang, moi.cho_dang_ky_truoc, moi.dang_dung, moi.cha_id, muc.id
      );
      nhatKy(req, 'sua_danh_muc', muc.id, { loai: muc.loai, ma: muc.ma, truongDoi: Object.keys(d) });
      res.json({ ok: true });
    })
  );

  router.delete(
    '/:id',
    chiAdmin,
    boc(async (req, res) => {
      const muc = layMuc(req.params.id);
      const cauHinh = THEO_LOAI[muc.loai];
      if (cauHinh && cauHinh.baoVe && cauHinh.baoVe.includes(muc.ma)) {
        throw new LoiNghiepVu('Mục "' + muc.ten + '" là mục mặc định của phần mềm, không xóa được');
      }
      const con = db.prepare('SELECT COUNT(*) AS n FROM danh_muc WHERE cha_id = ?').get(muc.id).n;
      if (con > 0) {
        throw new LoiNghiepVu('Mục này còn ' + con + ' mục cấp dưới. Hãy xóa hoặc chuyển các mục đó trước.', 409);
      }
      try {
        db.prepare('DELETE FROM danh_muc WHERE id = ?').run(muc.id);
      } catch (loi) {
        if (/FOREIGN KEY/.test(loi.message)) {
          throw new LoiNghiepVu('Mục này đang được dùng trong hồ sơ nên không xóa được. Hãy chọn "Ngừng dùng" để ẩn khỏi danh sách chọn.', 409, { ma: 'DANG_DUOC_DUNG' });
        }
        throw loi;
      }
      nhatKy(req, 'xoa_danh_muc', muc.id, { loai: muc.loai, ma: muc.ma });
      res.json({ ok: true });
    })
  );
}

module.exports = { dangKyDanhMuc, LOAI_DANH_MUC };
