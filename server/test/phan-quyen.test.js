'use strict';
// Ma tran phan quyen: tai khoan mau x endpoint x ket qua mong doi (200 hoac 401/403),
// va chi tra dung cac truong thuoc muc duoc cap. Chay: npm test
const test = require('node:test');
const assert = require('node:assert');
const { dungMayThu, Khach, taoMoDunTam, MAT_KHAU } = require('./tro-giup');
const { cotTheoMuc, COT_LUON_TRA } = require('../../shared/truong-muc.js');

// Mo-dun thu (dung o dia tam): moi route dung mot loai bao ve khac nhau.
const MA_MODUN_THU = `
'use strict';
module.exports = {
  ten: 'thu',
  dangKyRoute(router, c) {
    const x = c.xacThuc;
    router.get('/luong', x.yeuCauMuc('luong'), (q, s) => s.json({ ok: true }));
    router.get('/loc/dang-vien', x.yeuCauBoLoc('la_dang_vien'), (q, s) => s.json({ ok: true }));
    router.get('/bao-cao/con-nho', x.yeuCauBaoCao('con_nho'), (q, s) => s.json({ ok: true }));
    router.get('/xuat/xlsx', x.yeuCauXuat('xlsx'), (q, s) => s.json({ ok: true }));
    router.post('/ghi', x.yeuCauDangNhap(), (q, s) => s.json({ ok: true }));
    router.get('/admin', x.yeuCauAdmin, (q, s) => s.json({ ok: true }));
  },
  muc: [], boLoc: [], baoCao: [], xuat: [], menu: [],
};`;

const KHONG = 'khong_dang_nhap';
// [phuong thuc, duong dan, body, ket qua mong doi theo tai khoan]
const MA_TRAN = [
  ['GET', '/api/thu/luong', undefined, { qtri: 200, daydu: 200, motso: 403, [KHONG]: 401 }],
  ['GET', '/api/thu/loc/dang-vien', undefined, { qtri: 200, daydu: 200, motso: 403, [KHONG]: 401 }],
  ['GET', '/api/thu/bao-cao/con-nho', undefined, { qtri: 200, daydu: 200, motso: 403, [KHONG]: 401 }],
  ['GET', '/api/thu/xuat/xlsx', undefined, { qtri: 200, daydu: 200, motso: 403, [KHONG]: 401 }],
  ['POST', '/api/thu/ghi', {}, { qtri: 200, daydu: 403, motso: 403, [KHONG]: 401 }],
  ['GET', '/api/thu/admin', undefined, { qtri: 200, daydu: 403, motso: 403, [KHONG]: 401 }],
  ['GET', '/api/tai-khoan/nguoi-dung', undefined, { qtri: 200, daydu: 403, motso: 403, [KHONG]: 401 }],
  ['PUT', '/api/tai-khoan/nguoi-dung/3/quyen', {}, { qtri: 200, daydu: 403, motso: 403, [KHONG]: 401 }],
  ['POST', '/api/tai-khoan/nguoi-dung', { tenDangNhap: 'xthu1', hoTen: 'X', loai: 'xem_day_du', matKhauTam: 'TamThoi123456' }, { qtri: 201, daydu: 403, motso: 403, [KHONG]: 401 }],
  ['GET', '/api/quan-nhan/1', undefined, { qtri: 200, daydu: 200, motso: 200, [KHONG]: 401 }],
  ['GET', '/api/xin-chao', undefined, { qtri: 200, daydu: 200, motso: 200, [KHONG]: 401 }],
];

async function dangNhapTatCa(may) {
  const khach = {};
  for (const ten of ['qtri', 'daydu', 'motso']) {
    khach[ten] = new Khach(may.goc);
    assert.strictEqual((await khach[ten].dangNhap(ten, MAT_KHAU[ten])).ma, 200);
  }
  khach[KHONG] = new Khach(may.goc);
  return khach;
}

test('ma tran: tai khoan x endpoint x ket qua (200 / 401 / 403)', async () => {
  const may = await dungMayThu({ dsMoDunThem: taoMoDunTam('thu', MA_MODUN_THU) });
  try {
    const khach = await dangNhapTatCa(may);
    for (const [phuongThuc, duongDan, body, mongDoi] of MA_TRAN) {
      for (const [ten, maMongDoi] of Object.entries(mongDoi)) {
        const kq = await khach[ten].goi(phuongThuc, duongDan, body);
        assert.strictEqual(kq.ma, maMongDoi, ten + ' ' + phuongThuc + ' ' + duongDan + ' => ' + kq.ma);
        if (maMongDoi === 403 || maMongDoi === 401) {
          assert.ok(!kq.du || (kq.du.ok !== true && !kq.du.quan_nhan), 'khong duoc lo du lieu khi bi tu choi: ' + duongDan);
        }
      }
    }
    // Bi tu choi quyen thi co ghi nhat ky
    assert.ok(may.db.prepare("SELECT COUNT(*) AS n FROM nhat_ky WHERE hanh_dong = 'tu_choi_quyen'").get().n > 0);
  } finally {
    await may.dong();
  }
});

test('API ho so chi tra cac truong thuoc muc duoc cap', async () => {
  const may = await dungMayThu();
  try {
    const khach = await dangNhapTatCa(may);
    const moi = (await khach.motso.goi('GET', '/api/quan-nhan/1')).du;
    const coBan = new Set([...cotTheoMuc(['thong_tin_co_ban'], 'quan_nhan'), ...COT_LUON_TRA]);
    assert.ok(Object.keys(moi.quan_nhan).length > 5);
    for (const cot of Object.keys(moi.quan_nhan)) {
      assert.ok(coBan.has(cot), 'xem_mot_so_muc nhan cot ngoai muc: ' + cot);
    }
    for (const cotCam of ['so_can_cuoc', 'so_bhxh', 'he_so_luong', 'la_dang_vien', 'ton_giao_id', 'so_dien_thoai', 'noi_o_hien_nay', 'tim_kiem', 'da_xoa']) {
      assert.ok(!(cotCam in moi.quan_nhan), 'lo cot ' + cotCam);
    }
    for (const bang of ['than_nhan', 'luong', 'ky_luat_tien_an_tien_su', 'khen_thuong', 'dao_tao', 'qua_trinh_cong_tac', 'trang_thai_quan_nhan']) {
      assert.ok(!(bang in moi), 'khong duoc co ca khoa ' + bang);
    }
    assert.deepStrictEqual(moi.mucDuocXem, ['thong_tin_co_ban']);

    for (const ten of ['qtri', 'daydu']) {
      const day = (await khach[ten].goi('GET', '/api/quan-nhan/1')).du;
      assert.ok('so_can_cuoc' in day.quan_nhan && 'he_so_luong' in day.quan_nhan && 'la_dang_vien' in day.quan_nhan);
      assert.ok(Array.isArray(day.than_nhan) && day.than_nhan.length > 0);
      assert.ok(!('tim_kiem' in day.quan_nhan) && !('da_xoa' in day.quan_nhan), 'cot noi bo khong duoc ra ngoai');
      assert.strictEqual(day.mucDuocXem.length, 12);
    }
    assert.strictEqual((await khach.qtri.goi('GET', '/api/quan-nhan/99999')).ma, 404);
    assert.strictEqual((await khach.qtri.goi('GET', '/api/quan-nhan/abc')).ma, 400);
    // xem ho so duoc ghi nhat ky
    assert.ok(may.db.prepare("SELECT COUNT(*) AS n FROM nhat_ky WHERE hanh_dong = 'xem_ho_so' AND tai_khoan_id = ?").get(may.id.motso).n >= 1);
  } finally {
    await may.dong();
  }
});

test('cap them muc cho tai khoan: lan goi sau tra them dung cac truong cua muc do; muc nhay cam can xac nhan', async () => {
  const may = await dungMayThu();
  try {
    const khach = await dangNhapTatCa(may);
    const quyenUrl = '/api/tai-khoan/nguoi-dung/' + may.id.motso + '/quyen';

    // Muc khong nhay cam: luu thang
    assert.strictEqual((await khach.qtri.goi('PUT', quyenUrl, { muc: { lien_he: true } })).ma, 200);
    let ho = (await khach.motso.goi('GET', '/api/quan-nhan/1')).du;
    assert.ok('so_dien_thoai' in ho.quan_nhan && 'noi_o_hien_nay' in ho.quan_nhan);
    assert.ok(!('so_can_cuoc' in ho.quan_nhan) && !('he_so_luong' in ho.quan_nhan));

    // Muc nhay cam: khong xac nhan -> 409, chua doi gi
    const chua = await khach.qtri.goi('PUT', quyenUrl, { muc: { luong: true } });
    assert.strictEqual(chua.ma, 409);
    assert.strictEqual(chua.du.canhBao[0].ma, 'muc:luong');
    ho = (await khach.motso.goi('GET', '/api/quan-nhan/1')).du;
    assert.ok(!('he_so_luong' in ho.quan_nhan) && !('luong' in ho));
    // Xac nhan sai ma thi van chan
    assert.strictEqual((await khach.qtri.goi('PUT', quyenUrl, { muc: { luong: true }, xacNhan: ['muc:ky_luat'] })).ma, 409);
    // Xac nhan dung -> luu
    assert.strictEqual((await khach.qtri.goi('PUT', quyenUrl, { muc: { luong: true }, xacNhan: ['muc:luong'] })).ma, 200);
    ho = (await khach.motso.goi('GET', '/api/quan-nhan/1')).du;
    assert.ok('he_so_luong' in ho.quan_nhan && Array.isArray(ho.luong) && ho.luong.length > 0);
    assert.ok(!('so_can_cuoc' in ho.quan_nhan), 'van khong thay so dinh danh');
    assert.ok('bac_luong' in ho.luong[0] && !('so_quyet_dinh_co_quan' in ho.luong[0]));

    // Thu hoi quyen co hieu luc ngay lan goi sau
    assert.strictEqual((await khach.qtri.goi('PUT', quyenUrl, { muc: { luong: false } })).ma, 200);
    ho = (await khach.motso.goi('GET', '/api/quan-nhan/1')).du;
    assert.ok(!('he_so_luong' in ho.quan_nhan) && !('luong' in ho));

    // Nhat ky co dong doi quyen kem canh bao da xac nhan
    const dong = may.db.prepare("SELECT chi_tiet, ten_dang_nhap FROM nhat_ky WHERE hanh_dong = 'doi_quyen' ORDER BY id").all();
    assert.strictEqual(dong.length, 3);
    assert.strictEqual(dong[0].ten_dang_nhap, 'qtri');
    const ct = JSON.parse(dong[1].chi_tiet);
    assert.deepStrictEqual(ct.them, ['muc:luong']);
    assert.deepStrictEqual(ct.canhBaoDaXacNhan, ['muc:luong']);
    assert.deepStrictEqual(JSON.parse(dong[2].chi_tiet).bo, ['muc:luong']);
  } finally {
    await may.dong();
  }
});

test('bo loc ngoai muc duoc xem: canh bao suy ra thong tin, can xac nhan, va van khong lo truong cua muc do', async () => {
  const may = await dungMayThu({ dsMoDunThem: taoMoDunTam('thu', MA_MODUN_THU) });
  try {
    const khach = await dangNhapTatCa(may);
    const quyenUrl = '/api/tai-khoan/nguoi-dung/' + may.id.motso + '/quyen';
    assert.strictEqual((await khach.motso.goi('GET', '/api/thu/loc/dang-vien')).ma, 403);
    const chua = await khach.qtri.goi('PUT', quyenUrl, { boLoc: { la_dang_vien: true } });
    assert.strictEqual(chua.ma, 409);
    assert.strictEqual(chua.du.canhBao[0].ma, 'loc:la_dang_vien');
    assert.match(chua.du.canhBao[0].noiDung, /SUY RA/);
    assert.strictEqual((await khach.motso.goi('GET', '/api/thu/loc/dang-vien')).ma, 403, 'chua luu');
    assert.strictEqual((await khach.qtri.goi('PUT', quyenUrl, { boLoc: { la_dang_vien: true }, xacNhan: ['loc:la_dang_vien'] })).ma, 200);
    assert.strictEqual((await khach.motso.goi('GET', '/api/thu/loc/dang-vien')).ma, 200);
    const ho = (await khach.motso.goi('GET', '/api/quan-nhan/1')).du;
    assert.ok(!('la_dang_vien' in ho.quan_nhan), 'duoc loc nhung khong duoc xem cot');
    // Bo loc cung muc voi muc duoc xem (don_vi) khong can canh bao
    assert.strictEqual((await khach.qtri.goi('PUT', quyenUrl, { boLoc: { la_dang_vien: false, don_vi: false } })).ma, 200);
    assert.strictEqual((await khach.qtri.goi('PUT', quyenUrl, { boLoc: { don_vi: true } })).ma, 200);
    // Cap muc dang vien roi bo di: bo loc dang cap tro thanh "ngoai muc" thi cung phai canh bao
    assert.strictEqual((await khach.qtri.goi('PUT', quyenUrl, { muc: { dac_diem_chinh_tri: true }, xacNhan: ['muc:dac_diem_chinh_tri'] })).ma, 200);
    assert.strictEqual((await khach.qtri.goi('PUT', quyenUrl, { boLoc: { la_dang_vien: true } })).ma, 200, 'trong muc nen khong canh bao');
    const roi = await khach.qtri.goi('PUT', quyenUrl, { muc: { dac_diem_chinh_tri: false } });
    assert.strictEqual(roi.ma, 409);
    assert.strictEqual(roi.du.canhBao[0].ma, 'loc:la_dang_vien');
  } finally {
    await may.dong();
  }
});

test('bao cao chi chay khi du cac muc no can', async () => {
  const may = await dungMayThu({ dsMoDunThem: taoMoDunTam('thu', MA_MODUN_THU) });
  try {
    const khach = await dangNhapTatCa(may);
    const quyenUrl = '/api/tai-khoan/nguoi-dung/' + may.id.motso + '/quyen';
    // Cap bao cao con_nho nhung chua co muc than_nhan: van bi chan
    assert.strictEqual((await khach.qtri.goi('PUT', quyenUrl, { baoCao: { con_nho: true } })).ma, 200);
    assert.strictEqual((await khach.motso.goi('GET', '/api/thu/bao-cao/con-nho')).ma, 403);
    assert.strictEqual((await khach.qtri.goi('PUT', quyenUrl, { muc: { than_nhan: true } })).ma, 200);
    assert.strictEqual((await khach.motso.goi('GET', '/api/thu/bao-cao/con-nho')).ma, 200);
    // Dinh dang xuat la quyen rieng
    assert.strictEqual((await khach.motso.goi('GET', '/api/thu/xuat/xlsx')).ma, 403);
    assert.strictEqual((await khach.qtri.goi('PUT', quyenUrl, { xuat: { xlsx: true } })).ma, 200);
    assert.strictEqual((await khach.motso.goi('GET', '/api/thu/xuat/xlsx')).ma, 200);
  } finally {
    await may.dong();
  }
});

test('ky luat va tien an/tien su phan quyen theo tung dong', async () => {
  const may = await dungMayThu();
  try {
    const khach = await dangNhapTatCa(may);
    const quyenUrl = '/api/tai-khoan/nguoi-dung/' + may.id.motso + '/quyen';
    const nguoiTienSu = may.db.prepare("SELECT quan_nhan_id AS id FROM ky_luat_tien_an_tien_su WHERE loai = 'tien_su' LIMIT 1").get().id;
    const nguoiKyLuat = may.db.prepare("SELECT quan_nhan_id AS id FROM ky_luat_tien_an_tien_su WHERE loai = 'ky_luat' LIMIT 1").get().id;
    const bang = 'ky_luat_tien_an_tien_su';

    // Chua co muc nao: khong co ca khoa
    assert.ok(!(bang in (await khach.motso.goi('GET', '/api/quan-nhan/' + nguoiKyLuat)).du));
    // Chi co ky_luat: thay dong ky luat, KHONG thay dong tien su
    assert.strictEqual((await khach.qtri.goi('PUT', quyenUrl, { muc: { ky_luat: true }, xacNhan: ['muc:ky_luat'] })).ma, 200);
    let du = (await khach.motso.goi('GET', '/api/quan-nhan/' + nguoiKyLuat)).du;
    assert.ok(du[bang].length > 0 && du[bang].every((d) => d.loai === 'ky_luat'));
    du = (await khach.motso.goi('GET', '/api/quan-nhan/' + nguoiTienSu)).du;
    assert.ok(du[bang].every((d) => d.loai !== 'tien_su'), 'lo dong tien su khi chi co muc ky_luat');
    // Doi sang chi co tien_an_tien_su
    assert.strictEqual((await khach.qtri.goi('PUT', quyenUrl, { muc: { ky_luat: false, tien_an_tien_su: true }, xacNhan: ['muc:tien_an_tien_su'] })).ma, 200);
    du = (await khach.motso.goi('GET', '/api/quan-nhan/' + nguoiTienSu)).du;
    assert.ok(du[bang].length > 0 && du[bang].every((d) => d.loai === 'tien_su'));
    du = (await khach.motso.goi('GET', '/api/quan-nhan/' + nguoiKyLuat)).du;
    assert.ok(du[bang].every((d) => d.loai !== 'ky_luat'), 'lo dong ky luat khi chi co muc tien_an_tien_su');
  } finally {
    await may.dong();
  }
});

test('khong chinh duoc quyen admin, khong cap quyen khong ton tai, du lieu sai bi tu choi', async () => {
  const may = await dungMayThu();
  try {
    const khach = await dangNhapTatCa(may);
    assert.strictEqual((await khach.qtri.goi('PUT', '/api/tai-khoan/nguoi-dung/' + may.id.qtri + '/quyen', { muc: { luong: false } })).ma, 400);
    const quyenUrl = '/api/tai-khoan/nguoi-dung/' + may.id.motso + '/quyen';
    assert.strictEqual((await khach.qtri.goi('PUT', quyenUrl, { muc: { khong_co_muc_nay: true } })).ma, 400);
    assert.strictEqual((await khach.qtri.goi('PUT', quyenUrl, { muc: { luong: 'co' } })).ma, 400);
    assert.strictEqual((await khach.qtri.goi('PUT', '/api/tai-khoan/nguoi-dung/9999/quyen', {})).ma, 404);
    const tao = await khach.qtri.goi('POST', '/api/tai-khoan/nguoi-dung', { tenDangNhap: 'daydu', hoTen: 'Trung ten', loai: 'xem_day_du', matKhauTam: 'TamThoi123456' });
    assert.strictEqual(tao.ma, 409);
    const taoAdmin = await khach.qtri.goi('POST', '/api/tai-khoan/nguoi-dung', { tenDangNhap: 'admin2', hoTen: 'Admin 2', loai: 'admin', matKhauTam: 'TamThoi123456' });
    assert.strictEqual(taoAdmin.ma, 400, 'khong tao them admin qua API');
    const yeu = await khach.qtri.goi('POST', '/api/tai-khoan/nguoi-dung', { tenDangNhap: 'yeu1', hoTen: 'Yeu', loai: 'xem_day_du', matKhauTam: 'yeu' });
    assert.strictEqual(yeu.ma, 400);
    // GET quyen tra bang tick day du
    const ds = (await khach.qtri.goi('GET', quyenUrl)).du;
    assert.strictEqual(ds.muc.length, 12);
    assert.strictEqual(ds.muc.filter((m) => m.choPhep).length, 1);
    assert.strictEqual(ds.muc.filter((m) => m.nhayCam).length, 5);
    assert.strictEqual(ds.boLoc.length, 15);
    assert.strictEqual(ds.xuat.length, 3);
  } finally {
    await may.dong();
  }
});
