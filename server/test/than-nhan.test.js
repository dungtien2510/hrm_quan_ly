'use strict';
// Kiem thu quy tac "khong ghi trung than nhan": me de / me nuoi / me ke, vo/chong hien tai, dong trung. Chay: npm test
const test = require('node:test');
const assert = require('node:assert');
const ExcelJS = require('exceljs');
const { dungMayThu, Khach, MAT_KHAU } = require('./tro-giup');
const { kiemTraTrungThanNhan } = require('../../shared/than-nhan.js');
const { TRUONG } = require('../../shared/truong-muc.js');
const { dongSangBieuMau } = require('../../shared/bieu-mau.js');
const { kiemTraTep } = require('../modules/nhap-excel/kiem-tra');
const { timViPham } = require('../scripts/tim-than-nhan-trung');

const B = 'ban_than';
const BB = 'vo_chong';
const loiCua = (ds) => kiemTraTrungThanNhan(ds, (i) => '"' + ds[i].ho_ten + '"');

test('quy tac: moi (cha, me) mot nguoi cho moi loai; de/nuoi/ke la khac nhau', () => {
  // Truong hop nguoi dung gap: hai "me" (de trong = de)
  const hai = loiCua([{ nhom: B, quan_he: 'me', ho_ten: 'Nguyễn Thị N' }, { nhom: B, quan_he: 'me', ho_ten: 'Phạm Thị H' }]);
  assert.strictEqual(hai.length, 1);
  assert.deepStrictEqual({ chiSo: hai[0].chiSo, truong: hai[0].truong }, { chiSo: 1, truong: 'tinh_chat' });
  assert.match(hai[0].thongBao, /Đã có mẹ đẻ là "Nguyễn Thị N"/);
  assert.match(hai[0].thongBao, /mẹ nuôi hoặc mẹ kế/);
  assert.match(hai[0].thongBao, /Loại quan hệ/);
  // "de" ghi ro cung tinh la de
  assert.strictEqual(loiCua([{ nhom: B, quan_he: 'me', tinh_chat: 'de', ho_ten: 'A' }, { nhom: B, quan_he: 'me', ho_ten: 'B' }]).length, 1);
  // me de + me nuoi + me ke: duoc
  assert.deepStrictEqual(loiCua([{ nhom: B, quan_he: 'me', ho_ten: 'A' }, { nhom: B, quan_he: 'me', tinh_chat: 'nuoi', ho_ten: 'B' }, { nhom: B, quan_he: 'me', tinh_chat: 'ke', ho_ten: 'C' }]), []);
  // hai me nuoi: loi; hai cha de: loi
  assert.strictEqual(loiCua([{ nhom: B, quan_he: 'me', tinh_chat: 'nuoi', ho_ten: 'A' }, { nhom: B, quan_he: 'me', tinh_chat: 'nuoi', ho_ten: 'B' }]).length, 1);
  assert.match(loiCua([{ nhom: B, quan_he: 'cha', ho_ten: 'A' }, { nhom: B, quan_he: 'cha', ho_ten: 'B' }])[0].thongBao, /cha đẻ/);
  // B.I va B.II la hai nhom rieng: me cua ban than va me cua vo/chong cung duoc
  assert.deepStrictEqual(loiCua([{ nhom: B, quan_he: 'me', ho_ten: 'A' }, { nhom: BB, quan_he: 'me', ho_ten: 'B' }]), []);
  // ba dong: bao dung dong thu ba va chi dong sau
  const ba = loiCua([{ nhom: B, quan_he: 'me', ho_ten: 'A' }, { nhom: B, quan_he: 'cha', ho_ten: 'X' }, { nhom: B, quan_he: 'me', ho_ten: 'B' }]);
  assert.deepStrictEqual(ba.map((l) => l.chiSo), [2]);
});

test('quy tac: mot vo/chong hien tai; vo/chong cu chon "da ly hon"; con va anh chi em khong gioi han', () => {
  assert.match(loiCua([{ nhom: B, quan_he: 'vo', ho_ten: 'A' }, { nhom: B, quan_he: 'vo', ho_ten: 'B' }])[0].thongBao, /vợ\/chồng hiện tại là "A".*Đã ly hôn/);
  assert.strictEqual(loiCua([{ nhom: B, quan_he: 'vo', ho_ten: 'A' }, { nhom: B, quan_he: 'chong', ho_ten: 'B' }]).length, 1, 'vo va chong cung la hien tai');
  assert.deepStrictEqual(loiCua([{ nhom: B, quan_he: 'vo', ho_ten: 'A' }, { nhom: B, quan_he: 'vo', tinh_chat: 'da_ly_hon', ho_ten: 'B' }, { nhom: B, quan_he: 'vo', tinh_chat: 'da_ly_hon', ho_ten: 'C' }]), []);
  const nhieuCon = [1, 2, 3, 4].map((n) => ({ nhom: B, quan_he: 'con', ho_ten: 'Con ' + n, ngay_sinh_chuan: '2020-0' + n + '-01' }));
  assert.deepStrictEqual(loiCua(nhieuCon), []);
  assert.deepStrictEqual(loiCua([{ nhom: B, quan_he: 'anh_chi_em', ho_ten: 'A' }, { nhom: B, quan_he: 'anh_chi_em', ho_ten: 'B' }, { nhom: B, quan_he: 'nguoi_nuoi_duong', ho_ten: 'C' }, { nhom: B, quan_he: 'nguoi_nuoi_duong', ho_ten: 'D' }]), []);
});

test('quy tac: dong trung hoan toan (cung quan he, ho ten, ngay sinh) va "loai quan he" khong hop le', () => {
  const trung = loiCua([{ nhom: B, quan_he: 'con', ho_ten: 'Nguyễn Văn Bé', ngay_sinh_chuan: '2020-01-01' }, { nhom: B, quan_he: 'con', ho_ten: 'NGUYEN VAN BE', ngay_sinh_chuan: '2020-01-01' }]);
  assert.strictEqual(trung.length, 1);
  assert.deepStrictEqual({ chiSo: trung[0].chiSo, truong: trung[0].truong }, { chiSo: 1, truong: 'ho_ten' });
  assert.match(trung[0].thongBao, /Trùng với "Nguyễn Văn Bé"/);
  assert.deepStrictEqual(loiCua([{ nhom: B, quan_he: 'con', ho_ten: 'Bé', ngay_sinh_chuan: '2020-01-01' }, { nhom: B, quan_he: 'con', ho_ten: 'Bé', ngay_sinh_chuan: '2021-05-01' }]), [], 'cung ten khac ngay sinh la hai nguoi');

  assert.match(loiCua([{ nhom: B, quan_he: 'con', tinh_chat: 'ke', ho_ten: 'A' }])[0].thongBao, /không dùng được cho "Con".*chỉ dùng: Đẻ \(ruột\), Nuôi/);
  assert.match(loiCua([{ nhom: B, quan_he: 'anh_chi_em', tinh_chat: 'de', ho_ten: 'A' }])[0].thongBao, /không có loại/);
  assert.strictEqual(loiCua([{ nhom: B, quan_he: 'vo', tinh_chat: 'de', ho_ten: 'A' }]).length, 1);
  assert.deepStrictEqual(loiCua([{ nhom: B, quan_he: 'con', tinh_chat: 'nuoi', ho_ten: 'A' }]), [], 'con nuoi');
  assert.deepStrictEqual(loiCua([]), []);
  assert.deepStrictEqual(loiCua([{ nhom: B, ho_ten: 'chua chon quan he' }]), []);
});

async function dang(may, ten) {
  const khach = new Khach(may.goc);
  assert.strictEqual((await khach.dangNhap(ten, MAT_KHAU[ten])).ma, 200);
  return khach;
}

// Dung payload sua ho so DAY DU tu API (giong giao dien): GET + hien so, doi sang bieu mau.
async function mo(admin, id) {
  const ho = (await admin.goi('GET', '/api/quan-nhan/' + id)).du;
  const that = (await admin.goi('GET', '/api/quan-nhan/' + id + '/so-dinh-danh')).du;
  const quanNhan = dongSangBieuMau('quan_nhan', ho.quan_nhan);
  const bm = dongSangBieuMau('quan_nhan', that.quan_nhan);
  for (const t of TRUONG.filter((x) => x.bang === 'quan_nhan' && x.muc === 'so_dinh_danh')) {
    quanNhan[t.truong] = bm[t.truong];
  }
  const thanNhan = ho.than_nhan.map((d) => {
    const f = dongSangBieuMau('than_nhan', d);
    const day = that.than_nhan.find((x) => x.id === d.id);
    f.so_can_cuoc = day && day.so_can_cuoc ? day.so_can_cuoc : '';
    return f;
  });
  return { version: ho.quan_nhan.version, quan_nhan: quanNhan, than_nhan: thanNhan };
}

test('API sua ho so: them "me" thu hai bi chan, chon "nuoi" thi duoc; vo/chong, con trung, loai khong hop le', async () => {
  const may = await dungMayThu();
  try {
    const admin = await dang(may, 'qtri');
    // Nguoi co san mot "me" o B.I (nhu quan nhan 22.050.07 cua ban)
    const id = may.db.prepare("SELECT quan_nhan_id AS id FROM than_nhan WHERE nhom = 'ban_than' AND quan_he = 'me' LIMIT 1").get().id;
    const payload = await mo(admin, id);
    const soMeCu = payload.than_nhan.filter((t) => t.nhom === B && t.quan_he === 'me').length;
    assert.strictEqual(soMeCu, 1);
    const tenMeCu = payload.than_nhan.find((t) => t.nhom === B && t.quan_he === 'me').ho_ten;
    const them = (dong) => ({ ...payload, than_nhan: [...payload.than_nhan, { ...dongSangBieuMau('than_nhan', {}), nhom: B, ...dong }] });
    const luu = (p) => admin.goi('PUT', '/api/quan-nhan/' + id, p);
    const demTN = () => may.db.prepare('SELECT COUNT(*) AS n FROM than_nhan WHERE quan_nhan_id = ?').get(id).n;
    const truoc = demTN();

    // 1. Them "me" thu hai khong ghi loai: bi chan, thong bao nhac ten nguoi da co va cach sua
    const loi1 = await luu(them({ quan_he: 'me', ho_ten: 'Phạm Thị H' }));
    assert.strictEqual(loi1.ma, 400);
    assert.strictEqual(loi1.du.ma, 'DU_LIEU_SAI');
    assert.strictEqual(loi1.du.chichiTiet, undefined);
    const ct = loi1.du.chiTiet.find((c) => c.truong === 'tinh_chat');
    assert.strictEqual(ct.bang, 'than_nhan');
    assert.strictEqual(ct.dong, payload.than_nhan.length);
    assert.ok(ct.thongBao.includes('"' + tenMeCu + '"') && /mẹ nuôi hoặc mẹ kế/.test(ct.thongBao));
    assert.strictEqual(demTN(), truoc, 'bi chan thi khong ghi gi');

    // 2. Ghi ro "nuoi" thi duoc va doc lai dung
    assert.strictEqual((await luu(them({ quan_he: 'me', tinh_chat: 'nuoi', ho_ten: 'Phạm Thị H' }))).ma, 200);
    const sau = (await admin.goi('GET', '/api/quan-nhan/' + id)).du.than_nhan.filter((t) => t.quan_he === 'me' && t.nhom === B);
    assert.deepStrictEqual(sau.map((t) => t.tinh_chat).sort(), ['nuoi', null].sort());
    // 3. Them me nuoi thu hai: chan; them me ke: duoc
    const p2 = await mo(admin, id);
    const them2 = (dong) => ({ ...p2, than_nhan: [...p2.than_nhan, { ...dongSangBieuMau('than_nhan', {}), nhom: B, quan_he: 'me', ...dong }] });
    assert.strictEqual((await admin.goi('PUT', '/api/quan-nhan/' + id, them2({ tinh_chat: 'nuoi', ho_ten: 'Mẹ nuôi 2' }))).ma, 400);
    assert.strictEqual((await admin.goi('PUT', '/api/quan-nhan/' + id, them2({ tinh_chat: 'ke', ho_ten: 'Mẹ kế' }))).ma, 200);
    // 4. "Me" o B.II (me cua vo/chong) la nhom khac: duoc
    const p3 = await mo(admin, id);
    const coMeBB = p3.than_nhan.some((t) => t.nhom === BB && t.quan_he === 'me');
    const thanNhanBB = [...p3.than_nhan, { ...dongSangBieuMau('than_nhan', {}), nhom: BB, quan_he: 'me', ho_ten: 'Me vo ' + (coMeBB ? 'khac' : '') }];
    if (!coMeBB) {
      assert.strictEqual((await admin.goi('PUT', '/api/quan-nhan/' + id, { ...p3, than_nhan: thanNhanBB })).ma, 200);
    }
    // 5. Vo/chong: them mot vo/chong hien tai thu hai -> chan; "da ly hon" -> duoc
    const p4 = await mo(admin, id);
    const coVo = p4.than_nhan.some((t) => t.quan_he === 'vo' || t.quan_he === 'chong');
    const dongVo = (extra) => ({ ...dongSangBieuMau('than_nhan', {}), nhom: B, quan_he: 'vo', ho_ten: 'Vợ thứ hai', ...extra });
    if (!coVo) {
      p4.than_nhan.push({ ...dongVo({ ho_ten: 'Vợ hiện tại' }) });
    }
    const hai = { ...p4, than_nhan: [...p4.than_nhan, dongVo({})] };
    const vc = await admin.goi('PUT', '/api/quan-nhan/' + id, hai);
    assert.strictEqual(vc.ma, 400);
    assert.match(vc.du.chiTiet.find((c) => c.truong === 'quan_he').thongBao, /vợ\/chồng hiện tại/);
    const cu = { ...p4, than_nhan: [...p4.than_nhan, dongVo({ tinh_chat: 'da_ly_hon' })] };
    assert.strictEqual((await admin.goi('PUT', '/api/quan-nhan/' + id, cu)).ma, 200);
    // 6. Con trung hoan toan bi chan; "loai" khong hop le bi chan
    const p5 = await mo(admin, id);
    const con = { ...dongSangBieuMau('than_nhan', {}), nhom: B, quan_he: 'con', ho_ten: 'Bé Trùng', ngay_sinh: '01/01/2020' };
    assert.strictEqual((await admin.goi('PUT', '/api/quan-nhan/' + id, { ...p5, than_nhan: [...p5.than_nhan, con, { ...con }] })).ma, 400);
    assert.strictEqual((await admin.goi('PUT', '/api/quan-nhan/' + id, { ...p5, than_nhan: [...p5.than_nhan, { ...con, tinh_chat: 'ke' }] })).ma, 400);
    assert.strictEqual((await admin.goi('PUT', '/api/quan-nhan/' + id, { ...p5, than_nhan: [...p5.than_nhan, { ...con, tinh_chat: 'nuoi' }] })).ma, 200, 'con nuoi');
  } finally {
    await may.dong();
  }
});

test('API them ho so moi: hai "me" khong ghi loai bi chan; me de + me nuoi duoc', async () => {
  const may = await dungMayThu();
  try {
    const admin = await dang(may, 'qtri');
    const dm = (loai, ma) => may.db.prepare('SELECT id FROM danh_muc WHERE loai = ? AND ma = ?').get(loai, ma).id;
    const hoSo = (ma, thanNhan) => ({
      quan_nhan: { ma_quan_nhan: ma, ho_ten_khai_sinh: 'NGUYEN VAN MOI', ngay_sinh: '20/10/2000', gioi_tinh: 'nam', que_quan: 'x', don_vi: dm('don_vi', 'gia_c1'), quan_ham: dm('quan_ham', 'dai_uy'), ngay_tuyen_dung_lan_dau: '09/2017' },
      than_nhan: thanNhan,
    });
    const me = (ten, extra = {}) => ({ nhom: B, quan_he: 'me', ho_ten: ten, ...extra });
    const sai = await admin.goi('POST', '/api/quan-nhan', hoSo('TN.001', [me('Lê Thị A'), me('Phạm Thị H')]));
    assert.strictEqual(sai.ma, 400);
    assert.deepStrictEqual(sai.du.chiTiet.map((c) => c.bang + '#' + c.dong + '.' + c.truong), ['than_nhan#1.tinh_chat']);
    assert.strictEqual(may.db.prepare("SELECT COUNT(*) AS n FROM quan_nhan WHERE ma_quan_nhan = 'TN.001'").get().n, 0);
    const ok = await admin.goi('POST', '/api/quan-nhan', hoSo('TN.001', [me('Lê Thị A'), me('Phạm Thị H', { tinh_chat: 'nuoi' })]));
    assert.strictEqual(ok.ma, 201, JSON.stringify(ok.du));
    assert.deepStrictEqual(may.db.prepare('SELECT ho_ten, tinh_chat FROM than_nhan WHERE quan_nhan_id = ? ORDER BY id').all(ok.du.id).map((d) => d.ho_ten + ':' + d.tinh_chat), ['Lê Thị A:null', 'Phạm Thị H:nuoi']);
  } finally {
    await may.dong();
  }
});

async function taoTep(sheets) {
  const wb = new ExcelJS.Workbook();
  for (const [ten, dongs] of Object.entries(sheets)) {
    const ws = wb.addWorksheet(ten);
    dongs.forEach((d, i) => d.forEach((v, j) => (ws.getCell(i + 1, j + 1).value = v)));
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}

test('nhap Excel: than nhan trung bao dung sheet, dong, cot; chap nhan tinh_chat bang ma hoac ten', async () => {
  const may = await dungMayThu();
  try {
    const dau = ['ma_quan_nhan', 'nhom', 'quan_he', 'tinh_chat', 'ho_ten', 'ngay_sinh'];
    const kiem = async (dongs) => (await kiemTraTep(may.db, await taoTep({ than_nhan: [dau, ...dongs] }), {})).baoCao;
    const bc = await kiem([['GIA.050', 'ban_than', 'me', null, 'Lê Thị A', '03/1965'], ['GIA.050', 'ban_than', 'me', null, 'Phạm Thị H', '03/1970'], ['GIA.051', 'ban_than', 'me', null, 'Người khác', '03/1965']]);
    assert.deepStrictEqual(bc.loi.map((l) => l.sheet + ' dong ' + l.dong + ' cot ' + l.cot), ['than_nhan dong 3 cot tinh_chat']);
    assert.match(bc.loi[0].thongBao, /Đã có mẹ đẻ là dòng 2 \(Lê Thị A\)/);
    assert.strictEqual(bc.tomTat.chiCon, 2, 'GIA.050 va GIA.051 co san trong CSDL');
  } finally {
    await may.dong();
  }
});

test('nhap Excel (tiep): chap nhan tinh_chat bang ma hoac ten; vo/chong va tinh_chat sai nhom', async () => {
  const may = await dungMayThu();
  try {
    const dau = ['ma_quan_nhan', 'nhom', 'quan_he', 'tinh_chat', 'ho_ten', 'ngay_sinh'];
    const kiem = async (dongs) => (await kiemTraTep(may.db, await taoTep({ than_nhan: [dau, ...dongs] }), {})).baoCao;
    let bc = await kiem([['GIA.050', 'ban_than', 'me', null, 'A', '03/1965'], ['GIA.050', 'ban_than', 'me', 'Nuôi', 'B', '03/1970'], ['GIA.050', 'ban_than', 'me', 'ke', 'C', null], ['GIA.050', 'ban_than', 'con', 'Nuôi', 'D', '03/2020'], ['GIA.050', 'ban_than', 'vo', 'Đã ly hôn', 'E', null], ['GIA.050', 'ban_than', 'vo', 'da_ly_hon', 'F', null]]);
    assert.strictEqual(bc.soLoi, 0, JSON.stringify(bc.loi));
    bc = await kiem([['GIA.050', 'ban_than', 'con', 'ke', 'D', '03/2020'], ['GIA.050', 'ban_than', 'vo', null, 'E', null], ['GIA.050', 'ban_than', 'chong', null, 'F', null], ['GIA.050', 'ban_than', 'anh_chi_em', 'de', 'G', null]]);
    assert.deepStrictEqual(bc.loi.map((l) => l.dong + ':' + l.cot), ['2:tinh_chat', '4:quan_he', '5:tinh_chat']);
  } finally {
    await may.dong();
  }
});

test('file mau co cot tinh_chat voi danh sach ma; du lieu gia khong vi pham; script tim du lieu cu bi ghi trung', async () => {
  const may = await dungMayThu();
  try {
    const admin = await dang(may, 'qtri');
    const mau = await admin.guiTep('GET', '/api/nhap-excel/mau');
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(mau.than);
    const ws = wb.getWorksheet('than_nhan');
    const cot = ws.getRow(1).values.indexOf('tinh_chat');
    assert.ok(cot > 0);
    assert.strictEqual(ws.getCell(2, cot).dataValidation.formulae[0], '"de,nuoi,ke,da_ly_hon"');

    assert.deepStrictEqual(timViPham(may.db), [], '100 ho so gia khong co than nhan trung');
    // Mo phong du lieu cu (truoc khi co quy tac): chen thang hai "me de" vao CSDL
    const id = may.db.prepare("SELECT quan_nhan_id AS id FROM than_nhan WHERE nhom = 'ban_than' AND quan_he = 'me' LIMIT 1").get().id;
    may.db.prepare("INSERT INTO than_nhan (quan_nhan_id, nhom, quan_he, ho_ten) VALUES (?, 'ban_than', 'me', 'Phạm Thị H')").run(id);
    const ds = timViPham(may.db);
    assert.strictEqual(ds.length, 1);
    assert.match(ds[0].loi[0], /Đã có mẹ đẻ là/);
    assert.strictEqual(ds[0].ma, may.db.prepare('SELECT ma_quan_nhan FROM quan_nhan WHERE id = ?').get(id).ma_quan_nhan);
  } finally {
    await may.dong();
  }
});
