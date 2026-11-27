'use strict';
// API nhap du lieu tu Excel (CHI admin). Ba buoc: tai mau -> kiem tra file (chua ghi gi) -> ap dung.
//   GET  /api/nhap-excel/mau                    tai file Excel mau
//   POST /api/nhap-excel/kiem-tra?che_do=...    body = noi dung file .xlsx; tra ve bao cao loi / tom tat
//   POST /api/nhap-excel/ap-dung?che_do=...&them_danh_muc=1&sha256=...&xac_nhan=...   gui LAI file; kiem tra lai roi ghi
// "Ap dung" luon kiem tra lai file o may chu: khong tin ket qua kiem tra truoc do cua trinh duyet.
const crypto = require('crypto');
const express = require('express');
const { z } = require('zod');
const { boDau } = require('../../../shared/ngay-chuoi.js');
const { phanTich, guiLoiDuLieu, boc, LoiNghiepVu } = require('../tai-khoan/tien-ich');
const { kiemTraTep } = require('./kiem-tra');
const { apDung } = require('./ap-dung');
const { taoMau } = require('./mau');

const CHU_XAC_NHAN = 'THAY THẾ';
const luocDoThamSo = z.object({
  che_do: z.enum(['them_hoac_cap_nhat', 'thay_the']).default('them_hoac_cap_nhat'),
  them_danh_muc: z.enum(['0', '1']).optional(),
  sha256: z.string().regex(/^[0-9a-f]{64}$/).optional(),
  xac_nhan: z.string().max(40).optional(),
});

function dangKyNhapExcel(router, boiCanh) {
  const { db, xacThuc, ghiNhatKy, saoLuu } = boiCanh;
  const chiAdmin = xacThuc.yeuCauAdmin;
  const nhanTep = express.raw({ type: () => true, limit: '10mb' });

  const nhatKy = (req, hanhDong, chiTiet) =>
    ghiNhatKy({
      taiKhoanId: req.nguoiDung.id,
      tenDangNhap: req.nguoiDung.tenDangNhap,
      hanhDong,
      doiTuong: 'nhap_excel',
      chiTiet,
      may: xacThuc.layDiaChi(req),
    });

  function layTep(req, res) {
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      res.status(400).json({ loi: 'Chưa nhận được nội dung file Excel (.xlsx).', ma: 'KHONG_CO_TEP' });
      return null;
    }
    return req.body;
  }

  router.get(
    '/mau',
    chiAdmin,
    boc(async (req, res) => {
      const buf = await taoMau(db);
      nhatKy(req, 'tai_mau_nhap_excel', null);
      res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="mau-nhap-quan-nhan.xlsx"',
        'Cache-Control': 'no-store',
      });
      res.send(Buffer.from(buf));
    })
  );

  router.post(
    '/kiem-tra',
    chiAdmin,
    nhanTep,
    boc(async (req, res) => {
      const goi = phanTich(luocDoThamSo, req.query);
      if (!goi.ok) {
        guiLoiDuLieu(res, goi.truong);
        return;
      }
      const tep = layTep(req, res);
      if (!tep) {
        return;
      }
      const sha256 = crypto.createHash('sha256').update(tep).digest('hex');
      const { baoCao } = await kiemTraTep(db, tep, { cheDo: goi.du.che_do });
      baoCao.sha256 = sha256;
      baoCao.kichThuoc = tep.length;
      baoCao.coTheApDung = baoCao.soLoi === undefined ? false : baoCao.soLoi === 0;
      nhatKy(req, 'nhap_excel_kiem_tra', { cheDo: goi.du.che_do, sha256, kichThuoc: tep.length, soLoi: baoCao.soLoi, them: baoCao.tomTat.them, capNhat: baoCao.tomTat.capNhat });
      res.json(baoCao);
    })
  );

  router.post(
    '/ap-dung',
    chiAdmin,
    nhanTep,
    boc(async (req, res) => {
      const goi = phanTich(luocDoThamSo, req.query);
      if (!goi.ok) {
        guiLoiDuLieu(res, goi.truong);
        return;
      }
      const { che_do: cheDo, them_danh_muc: themDm, sha256: shaKiemTra, xac_nhan: xacNhan } = goi.du;
      const tep = layTep(req, res);
      if (!tep) {
        return;
      }
      const sha256 = crypto.createHash('sha256').update(tep).digest('hex');
      if (shaKiemTra && shaKiemTra !== sha256) {
        throw new LoiNghiepVu('File gửi lên khác với file đã kiểm tra. Hãy kiểm tra lại file.', 409, { ma: 'TEP_KHAC' });
      }
      // Kiem tra lai TOAN BO o may chu truoc khi ghi
      const { baoCao, plan } = await kiemTraTep(db, tep, { cheDo });
      if (baoCao.loi.length > 0 || !plan) {
        res.status(400).json({ loi: 'File còn ' + (baoCao.soLoi || baoCao.loi.length) + ' lỗi, chưa nhập gì. Hãy sửa file và kiểm tra lại.', ma: 'CON_LOI', soLoi: baoCao.soLoi });
        return;
      }
      if (plan.danhMucMoi.length > 0 && themDm !== '1') {
        throw new LoiNghiepVu('File có ' + plan.danhMucMoi.length + ' mục chưa có trong danh mục. Hãy xác nhận thêm vào danh mục, hoặc sửa tên trong file.', 409, {
          ma: 'CAN_XAC_NHAN_DANH_MUC',
          danhMucLa: baoCao.danhMucLa,
        });
      }
      if (cheDo === 'thay_the' && boDau(xacNhan || '').trim() !== boDau(CHU_XAC_NHAN)) {
        throw new LoiNghiepVu('Chế độ thay thế xóa toàn bộ hồ sơ hiện có. Hãy gõ chữ "' + CHU_XAC_NHAN + '" để xác nhận.', 409, { ma: 'CAN_GO_XAC_NHAN', chuXacNhan: CHU_XAC_NHAN });
      }

      let banSaoLuu = null;
      if (cheDo === 'thay_the') {
        banSaoLuu = saoLuu('truoc-nhap-thay-the'); // nem loi neu khong sao luu duoc -> KHONG xoa gi
        nhatKy(req, 'sao_luu_truoc_nhap', { kichThuoc: banSaoLuu.kichThuoc });
      }
      const ketQua = apDung(db, plan);
      nhatKy(req, 'nhap_excel_ap_dung', {
        cheDo,
        sha256,
        soThem: ketQua.soThem,
        soCapNhat: ketQua.soCapNhat,
        soChiCon: ketQua.soChiCon,
        soXoaTruoc: ketQua.soXoaTruoc,
        soDanhMucMoi: ketQua.soDanhMucMoi,
        soDongCon: ketQua.soDongCon,
        coSaoLuu: Boolean(banSaoLuu),
      });
      res.json({ ok: true, ...ketQua, banSaoLuu: banSaoLuu ? banSaoLuu.duongDan : null });
    })
  );
}

module.exports = { dangKyNhapExcel, CHU_XAC_NHAN };
