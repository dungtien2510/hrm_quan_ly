'use strict';
// Kiem thu quan ly danh muc (admin): them, sua, cay don vi, bao ve muc mac dinh, xoa. Chay: npm test
const test = require('node:test');
const assert = require('node:assert');
const { dungMayThu, Khach, MAT_KHAU } = require('./tro-giup');

async function dang(may, ten) {
  const khach = new Khach(may.goc);
  assert.strictEqual((await khach.dangNhap(ten, MAT_KHAU[ten])).ma, 200);
  return khach;
}
const idDm = (may, loai, ma) => may.db.prepare('SELECT id FROM danh_muc WHERE loai = ? AND ma = ?').get(loai, ma).id;

test('moi tai khoan doc duoc danh muc, chi admin ghi; danh muc ngung dung bi an', async () => {
  const may = await dungMayThu();
  try {
    const admin = await dang(may, 'qtri');
    const motso = await dang(may, 'motso');
    const loai = (await motso.goi('GET', '/api/danh-muc/loai')).du.loai;
    assert.strictEqual(loai.length, 11);
    const tt = (await motso.goi('GET', '/api/danh-muc?loai=trang_thai')).du;
    assert.strictEqual(tt.dong.length, 6);
    assert.strictEqual(tt.loai.coTinhLaVang, true);
    assert.strictEqual((await motso.goi('GET', '/api/danh-muc?loai=khong_co')).ma, 400);
    assert.strictEqual((await new Khach(may.goc).goi('GET', '/api/danh-muc?loai=don_vi')).ma, 401);
    const body = { loai: 'hinh_thuc_khen_thuong', ma: 'huan_chuong', ten: 'Huân chương' };
    assert.strictEqual((await motso.goi('POST', '/api/danh-muc', body)).ma, 403);

    const tao = await admin.goi('POST', '/api/danh-muc', body);
    assert.strictEqual(tao.ma, 201);
    assert.strictEqual((await admin.goi('POST', '/api/danh-muc', body)).ma, 409, 'trung ma trong loai');
    assert.strictEqual((await motso.goi('GET', '/api/danh-muc?loai=hinh_thuc_khen_thuong')).du.dong.some((d) => d.ma === 'huan_chuong'), true);
    // ngung dung -> an khoi danh sach chon cua nguoi thuong, admin van thay voi tatCa=1
    assert.strictEqual((await admin.goi('PUT', '/api/danh-muc/' + tao.du.id, { dang_dung: false, ten: 'Huân chương (cũ)' })).ma, 200);
    assert.strictEqual((await motso.goi('GET', '/api/danh-muc?loai=hinh_thuc_khen_thuong&tatCa=1')).du.dong.some((d) => d.ma === 'huan_chuong'), false);
    assert.strictEqual((await admin.goi('GET', '/api/danh-muc?loai=hinh_thuc_khen_thuong&tatCa=1')).du.dong.find((d) => d.ma === 'huan_chuong').ten, 'Huân chương (cũ)');
    // nhat ky
    const hd = may.db.prepare("SELECT hanh_dong FROM nhat_ky WHERE doi_tuong = 'danh_muc'").all().map((d) => d.hanh_dong);
    assert.deepStrictEqual(hd, ['them_danh_muc', 'sua_danh_muc']);
  } finally {
    await may.dong();
  }
});

test('kiem tra du lieu: ma, mau, cha, co tinh_la_vang chi cho trang thai', async () => {
  const may = await dungMayThu();
  try {
    const admin = await dang(may, 'qtri');
    const them = (body) => admin.goi('POST', '/api/danh-muc', body);
    assert.strictEqual((await them({ loai: 'quan_ham', ma: 'Co Dau', ten: 'X' })).ma, 400);
    assert.strictEqual((await them({ loai: 'quan_ham', ma: 'x1', ten: '' })).ma, 400);
    assert.strictEqual((await them({ loai: 'quan_ham', ma: 'x1', ten: 'X', mau: 'do' })).ma, 400);
    assert.strictEqual((await them({ loai: 'khong_co', ma: 'x1', ten: 'X' })).ma, 400);
    assert.strictEqual((await them({ loai: 'quan_ham', ma: 'x1', ten: 'X', tinh_la_vang: true })).ma, 400);
    assert.strictEqual((await them({ loai: 'quan_ham', ma: 'x1', ten: 'X', cha_id: idDm(may, 'quan_ham', 'dai_uy') })).ma, 400, 'quan ham khong co cap cha-con');
    assert.strictEqual((await them({ loai: 'don_vi', ma: 'x1', ten: 'X', cha_id: idDm(may, 'quan_ham', 'dai_uy') })).ma, 400, 'cha khac loai');
    const moi = await them({ loai: 'trang_thai', ma: 'huan_luyen', ten: 'Huấn luyện', mau: '#123abc', tinh_la_vang: true });
    assert.strictEqual(moi.ma, 201);
    const dong = (await admin.goi('GET', '/api/danh-muc?loai=trang_thai')).du.dong.find((d) => d.ma === 'huan_luyen');
    assert.strictEqual(dong.tinh_la_vang, 1);
    assert.strictEqual(dong.mau, '#123abc');
    // trang thai moi dung duoc ngay trong API trang thai
    const nguoi = may.db.prepare('SELECT id FROM quan_nhan ORDER BY id LIMIT 1 OFFSET 99').get() || { id: 100 };
    const tt = await admin.goi('POST', '/api/trang-thai/quan-nhan/' + nguoi.id, { trang_thai_id: moi.du.id, tu_ngay: '01/01/1999', den_ngay: '02/01/1999' });
    assert.strictEqual(tt.ma, 201, JSON.stringify(tt.du));
  } finally {
    await may.dong();
  }
});

test('cay don vi: khong tao vong lap, khong xoa muc con cap duoi; xoa muc dang duoc dung bi tu choi', async () => {
  const may = await dungMayThu();
  try {
    const admin = await dang(may, 'qtri');
    const sd = idDm(may, 'don_vi', 'gia_sd');
    const e1 = idDm(may, 'don_vi', 'gia_e1');
    const d1 = idDm(may, 'don_vi', 'gia_d1');
    // sd khong the la con cua e1 (e1 la con cua sd): vong lap
    const vong = await admin.goi('PUT', '/api/danh-muc/' + sd, { cha_id: e1 });
    assert.strictEqual(vong.ma, 400);
    assert.match(vong.du.loi, /cấp dưới/);
    assert.strictEqual((await admin.goi('PUT', '/api/danh-muc/' + sd, { cha_id: sd })).ma, 400, 'cha la chinh no');
    assert.strictEqual((await admin.goi('PUT', '/api/danh-muc/' + sd, { cha_id: d1 })).ma, 400, 'cha la chau cua no');
    // chuyen d1 sang trung doan 2: duoc
    assert.strictEqual((await admin.goi('PUT', '/api/danh-muc/' + d1, { cha_id: idDm(may, 'don_vi', 'gia_e2') })).ma, 200);
    // xoa muc con cap duoi
    const xoaCha = await admin.goi('DELETE', '/api/danh-muc/' + e1);
    assert.strictEqual(xoaCha.ma, 409);
    assert.match(xoaCha.du.loi, /cấp dưới/);
    // them don vi con roi xoa duoc (chua ai dung)
    const moi = (await admin.goi('POST', '/api/danh-muc', { loai: 'don_vi', ma: 'tam_thoi', ten: 'Tạm', cha_id: sd })).du.id;
    assert.strictEqual((await admin.goi('DELETE', '/api/danh-muc/' + moi)).ma, 200);
    // dai doi dang co quan nhan: khong xoa duoc, goi y ngung dung
    const daiDoi = may.db.prepare('SELECT don_vi_id AS id FROM quan_nhan LIMIT 1').get().id;
    const xoaDung = await admin.goi('DELETE', '/api/danh-muc/' + daiDoi);
    assert.strictEqual(xoaDung.ma, 409);
    assert.strictEqual(xoaDung.du.ma, 'DANG_DUOC_DUNG');
    assert.match(xoaDung.du.loi, /Ngừng dùng/);
    assert.strictEqual((await admin.goi('PUT', '/api/danh-muc/' + daiDoi, { dang_dung: false })).ma, 200);
    assert.strictEqual((await admin.goi('DELETE', '/api/danh-muc/99999')).ma, 404);
  } finally {
    await may.dong();
  }
});

test('muc mac dinh "Co mat" duoc bao ve; doi ten, mau, thu tu van duoc', async () => {
  const may = await dungMayThu();
  try {
    const admin = await dang(may, 'qtri');
    const coMat = idDm(may, 'trang_thai', 'co_mat');
    assert.strictEqual((await admin.goi('DELETE', '/api/danh-muc/' + coMat)).ma, 400);
    assert.strictEqual((await admin.goi('PUT', '/api/danh-muc/' + coMat, { dang_dung: false })).ma, 400);
    assert.strictEqual((await admin.goi('PUT', '/api/danh-muc/' + coMat, { tinh_la_vang: true })).ma, 400);
    assert.strictEqual((await admin.goi('PUT', '/api/danh-muc/' + coMat, { ten: 'Có mặt tại đơn vị', mau: '#00aa00', thu_tu: 1 })).ma, 200);
    // doi tinh_la_vang cua trang thai khac duoc (anh huong thong ke vang o Buoc 8)
    assert.strictEqual((await admin.goi('PUT', '/api/danh-muc/' + idDm(may, 'trang_thai', 'khac'), { tinh_la_vang: false })).ma, 200);
    assert.strictEqual(may.db.prepare("SELECT tinh_la_vang FROM danh_muc WHERE ma = 'khac' AND loai = 'trang_thai'").get().tinh_la_vang, 0);
    assert.strictEqual((await admin.goi('PUT', '/api/danh-muc/' + idDm(may, 'quan_ham', 'dai_uy'), { tinh_la_vang: true })).ma, 400);
  } finally {
    await may.dong();
  }
});
