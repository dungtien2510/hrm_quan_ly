'use strict';
// ghi.js: them, sua, xoa mem ho so (CHI admin). Kiem tra bang zod; "khoa lac quan" theo cot version:
// neu nguoi khac da sua ho so sau khi ban mo thi luu bi tu choi 409 (khong ghi de len thay doi cua ho).
//   POST   /api/quan-nhan                   { quan_nhan: {...}, than_nhan: [...], luong: [...], ... }
//   PUT    /api/quan-nhan/:id               { version, quan_nhan: {...}, <bang con>: [...] } (bang con nao co mat thi duoc thay het)
//   DELETE /api/quan-nhan/:id?version=N     xoa mem
// Nhat ky chi ghi TEN cac truong da doi, KHONG ghi gia tri (de khong lo can cuoc, luong...).
const { z } = require('zod');
const { TRUONG, QUAN_HE_THEO_NHOM } = require('../../../shared/truong-muc.js');
const { bieuMauSangCot, taoTimKiem, truongCuaBang } = require('../../../shared/bieu-mau.js');
const { ngayDuongLich } = require('../../../shared/ngay-chuoi.js');
const { phanTich, guiLoiDuLieu, boc, LoiNghiepVu } = require('../tai-khoan/tien-ich');
const { chenDong, capNhatQuanNhanTheoPhienBan } = require('./ghi-sql');
const { BANG_CON } = require('./ho-so');

function kieuZod(t) {
  switch (t.kieu) {
    case 'chu':
      return z.string().max(1000).nullable().optional();
    case 'so':
      return z.union([z.number(), z.string().max(30)]).nullable().optional();
    case 'ngay_du':
    case 'ngay_thieu':
      return z.string().max(20).nullable().optional();
    case 'lua_chon':
      return z.union([z.number(), z.string().max(60)]).nullable().optional();
    default:
      return z.boolean().nullable().optional();
  }
}

function luocDoDong(bang) {
  const hinh = {};
  for (const t of truongCuaBang(bang)) {
    hinh[t.truong] = kieuZod(t);
  }
  return z.object(hinh).strict();
}

const hinhCon = Object.fromEntries(BANG_CON.map((b) => [b, z.array(luocDoDong(b)).max(200).optional()]));
const luocDoThem = z.object({ quan_nhan: luocDoDong('quan_nhan'), ...hinhCon }).strict();
const luocDoSua = z.object({ version: z.number().int().min(1), quan_nhan: luocDoDong('quan_nhan'), ...hinhCon }).strict();
const luocDoXoa = z.object({ version: z.coerce.number().int().min(1) });

function dangKyGhi(router, boiCanh) {
  const { db, xacThuc, ghiNhatKy } = boiCanh;
  const chiAdmin = xacThuc.yeuCauAdmin;

  const nhatKy = (req, hanhDong, id, chiTiet) =>
    ghiNhatKy({
      taiKhoanId: req.nguoiDung.id,
      tenDangNhap: req.nguoiDung.tenDangNhap,
      hanhDong,
      doiTuong: 'quan_nhan',
      doiTuongId: id,
      chiTiet,
      may: xacThuc.layDiaChi(req),
    });

  const kiemTraDanhMuc = db.prepare('SELECT 1 FROM danh_muc WHERE id = ? AND loai = ?');

  // Chuyen mot dong bieu mau thanh cac cot SQL, kiem tra danh muc; loi gom vao danhSachLoi.
  function chuyenDong(bang, bieuMau, chiSo, danhSachLoi) {
    // Ngay o tuong lai bi tu choi (tru cac truong duoc phep); "hom nay" theo gio dia phuong cua may chu.
    const { cot, loi } = bieuMauSangCot(bang, bieuMau, { homNay: ngayDuongLich() });
    const them = (truong, thongBao) => danhSachLoi.push({ bang, dong: chiSo, truong, thongBao });
    for (const [truong, thongBao] of Object.entries(loi)) {
      them(truong, thongBao);
    }
    for (const t of truongCuaBang(bang)) {
      if (t.danhMuc && cot[t.cot[0]] !== null && cot[t.cot[0]] !== undefined && !loi[t.truong]) {
        if (!kiemTraDanhMuc.get(cot[t.cot[0]], t.danhMuc)) {
          them(t.truong, 'Giá trị không có trong danh mục');
        }
      }
    }
    if (bang === 'than_nhan' && cot.nhom && cot.quan_he && !QUAN_HE_THEO_NHOM[cot.nhom].includes(cot.quan_he)) {
      them('quan_he', 'Quan hệ này không dùng được trong nhóm ' + (cot.nhom === 'vo_chong' ? 'B.II (gia đình vợ/chồng)' : 'B.I'));
    }
    return cot;
  }

  function chuanBi(du) {
    const danhSachLoi = [];
    const quanNhan = chuyenDong('quan_nhan', du.quan_nhan, null, danhSachLoi);
    const con = {};
    for (const bang of BANG_CON) {
      if (du[bang] !== undefined) {
        con[bang] = du[bang].map((bieuMau, i) => chuyenDong(bang, bieuMau, i, danhSachLoi));
      }
    }
    if (danhSachLoi.length > 0) {
      throw new LoiNghiepVu('Dữ liệu chưa hợp lệ (' + danhSachLoi.length + ' lỗi)', 400, { ma: 'DU_LIEU_SAI', chiTiet: danhSachLoi });
    }
    return { quanNhan: Object.assign(quanNhan, { tim_kiem: taoTimKiem(quanNhan) }), con };
  }

  const truongDoi = (cu, moi) =>
    TRUONG.filter((t) => t.bang === 'quan_nhan' && t.cot.some((c) => (cu[c] === undefined ? null : cu[c]) !== (moi[c] === undefined ? null : moi[c]))).map((t) => t.truong);

  function loiTrungMa(loi, ma) {
    return /UNIQUE/.test(loi.message) && /ma_quan_nhan/.test(loi.message)
      ? new LoiNghiepVu('Mã quân nhân "' + ma + '" đã có hồ sơ khác dùng', 409, { ma: 'TRUNG_MA' })
      : loi;
  }

  router.post(
    '/',
    chiAdmin,
    boc(async (req, res) => {
      const goi = phanTich(luocDoThem, req.body);
      if (!goi.ok) {
        guiLoiDuLieu(res, goi.truong);
        return;
      }
      const { quanNhan, con } = chuanBi(goi.du);
      let id;
      try {
        id = db.transaction(() => {
          const moiId = chenDong(db, 'quan_nhan', quanNhan);
          for (const [bang, dsDong] of Object.entries(con)) {
            for (const dong of dsDong) {
              chenDong(db, bang, Object.assign({ quan_nhan_id: moiId }, dong));
            }
          }
          return moiId;
        })();
      } catch (loi) {
        throw loiTrungMa(loi, quanNhan.ma_quan_nhan);
      }
      nhatKy(req, 'tao_ho_so', id, { maQuanNhan: quanNhan.ma_quan_nhan, cacBang: Object.fromEntries(Object.entries(con).map(([b, d]) => [b, d.length])) });
      res.status(201).json({ id, version: 1 });
    })
  );

  router.put(
    '/:id',
    chiAdmin,
    boc(async (req, res) => {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id < 1) {
        throw new LoiNghiepVu('Mã hồ sơ không hợp lệ');
      }
      const goi = phanTich(luocDoSua, req.body);
      if (!goi.ok) {
        guiLoiDuLieu(res, goi.truong);
        return;
      }
      const cu = db.prepare('SELECT * FROM quan_nhan WHERE id = ? AND da_xoa = 0').get(id);
      if (!cu) {
        throw new LoiNghiepVu('Không tìm thấy hồ sơ', 404);
      }
      const { quanNhan, con } = chuanBi(goi.du);
      const cacBangDoi = {};
      try {
        db.transaction(() => {
          const soDong = capNhatQuanNhanTheoPhienBan(db, id, goi.du.version, quanNhan);
          if (soDong === 0) {
            const hienTai = db.prepare('SELECT version FROM quan_nhan WHERE id = ?').get(id);
            throw new LoiNghiepVu(
              'Hồ sơ này đã được người khác sửa (phiên bản ' + hienTai.version + ') sau khi bạn mở. Hãy tải lại hồ sơ rồi sửa tiếp để không ghi đè thay đổi của họ.',
              409,
              { ma: 'XUNG_DOT_PHIEN_BAN', phienBanHienTai: hienTai.version }
            );
          }
          for (const [bang, dsDong] of Object.entries(con)) {
            const truoc = db.prepare('DELETE FROM ' + bang + ' WHERE quan_nhan_id = ?').run(id).changes;
            for (const dong of dsDong) {
              chenDong(db, bang, Object.assign({ quan_nhan_id: id }, dong));
            }
            cacBangDoi[bang] = { truoc, sau: dsDong.length };
          }
        })();
      } catch (loi) {
        throw loiTrungMa(loi, quanNhan.ma_quan_nhan);
      }
      nhatKy(req, 'sua_ho_so', id, { maQuanNhan: quanNhan.ma_quan_nhan, truongDoi: truongDoi(cu, quanNhan), cacBangThayThe: cacBangDoi, phienBanMoi: goi.du.version + 1 });
      res.json({ id, version: goi.du.version + 1 });
    })
  );

  router.delete(
    '/:id',
    chiAdmin,
    boc(async (req, res) => {
      const id = Number(req.params.id);
      const goi = phanTich(luocDoXoa, req.query);
      if (!Number.isInteger(id) || id < 1 || !goi.ok) {
        throw new LoiNghiepVu('Cần mã hồ sơ và version hợp lệ');
      }
      const cu = db.prepare('SELECT ma_quan_nhan FROM quan_nhan WHERE id = ? AND da_xoa = 0').get(id);
      if (!cu) {
        throw new LoiNghiepVu('Không tìm thấy hồ sơ', 404);
      }
      const kq = db
        .prepare("UPDATE quan_nhan SET da_xoa = 1, version = version + 1, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ? AND version = ? AND da_xoa = 0")
        .run(id, goi.du.version);
      if (kq.changes === 0) {
        const hienTai = db.prepare('SELECT version FROM quan_nhan WHERE id = ?').get(id);
        throw new LoiNghiepVu('Hồ sơ đã được người khác sửa sau khi bạn mở. Hãy tải lại trước khi xóa.', 409, { ma: 'XUNG_DOT_PHIEN_BAN', phienBanHienTai: hienTai.version });
      }
      nhatKy(req, 'xoa_ho_so', id, { maQuanNhan: cu.ma_quan_nhan, kieu: 'xoa_mem' });
      res.json({ ok: true });
    })
  );
}

module.exports = { dangKyGhi };
