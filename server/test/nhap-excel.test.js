'use strict';
// Kiem thu nhap du lieu tu Excel: mau, kiem tra (khong ghi gi), ap dung (mot giao dich), che do thay the. Chay: npm test
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const ExcelJS = require('exceljs');
const Database = require('better-sqlite3');
const { dungMayThu, Khach, MAT_KHAU } = require('./tro-giup');
const { truongCuaBang } = require('../../shared/bieu-mau.js');
const { kiemTraTep } = require('../modules/nhap-excel/kiem-tra');
const { apDung } = require('../modules/nhap-excel/ap-dung');

const TEP = (ten) => fs.readFileSync(path.join(__dirname, 'tep-mau', ten + '.xlsx'));
const HOP_LE = () => TEP('nhap-3-quan-nhan-hop-le');
const DONG_LOI = () => TEP('nhap-3-dong-loi');

async function dang(may, ten) {
  const khach = new Khach(may.goc);
  assert.strictEqual((await khach.dangNhap(ten, MAT_KHAU[ten])).ma, 200);
  return khach;
}
const dem = (db, bang) => db.prepare('SELECT COUNT(*) AS n FROM ' + bang).get().n;
const anhChup = (db) => ({
  quan_nhan: dem(db, 'quan_nhan'), than_nhan: dem(db, 'than_nhan'), luong: dem(db, 'luong'), danh_muc: dem(db, 'danh_muc'),
  trang_thai: dem(db, 'trang_thai_quan_nhan'), dao_tao: dem(db, 'dao_tao'),
});

// Tao file Excel nho tu mang cac dong. sheets: { ten_sheet: [header, dong1, null (dong trong), dong2...] }
async function taoTep(sheets) {
  const wb = new ExcelJS.Workbook();
  for (const [ten, dongs] of Object.entries(sheets)) {
    const ws = wb.addWorksheet(ten);
    dongs.forEach((d, i) => {
      if (d) {
        d.forEach((v, j) => {
          ws.getCell(i + 1, j + 1).value = v;
        });
      }
    });
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}
const DAU = ['ma_quan_nhan', 'ho_ten_khai_sinh', 'ngay_sinh', 'gioi_tinh', 'que_quan', 'don_vi', 'quan_ham', 'ngay_tuyen_dung_lan_dau'];
const NGUOI = (ma, them = {}) => {
  const g = { ma_quan_nhan: ma, ho_ten_khai_sinh: 'NGUYEN VAN ' + ma, ngay_sinh: '01/01/1999', gioi_tinh: 'Nam', que_quan: 'Que X', don_vi: 'Đại đội mẫu 1', quan_ham: 'Đại úy', ngay_tuyen_dung_lan_dau: '09/2017', ...them };
  return DAU.map((c) => g[c]);
};
const loiTheoViTri = (bc) => bc.loi.map((l) => l.sheet + ' dong ' + l.dong + ' cot ' + l.cot);

test('quyen: chi admin; thieu file thi bao ro', async () => {
  const may = await dungMayThu();
  try {
    const admin = await dang(may, 'qtri');
    for (const ten of ['daydu', 'motso']) {
      const k = await dang(may, ten);
      assert.strictEqual((await k.goi('GET', '/api/nhap-excel/mau')).ma, 403);
      assert.strictEqual((await k.guiTep('POST', '/api/nhap-excel/kiem-tra', HOP_LE())).ma, 403);
      assert.strictEqual((await k.guiTep('POST', '/api/nhap-excel/ap-dung', HOP_LE())).ma, 403);
    }
    const an = new Khach(may.goc);
    assert.strictEqual((await an.goi('GET', '/api/nhap-excel/mau')).ma, 401);
    assert.strictEqual((await an.guiTep('POST', '/api/nhap-excel/kiem-tra', HOP_LE())).ma, 401);
    assert.strictEqual((await admin.guiTep('POST', '/api/nhap-excel/kiem-tra', Buffer.alloc(0))).ma, 400);
    assert.strictEqual((await admin.goi('POST', '/api/nhap-excel/kiem-tra', { a: 1 })).ma, 400, 'gui JSON thay vi file');
    const lon = await admin.guiTep('POST', '/api/nhap-excel/kiem-tra', Buffer.alloc(11 * 1024 * 1024, 1));
    assert.strictEqual(lon.ma, 413);
    assert.strictEqual((await admin.guiTep('POST', '/api/nhap-excel/kiem-tra?che_do=xoa_het', HOP_LE())).ma, 400);
  } finally {
    await may.dong();
  }
});

test('file mau: du 9 sheet, tieu de dung ten truong, co danh sach tha xuong va huong dan; nhap nguyen mau thi bao "khong co du lieu"', async () => {
  const may = await dungMayThu();
  try {
    const admin = await dang(may, 'qtri');
    const kq = await admin.guiTep('GET', '/api/nhap-excel/mau', undefined);
    assert.strictEqual(kq.ma, 200);
    assert.match(kq.tieuDe.get('content-disposition'), /mau-nhap-quan-nhan\.xlsx/);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(kq.than);
    assert.deepStrictEqual(wb.worksheets.map((w) => w.name).sort(), ['Danh_muc', 'Huong_dan', 'dao_tao', 'khen_thuong', 'ky_luat_tien_an_tien_su', 'luong', 'quan_nhan', 'qua_trinh_cong_tac', 'qua_trinh_truoc_tuyen_dung', 'than_nhan', 'trang_thai'].sort());
    const ws = wb.getWorksheet('quan_nhan');
    const tieuDe = ws.getRow(1).values.slice(1);
    assert.strictEqual(tieuDe[0], 'ma_quan_nhan');
    assert.ok(tieuDe.includes('so_can_cuoc') && tieuDe.includes('don_vi') && tieuDe.includes('ngay_tuyen_dung_lan_dau'));
    assert.strictEqual(tieuDe.length, truongCuaBang('quan_nhan').length, 'moi truong cua quan_nhan la mot cot');
    assert.strictEqual(wb.getWorksheet('than_nhan').getRow(1).values[1], 'ma_quan_nhan');
    assert.ok(wb.getWorksheet('trang_thai'), 'sheet trang_thai');
    // O chon tu danh muc co danh sach tha xuong; ten don vi co trong sheet Danh_muc
    const cotDonVi = tieuDe.indexOf('don_vi') + 1;
    const dv = ws.getCell(2, cotDonVi).dataValidation;
    assert.strictEqual(dv.type, 'list');
    assert.match(dv.formulae[0], /Danh_muc!/);
    assert.strictEqual(ws.getCell(2, tieuDe.indexOf('gioi_tinh') + 1).dataValidation.formulae[0], '"Nam,Nữ"');
    const giaTriDm = [];
    wb.getWorksheet('Danh_muc').eachRow((r) => r.eachCell((c) => giaTriDm.push(c.value)));
    assert.ok(giaTriDm.includes('Đại úy') && giaTriDm.includes('Đại đội mẫu 1'));
    assert.match(ws.getCell(1, 1).note.texts ? ws.getCell(1, 1).note.texts.map((t) => t.text).join('') : String(ws.getCell(1, 1).note), /BẮT BUỘC/);
    // Nhap lai nguyen mau: khong co dong du lieu nao
    const bc = (await admin.guiTep('POST', '/api/nhap-excel/kiem-tra', kq.than)).du;
    assert.strictEqual(bc.soLoi, 1);
    assert.match(bc.loi[0].thongBao, /không có dòng dữ liệu nào/);
  } finally {
    await may.dong();
  }
});

test('file hop le: kiem tra khong ghi gi; danh muc la phai xac nhan; ap dung du ho so; nhap lai thi cap nhat khong nhan doi', async () => {
  const may = await dungMayThu();
  try {
    const admin = await dang(may, 'qtri');
    const truoc = anhChup(may.db);
    const kt = await admin.guiTep('POST', '/api/nhap-excel/kiem-tra', HOP_LE());
    assert.strictEqual(kt.ma, 200);
    assert.strictEqual(kt.du.soLoi, 0);
    assert.strictEqual(kt.du.coTheApDung, true);
    assert.deepStrictEqual(kt.du.danhMucLa.map((d) => d.ten).sort(), ['Đại đội A', 'Tiểu đoàn a', 'Trung đoàn 123'].sort());
    assert.strictEqual(kt.du.danhMucLa[0].loai, 'don_vi');
    assert.strictEqual(kt.du.tomTat.them, 3);
    assert.strictEqual(kt.du.tomTat.capNhat, 0);
    assert.deepStrictEqual(kt.du.tomTat.soDongTheoSheet, { quan_nhan: 3, qua_trinh_truoc_tuyen_dung: 3, qua_trinh_cong_tac: 9, dao_tao: 4, khen_thuong: 3, ky_luat_tien_an_tien_su: 1, luong: 8, than_nhan: 13, trang_thai: 3 });
    assert.match(kt.du.sha256, /^[0-9a-f]{64}$/);
    assert.deepStrictEqual(anhChup(may.db), truoc, 'kiem tra khong duoc ghi gi');
    assert.strictEqual(dem(may.db, 'nhat_ky') > 0, true);

    // Chua xac nhan them danh muc -> 409, khong ghi gi
    const chua = await admin.guiTep('POST', '/api/nhap-excel/ap-dung?sha256=' + kt.du.sha256, HOP_LE());
    assert.strictEqual(chua.ma, 409);
    assert.strictEqual(chua.du.ma, 'CAN_XAC_NHAN_DANH_MUC');
    assert.strictEqual(chua.du.danhMucLa.length, 3);
    assert.deepStrictEqual(anhChup(may.db), truoc);

    const ap = await admin.guiTep('POST', '/api/nhap-excel/ap-dung?them_danh_muc=1&sha256=' + kt.du.sha256, HOP_LE());
    assert.strictEqual(ap.ma, 200, JSON.stringify(ap.du));
    assert.strictEqual(ap.du.soThem, 3);
    assert.strictEqual(ap.du.soDanhMucMoi, 3);
    const sau = anhChup(may.db);
    assert.deepStrictEqual(sau, { quan_nhan: 103, than_nhan: truoc.than_nhan + 13, luong: truoc.luong + 8, danh_muc: truoc.danh_muc + 3, trang_thai: truoc.trang_thai + 3, dao_tao: truoc.dao_tao + 4 });
    const a = may.db.prepare("SELECT q.*, d.ten AS ten_don_vi, d.ma AS ma_don_vi FROM quan_nhan q JOIN danh_muc d ON d.id = q.don_vi_id WHERE q.ma_quan_nhan = '20.364.26'").get();
    assert.strictEqual(a.ten_don_vi, 'Đại đội A');
    assert.strictEqual(a.ma_don_vi, 'dai_doi_a');
    assert.strictEqual(a.ho_ten_khai_sinh, 'NGUYỄN VĂN A');
    assert.strictEqual(a.ngay_sinh, '2000-10-20');
    assert.strictEqual(a.gioi_tinh, 'nam');
    assert.strictEqual(a.la_dang_vien, 1);
    assert.strictEqual(a.so_can_cuoc, '000000000001');
    assert.strictEqual(a.he_so_luong, 5.9);
    assert.strictEqual(a.phu_cap_kiem_nhiem, null, '"Khong" trong o so = khong co');
    assert.strictEqual(a.ngay_vao_dang_thang, 2);
    assert.strictEqual(a.ngay_tuyen_dung_lan_dau_chuan, '2016-09-05');
    assert.strictEqual(a.tim_kiem, 'nguyen van a 20.364.26 0900000001');
    assert.strictEqual(a.version, 1);
    assert.strictEqual(may.db.prepare('SELECT COUNT(*) AS n FROM than_nhan WHERE quan_nhan_id = ?').get(a.id).n, 8);
    assert.strictEqual(may.db.prepare("SELECT COUNT(*) AS n FROM than_nhan WHERE quan_nhan_id = ? AND nhom = 'vo_chong'").get(a.id).n, 3);
    const ts = may.db.prepare("SELECT d.ten FROM trang_thai_quan_nhan t JOIN danh_muc d ON d.id = t.trang_thai_id WHERE t.quan_nhan_id = ?").get(a.id);
    assert.strictEqual(ts.ten, 'Nghỉ phép');
    // Nhat ky: co dong ap dung, khong chua so can cuoc / ten
    const nk = JSON.stringify(may.db.prepare('SELECT * FROM nhat_ky').all());
    assert.ok(nk.includes('nhap_excel_ap_dung'));
    assert.ok(!nk.includes('000000000001') && !nk.includes('NGUYỄN VĂN A'), 'nhat ky khong duoc chua du lieu ho so');

    // Hien duoc o danh sach / chi tiet bang API thuong
    const ho = (await admin.goi('GET', '/api/quan-nhan/' + a.id)).du;
    assert.strictEqual(ho.than_nhan.length, 8);
    assert.strictEqual(ho.tenDanhMuc[ho.quan_nhan.don_vi_id], 'Đại đội A');

    // Nhap lai CUNG file: cap nhat 3, khong nhan doi, khong them danh muc
    const kt2 = (await admin.guiTep('POST', '/api/nhap-excel/kiem-tra', HOP_LE())).du;
    assert.strictEqual(kt2.soLoi, 0);
    assert.strictEqual(kt2.danhMucLa.length, 0);
    assert.strictEqual(kt2.tomTat.them, 0);
    assert.strictEqual(kt2.tomTat.capNhat, 3);
    assert.ok(kt2.canhBao.some((c) => /than_nhan/.test(c) && /THAY/.test(c)), 'canh bao se thay dong cu');
    const ap2 = await admin.guiTep('POST', '/api/nhap-excel/ap-dung', HOP_LE());
    assert.strictEqual(ap2.ma, 200);
    assert.strictEqual(ap2.du.soCapNhat, 3);
    assert.deepStrictEqual(anhChup(may.db), sau, 'nhap lai khong duoc nhan doi du lieu');
    assert.strictEqual(may.db.prepare("SELECT version FROM quan_nhan WHERE ma_quan_nhan = '20.364.26'").get().version, 2);
  } finally {
    await may.dong();
  }
});

test('file co 3 dong loi: bao DUNG 3 loi (sheet, dong, cot), khong ghi gi; sua loi roi nhap thi du ho so', async () => {
  const may = await dungMayThu();
  try {
    const admin = await dang(may, 'qtri');
    const truoc = anhChup(may.db);
    const kt = await admin.guiTep('POST', '/api/nhap-excel/kiem-tra', DONG_LOI());
    assert.strictEqual(kt.ma, 200);
    assert.strictEqual(kt.du.soLoi, 3);
    assert.strictEqual(kt.du.coTheApDung, false);
    assert.deepStrictEqual(loiTheoViTri(kt.du), ['quan_nhan dong 3 cot ngay_sinh', 'quan_nhan dong 4 cot so_can_cuoc', 'than_nhan dong 11 cot ma_quan_nhan']);
    assert.match(kt.du.loi[0].thongBao, /không có trong tháng/);
    assert.match(kt.du.loi[1].thongBao, /trùng với dòng 2/);
    assert.match(kt.du.loi[2].thongBao, /Không có quân nhân mã "21\.999\.99"/);
    // Ap dung file loi: bi chan o may chu, khong ghi gi (ke ca khi trinh duyet bo qua buoc kiem tra)
    const ap = await admin.guiTep('POST', '/api/nhap-excel/ap-dung?them_danh_muc=1', DONG_LOI());
    assert.strictEqual(ap.ma, 400);
    assert.strictEqual(ap.du.ma, 'CON_LOI');
    assert.strictEqual(ap.du.soLoi, 3);
    assert.deepStrictEqual(anhChup(may.db), truoc);
    // Sau khi sua (file hop le) thi nhap du
    const ok = await admin.guiTep('POST', '/api/nhap-excel/ap-dung?them_danh_muc=1', HOP_LE());
    assert.strictEqual(ok.ma, 200);
    assert.strictEqual(dem(may.db, 'quan_nhan'), 103);
    // file khac voi file da kiem tra -> bi chan
    const khac = await admin.guiTep('POST', '/api/nhap-excel/ap-dung?sha256=' + kt.du.sha256, HOP_LE());
    assert.strictEqual(khac.ma, 409);
    assert.strictEqual(khac.du.ma, 'TEP_KHAC');
  } finally {
    await may.dong();
  }
});

test('loi giua chung khi ghi: giao dich quay lui, du lieu cu va danh muc con nguyen', async () => {
  const may = await dungMayThu();
  try {
    const truoc = anhChup(may.db);
    const { plan, baoCao } = await kiemTraTep(may.db, HOP_LE(), {});
    assert.strictEqual(baoCao.soLoi, 0);
    assert.throws(() => apDung(may.db, plan, { sauMoiNguoi: (i) => { if (i === 1) throw new Error('mat dien gia lap'); } }), /mat dien gia lap/);
    assert.deepStrictEqual(anhChup(may.db), truoc, 'khong duoc con dau vet nao (nguoi, bang con, danh muc moi)');
    // Che do thay the cung quay lui: khong mat 100 ho so cu
    const { plan: planThay } = await kiemTraTep(may.db, HOP_LE(), { cheDo: 'thay_the' });
    assert.throws(() => apDung(may.db, planThay, { sauMoiNguoi: (i) => { if (i === 2) throw new Error('loi giua chung'); } }), /loi giua chung/);
    assert.deepStrictEqual(anhChup(may.db), truoc, 'thay the loi giua chung: du lieu cu con nguyen');
    // Chay that khong loi
    assert.strictEqual(apDung(may.db, plan).soThem, 3);
    assert.strictEqual(dem(may.db, 'quan_nhan'), 103);
  } finally {
    await may.dong();
  }
});

test('che do thay the: bat go chu xac nhan, co sao luu truoc, xoa du lieu cu roi nhap file', async () => {
  const thuMucSaoLuu = fs.mkdtempSync(path.join(os.tmpdir(), 'hrm-saoluu-'));
  const may = await dungMayThu({ cauHinhThem: { thuMucSaoLuuTam: thuMucSaoLuu } });
  try {
    const admin = await dang(may, 'qtri');
    const truoc = anhChup(may.db);
    const kt = (await admin.guiTep('POST', '/api/nhap-excel/kiem-tra?che_do=thay_the', HOP_LE())).du;
    assert.strictEqual(kt.soLoi, 0);
    assert.strictEqual(kt.tomTat.them, 3);
    assert.strictEqual(kt.tomTat.xoaTruoc, 100);
    assert.ok(kt.canhBao.some((c) => /XÓA toàn bộ 100/.test(c)));
    const url = '/api/nhap-excel/ap-dung?che_do=thay_the&them_danh_muc=1';
    const thieu = await admin.guiTep('POST', url, HOP_LE());
    assert.strictEqual(thieu.ma, 409);
    assert.strictEqual(thieu.du.ma, 'CAN_GO_XAC_NHAN');
    assert.strictEqual((await admin.guiTep('POST', url + '&xac_nhan=ok', HOP_LE())).ma, 409);
    assert.deepStrictEqual(anhChup(may.db), truoc, 'chua xac nhan thi khong doi gi');
    assert.strictEqual(fs.readdirSync(thuMucSaoLuu).length, 0, 'chua xac nhan thi chua sao luu');

    const ap = await admin.guiTep('POST', url + '&xac_nhan=' + encodeURIComponent('thay the'), HOP_LE()); // khong dau van duoc
    assert.strictEqual(ap.ma, 200, JSON.stringify(ap.du));
    assert.strictEqual(ap.du.soXoaTruoc, 100);
    assert.strictEqual(ap.du.soThem, 3);
    assert.strictEqual(dem(may.db, 'quan_nhan'), 3);
    assert.strictEqual(dem(may.db, 'than_nhan'), 13);
    assert.strictEqual(dem(may.db, 'trang_thai_quan_nhan'), 3, 'bang con cua nguoi cu bi xoa theo');
    // Ban sao luu ton tai, mo duoc va con du 100 ho so cu
    const ds = fs.readdirSync(thuMucSaoLuu);
    assert.strictEqual(ds.length, 1);
    assert.match(ds[0], /^hrm-truoc-nhap-thay-the-\d{8}-\d{6}\.db$/);
    const bak = new Database(path.join(thuMucSaoLuu, ds[0]), { readonly: true });
    assert.strictEqual(bak.prepare('SELECT COUNT(*) AS n FROM quan_nhan').get().n, 100);
    bak.close();
    const hd = may.db.prepare("SELECT hanh_dong FROM nhat_ky WHERE hanh_dong IN ('sao_luu_truoc_nhap', 'nhap_excel_ap_dung') ORDER BY id").all().map((d) => d.hanh_dong);
    assert.deepStrictEqual(hd, ['sao_luu_truoc_nhap', 'nhap_excel_ap_dung']);
  } finally {
    await may.dong();
  }
});

test('thay the: khong sao luu duoc thi KHONG xoa gi; file khong co quan_nhan thi bi chan', async () => {
  const tepChan = path.join(os.tmpdir(), 'hrm-tep-chan-' + process.pid);
  fs.writeFileSync(tepChan, 'x');
  const may = await dungMayThu({ cauHinhThem: { thuMucSaoLuuTam: path.join(tepChan, 'khong-tao-duoc') } });
  try {
    const admin = await dang(may, 'qtri');
    const truoc = anhChup(may.db);
    const loi = await admin.guiTep('POST', '/api/nhap-excel/ap-dung?che_do=thay_the&them_danh_muc=1&xac_nhan=THAY%20TH%E1%BA%BE', HOP_LE());
    assert.ok(loi.ma >= 400, 'phai that bai');
    assert.deepStrictEqual(anhChup(may.db), truoc, 'sao luu hong thi khong duoc xoa gi');
    const khongNguoi = await taoTep({ luong: [['ma_quan_nhan', 'tu_thang_nam', 'he_so_luong'], ['GIA.001', '01/2020', '4,0']] });
    const bc = (await admin.guiTep('POST', '/api/nhap-excel/kiem-tra?che_do=thay_the', khongNguoi)).du;
    assert.ok(bc.loi.some((l) => /ít nhất một hồ sơ/.test(l.thongBao)));
    assert.ok(bc.loi.some((l) => l.sheet === 'luong' && /không có trong sheet quan_nhan/.test(l.thongBao)));
  } finally {
    await may.dong();
    fs.unlinkSync(tepChan);
  }
});

test('kiem tra dinh dang file: khong phai xlsx, thieu cot bat buoc, cot la, cot lap, dong trong giu dung so dong', async () => {
  const may = await dungMayThu();
  try {
    const admin = await dang(may, 'qtri');
    const kiem = async (tep, cheDo = 'them_hoac_cap_nhat') => (await kiemTraTep(may.db, tep, { cheDo })).baoCao;
    const rac = await kiem(Buffer.from('khong phai file excel'));
    assert.strictEqual(rac.soLoi, 1);
    assert.strictEqual(rac.loi[0].sheet, '(file)');
    assert.match(rac.loi[0].thongBao, /Không đọc được file/);

    const thieuCot = await kiem(await taoTep({ quan_nhan: [DAU.filter((c) => c !== 'ho_ten_khai_sinh'), NGUOI('T.001').filter((_, i) => DAU[i] !== 'ho_ten_khai_sinh')] }));
    assert.deepStrictEqual(loiTheoViTri(thieuCot), ['quan_nhan dong 1 cot ho_ten_khai_sinh']);
    assert.match(thieuCot.loi[0].thongBao, /Thiếu cột bắt buộc/);

    const cotLa = await kiem(await taoTep({ quan_nhan: [[...DAU, 'ten_la', 'Chú thích', 'ma_quan_nhan'], [...NGUOI('T.001'), 'x', 'ghi chu cua toi']] }));
    assert.deepStrictEqual(loiTheoViTri(cotLa).sort(), ['quan_nhan dong 1 cot ma_quan_nhan', 'quan_nhan dong 1 cot ten_la']);

    // dong trong o giua: so dong van la so dong that trong Excel (dong 5 la dong thu 3 co du lieu)
    const dongTrong = await kiem(await taoTep({ quan_nhan: [DAU, NGUOI('T.001'), null, NGUOI('T.002', { gioi_tinh: 'Khác' }), NGUOI('T.003')] }));
    assert.deepStrictEqual(loiTheoViTri(dongTrong), ['quan_nhan dong 4 cot gioi_tinh']);
    assert.match(dongTrong.loi[0].thongBao, /không hợp lệ.*Nam, Nữ/);
    assert.strictEqual(dongTrong.tomTat.them, 3);
    assert.ok(admin);
  } finally {
    await may.dong();
  }
});

test('kiem tra noi dung: ma trung, can cuoc trung CSDL, ho so xoa mem, enum, Co/Khong, danh muc trung ten/ngung dung, ngay tuong lai', async () => {
  const may = await dungMayThu();
  try {
    const kiem = async (sheets, cheDo) => (await kiemTraTep(may.db, await taoTep(sheets), { cheDo })).baoCao;
    // Ma trung trong file va ma da co (cap nhat)
    let bc = await kiem({ quan_nhan: [DAU, NGUOI('T.001'), NGUOI('T.001'), NGUOI('GIA.001')] });
    assert.deepStrictEqual(loiTheoViTri(bc), ['quan_nhan dong 3 cot ma_quan_nhan']);
    assert.match(bc.loi[0].thongBao, /trùng với dòng 2/);
    assert.strictEqual(bc.tomTat.them, 1);
    assert.strictEqual(bc.tomTat.capNhat, 1, 'GIA.001 da co thi la cap nhat');

    // Can cuoc trung voi ho so khac trong CSDL; ho so xoa mem
    const canCuocCu = may.db.prepare("SELECT so_can_cuoc FROM quan_nhan WHERE ma_quan_nhan = 'GIA.002'").get().so_can_cuoc;
    may.db.prepare("UPDATE quan_nhan SET da_xoa = 1 WHERE ma_quan_nhan = 'GIA.003'").run();
    const dauCC = [...DAU, 'so_can_cuoc'];
    bc = await kiem({ quan_nhan: [dauCC, [...NGUOI('T.010'), canCuocCu], [...NGUOI('GIA.003'), null]] });
    assert.deepStrictEqual(loiTheoViTri(bc), ['quan_nhan dong 2 cot so_can_cuoc', 'quan_nhan dong 3 cot ma_quan_nhan']);
    assert.match(bc.loi[0].thongBao, /trùng với hồ sơ mã "GIA\.002"/);
    assert.match(bc.loi[1].thongBao, /xóa mềm/);
    // Che do thay the bo qua can cuoc/ma cu (vi se xoa het)
    bc = await kiem({ quan_nhan: [dauCC, [...NGUOI('GIA.003'), canCuocCu]] }, 'thay_the');
    assert.strictEqual(bc.soLoi, 0);

    // Co/Khong, so, ngay kieu Date, so/bool/richText/cong thuc
    const g = ['ma_quan_nhan', 'ho_ten_khai_sinh', 'ngay_sinh', 'gioi_tinh', 'que_quan', 'don_vi', 'quan_ham', 'ngay_tuyen_dung_lan_dau', 'la_dang_vien', 'he_so_luong', 'so_dien_thoai', 'ghi_chu_yeu_to_nuoc_ngoai'];
    const dongOk = ['T.020', { richText: [{ text: 'TRAN ' }, { text: 'VAN B' }] }, new Date(Date.UTC(1999, 4, 7)), 'nữ', 'Que', 'dai doi mau 1', 'ĐẠI ÚY', '09/2017', 'x', 5.4, 912345678, { formula: 'A1', result: 'ghi chu' }];
    const kqOk = await kiemTraTep(may.db, await taoTep({ quan_nhan: [g, dongOk] }), {});
    assert.strictEqual(kqOk.baoCao.soLoi, 0, JSON.stringify(kqOk.baoCao.loi));
    const cot = kqOk.plan.nguoi[0].cot;
    assert.strictEqual(cot.ho_ten_khai_sinh, 'TRAN VAN B');
    assert.strictEqual(cot.ngay_sinh, '1999-05-07');
    assert.strictEqual(cot.gioi_tinh, 'nu');
    assert.strictEqual(cot.la_dang_vien, 1);
    assert.strictEqual(cot.he_so_luong, 5.4);
    assert.strictEqual(cot.so_dien_thoai, '912345678');
    assert.strictEqual(cot.ghi_chu_yeu_to_nuoc_ngoai, 'ghi chu');
    bc = await kiem({ quan_nhan: [[...DAU, 'la_dang_vien', 'he_so_luong'], [...NGUOI('T.021'), 'Có thể', 'abc']] });
    assert.deepStrictEqual(loiTheoViTri(bc).sort(), ['quan_nhan dong 2 cot he_so_luong', 'quan_nhan dong 2 cot la_dang_vien']);

    // Danh muc: trung ten (hai don vi cung ten), ngung dung, va them moi
    may.db.prepare("INSERT INTO danh_muc (loai, ma, ten) VALUES ('don_vi', 'trung_a', 'Đơn vị Trùng'), ('don_vi', 'trung_b', 'Đơn vị Trùng'), ('quan_ham', 'cu', 'Hàm cũ')").run();
    may.db.prepare("UPDATE danh_muc SET dang_dung = 0 WHERE ma = 'cu'").run();
    bc = await kiem({ quan_nhan: [DAU, NGUOI('T.030', { don_vi: 'Đơn vị Trùng' }), NGUOI('T.031', { don_vi: 'trung_b' }), NGUOI('T.032', { quan_ham: 'Hàm cũ' }), NGUOI('T.033', { don_vi: 'Đơn vị Mới X' }), NGUOI('T.034', { don_vi: 'đơn vị mới x' }), NGUOI('T.035', { don_vi: 'Don-vi Moi X' })] });
    assert.deepStrictEqual(loiTheoViTri(bc).sort(), ['quan_nhan dong 2 cot don_vi', 'quan_nhan dong 4 cot quan_ham']);
    assert.match(bc.loi.find((l) => l.dong === 2).thongBao, /trùng ở nhiều mục \(trung_a, trung_b\)/);
    assert.match(bc.loi.find((l) => l.dong === 4).thongBao, /ngừng dùng/);
    assert.strictEqual(bc.danhMucLa.length, 2, '"Đơn vị Mới X" va "đơn vị mới x" la mot; "Don-vi Moi X" la mot khac');
    assert.deepStrictEqual(bc.danhMucLa.find((d) => d.ten === 'Đơn vị Mới X').soDong, 2);

    // Ngay tuong lai trong ho so
    bc = await kiem({ quan_nhan: [DAU, NGUOI('T.040', { ngay_sinh: '01/01/2999' })] });
    assert.match(bc.loi[0].thongBao, /ngoài khoảng|chưa đến/);
    const namSau = String(new Date().getFullYear() + 1);
    bc = await kiem({ quan_nhan: [DAU, NGUOI('T.041', { ngay_sinh: '01/01/' + namSau })] });
    assert.deepStrictEqual(loiTheoViTri(bc), ['quan_nhan dong 2 cot ngay_sinh']);
    assert.match(bc.loi[0].thongBao, /chưa đến/);
  } finally {
    await may.dong();
  }
});

test('sheet con: nguoi chi co trong CSDL (cap nhat rieng bang con), nhom/quan he, trang thai chong nhau / tuong lai / chua co danh muc', async () => {
  const may = await dungMayThu();
  try {
    const admin = await dang(may, 'qtri');
    const dauTT = ['ma_quan_nhan', 'trang_thai', 'tu_ngay', 'den_ngay', 'ly_do_hoac_noi'];
    const dinh = (d) => String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
    const homNay = dinh(new Date());
    const namSau = dinh(new Date(new Date().getFullYear() + 1, 0, 5));
    const kiem = async (sheets) => (await kiemTraTep(may.db, await taoTep(sheets), {})).baoCao;
    // Nguoi chi co trong CSDL: duoc ("chi_con"); nguoi khong ton tai: loi
    let bc = await kiem({ trang_thai: [dauTT, ['GIA.050', 'Nghỉ phép', '01/01/2019', '05/01/2019'], ['KHONG.CO', 'Nghỉ phép', '01/01/2019', '05/01/2019']] });
    assert.deepStrictEqual(loiTheoViTri(bc), ['trang_thai dong 3 cot ma_quan_nhan']);
    assert.strictEqual(bc.tomTat.chiCon, 1);

    // Chong nhau, den < tu, tuong lai (benh xa) va chap nhan duoc (nghi phep truoc)
    bc = await kiem({
      trang_thai: [
        dauTT,
        ['GIA.050', 'Nghỉ phép', '01/01/2019', '10/01/2019'],
        ['GIA.050', 'Công tác', '10/01/2019', '12/01/2019'],
        ['GIA.050', 'Công tác', '11/01/2019', '14/01/2019'],
        ['GIA.050', 'Nghỉ phép', '20/01/2019', '15/01/2019'],
        ['GIA.050', 'Bệnh xá', namSau, null],
        ['GIA.050', 'Bệnh xá', homNay, namSau],
        ['GIA.050', 'Nghỉ phép', namSau, null],
        ['GIA.051', 'Huấn luyện', '01/01/2019', '02/01/2019'],
      ],
    });
    assert.deepStrictEqual(loiTheoViTri(bc), [
      'trang_thai dong 3 cot tu_ngay', 'trang_thai dong 4 cot tu_ngay', 'trang_thai dong 5 cot den_ngay', 'trang_thai dong 6 cot tu_ngay', 'trang_thai dong 7 cot den_ngay', 'trang_thai dong 9 cot trang_thai',
    ]);
    assert.match(bc.loi[0].thongBao, /chồng với dòng 2 \(trạng thái "Nghỉ phép"/);
    assert.match(bc.loi[1].thongBao, /chồng với dòng 3/, 'dong 4 chong voi dong 3 (khoang ngay sat truoc no)');
    assert.match(bc.loi[2].thongBao, /không được trước/);
    assert.match(bc.loi[3].thongBao, /"Bệnh xá" không đăng ký trước được/);
    assert.match(bc.loi[4].thongBao, /để trống "đến ngày"/);
    assert.match(bc.loi[5].thongBao, /chưa có trong danh mục.*Danh mục/);
    assert.strictEqual(bc.danhMucLa.length, 0, 'trang thai khong tu them vao danh muc');

    // Nhom/quan he: vo_chong khong co "vo"/"con"
    const dauTN = ['ma_quan_nhan', 'nhom', 'quan_he', 'ho_ten', 'ngay_sinh'];
    bc = await kiem({ than_nhan: [dauTN, ['GIA.050', 'ban_than', 'vo', 'Nguyen Thi A', '01/01/1990'], ['GIA.050', 'Vợ/chồng', 'Mẹ', 'Pham Thi B', '1965'], ['GIA.050', 'vo_chong', 'con', 'X', null], ['GIA.050', 'ban_than', 'cha', null, null]] });
    assert.deepStrictEqual(loiTheoViTri(bc), ['than_nhan dong 3 cot ngay_sinh', 'than_nhan dong 4 cot quan_he', 'than_nhan dong 5 cot ho_ten']);

    // Chi cap nhat bang con cua nguoi co san: thay dong cu bang dong trong file, bang khac giu nguyen
    const truocTN = may.db.prepare("SELECT COUNT(*) AS n FROM than_nhan WHERE quan_nhan_id = (SELECT id FROM quan_nhan WHERE ma_quan_nhan = 'GIA.050')").get().n;
    const luongTruoc = may.db.prepare("SELECT COUNT(*) AS n FROM luong WHERE quan_nhan_id = (SELECT id FROM quan_nhan WHERE ma_quan_nhan = 'GIA.050')").get().n;
    const tep = await taoTep({ than_nhan: [dauTN, ['GIA.050', 'ban_than', 'cha', 'Nguyen Van Cha', '03/1965']] });
    const ap = await admin.guiTep('POST', '/api/nhap-excel/ap-dung', tep);
    assert.strictEqual(ap.ma, 200, JSON.stringify(ap.du));
    assert.strictEqual(ap.du.soChiCon, 1);
    assert.strictEqual(ap.du.soThem + ap.du.soCapNhat, 0);
    const tn = may.db.prepare("SELECT ho_ten FROM than_nhan WHERE quan_nhan_id = (SELECT id FROM quan_nhan WHERE ma_quan_nhan = 'GIA.050')").all();
    assert.deepStrictEqual(tn.map((d) => d.ho_ten), ['Nguyen Van Cha']);
    assert.ok(truocTN > 1);
    assert.strictEqual(may.db.prepare("SELECT COUNT(*) AS n FROM luong WHERE quan_nhan_id = (SELECT id FROM quan_nhan WHERE ma_quan_nhan = 'GIA.050')").get().n, luongTruoc, 'bang luong khong co trong file nen giu nguyen');
  } finally {
    await may.dong();
  }
});

test('danh muc moi: ma tu dong, khong trung, noi dung ghi dung', async () => {
  const may = await dungMayThu();
  try {
    const admin = await dang(may, 'qtri');
    const tep = await taoTep({ quan_nhan: [DAU, NGUOI('T.050', { don_vi: 'Đại-đội A' }), NGUOI('T.051', { don_vi: 'Đại đội A' }), NGUOI('T.052', { don_vi: 'Đại đội A' })] });
    const ap = await admin.guiTep('POST', '/api/nhap-excel/ap-dung?them_danh_muc=1', tep);
    assert.strictEqual(ap.ma, 200);
    assert.strictEqual(ap.du.soDanhMucMoi, 2);
    const dm = may.db.prepare("SELECT ma, ten, thu_thu_tu FROM (SELECT ma, ten, thu_tu AS thu_thu_tu FROM danh_muc WHERE loai = 'don_vi' AND ten LIKE '%A' AND ma LIKE 'dai_doi_a%') ORDER BY ma").all();
    assert.deepStrictEqual(dm.map((d) => d.ma), ['dai_doi_a', 'dai_doi_a_2']);
    const t51 = may.db.prepare("SELECT d.ten FROM quan_nhan q JOIN danh_muc d ON d.id = q.don_vi_id WHERE q.ma_quan_nhan = 'T.051'").get();
    assert.strictEqual(t51.ten, 'Đại đội A');
  } finally {
    await may.dong();
  }
});
