'use strict';
// Kiem thu dang nhap, phien, khoa tam, CSRF, admin chi o may chu. Chay: npm test
const test = require('node:test');
const assert = require('node:assert');
const { dungMayThu, Khach, diaChiMangNgoai, MAT_KHAU } = require('./tro-giup');
const { kiemTraMatKhau } = require('../modules/tai-khoan/dich-vu');
const { bamSha256 } = require('../loi/xac-thuc');

test('chinh sach mat khau', () => {
  assert.match(kiemTraMatKhau('ngan1', 'a'), /ít nhất 10/);
  assert.match(kiemTraMatKhau('chiCoChuCaiThoi', 'a'), /cả chữ và số/);
  assert.match(kiemTraMatKhau('1234567890123', 'a'), /cả chữ và số/);
  assert.match(kiemTraMatKhau('xyzAdmin123456', 'admin'), /tên đăng nhập/);
  assert.match(kiemTraMatKhau('a1'.repeat(40), 'x'), /quá dài/);
  assert.strictEqual(kiemTraMatKhau('MatKhauTot1234', 'admin'), null);
  assert.strictEqual(kiemTraMatKhau('Mật khẩu tiếng Việt 2026', 'admin'), null);
});

test('dang nhap dung: cookie httpOnly SameSite=Strict, ma phien luu dang bam, /toi tra dung nguoi', async () => {
  const may = await dungMayThu();
  try {
    const khach = new Khach(may.goc);
    const kq = await khach.dangNhap('daydu', MAT_KHAU.daydu);
    assert.strictEqual(kq.ma, 200);
    assert.strictEqual(kq.du.nguoiDung.loai, 'xem_day_du');
    assert.ok(kq.du.csrfToken.length >= 20);
    const cookie = kq.cacCookie.find((c) => c.startsWith('hrm_phien='));
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /SameSite=Strict/);
    assert.doesNotMatch(cookie, /Secure/, 'HTTP thi khong co Secure');
    const maPhien = cookie.slice('hrm_phien='.length).split(';')[0];
    // Trong CSDL chi co gia tri bam, khong co ma phien goc
    const dong = may.db.prepare('SELECT id FROM phien').all();
    assert.strictEqual(dong.length, 1);
    assert.strictEqual(dong[0].id, bamSha256(maPhien));
    assert.notStrictEqual(dong[0].id, maPhien);
    const toi = await khach.goi('GET', '/api/tai-khoan/toi');
    assert.strictEqual(toi.ma, 200);
    assert.strictEqual(toi.du.nguoiDung.tenDangNhap, 'daydu');
    assert.strictEqual(toi.du.quyen.laAdmin, false);
    assert.strictEqual(toi.du.quyen.muc.length, 12);
  } finally {
    await may.dong();
  }
});

test('Secure chi bat khi bat HTTPS', async () => {
  const may = await dungMayThu({ cauHinhThem: { batHttps: true } });
  try {
    const kq = await new Khach(may.goc).dangNhap('daydu', MAT_KHAU.daydu);
    assert.match(kq.cacCookie.find((c) => c.startsWith('hrm_phien=')), /Secure/);
  } finally {
    await may.dong();
  }
});

test('sai ten hay sai mat khau deu cung mot thong bao (khong lo tai khoan co ton tai)', async () => {
  const may = await dungMayThu();
  try {
    const khach = new Khach(may.goc);
    const saiMk = await khach.dangNhap('daydu', 'SaiMatKhau12345');
    const saiTen = await khach.dangNhap('khong_co_ai', 'SaiMatKhau12345');
    assert.strictEqual(saiMk.ma, 401);
    assert.strictEqual(saiTen.ma, 401);
    assert.deepStrictEqual(saiMk.du, saiTen.du);
    assert.strictEqual((await khach.goi('GET', '/api/tai-khoan/toi')).ma, 401);
    const thieu = await khach.goi('POST', '/api/tai-khoan/dang-nhap', { tenDangNhap: 'daydu' });
    assert.strictEqual(thieu.ma, 400);
    assert.ok(!JSON.stringify(thieu.du).includes('daydu'));
  } finally {
    await may.dong();
  }
});

test('khoa tam tai khoan sau 5 lan sai; het han khoa thi dang nhap lai duoc', async () => {
  const may = await dungMayThu();
  try {
    const khach = new Khach(may.goc);
    for (let i = 0; i < 5; i += 1) {
      assert.strictEqual((await khach.dangNhap('daydu', 'SaiMatKhau12345')).ma, 401);
    }
    const bi = await khach.dangNhap('daydu', MAT_KHAU.daydu);
    assert.strictEqual(bi.ma, 423, 'dang nhap dung nhung dang bi khoa tam');
    assert.match(bi.du.loi, /tạm khóa/);
    may.db.prepare("UPDATE nguoi_dung SET khoa_den = '2000-01-01T00:00:00.000Z' WHERE ten_dang_nhap = 'daydu'").run();
    assert.strictEqual((await khach.dangNhap('daydu', MAT_KHAU.daydu)).ma, 200);
    assert.strictEqual(may.db.prepare("SELECT so_lan_sai FROM nguoi_dung WHERE ten_dang_nhap = 'daydu'").get().so_lan_sai, 0);
  } finally {
    await may.dong();
  }
});

test('khoa tam theo dia chi may sau 20 lan sai (du la ten khong ton tai)', async () => {
  const may = await dungMayThu();
  try {
    const khach = new Khach(may.goc);
    for (let i = 0; i < 20; i += 1) {
      assert.strictEqual((await khach.dangNhap('ai_do' + i, 'SaiMatKhau12345')).ma, 401);
    }
    const bi = await khach.dangNhap('motso', MAT_KHAU.motso);
    assert.strictEqual(bi.ma, 429);
    assert.strictEqual(bi.du.ma, 'MAY_BI_KHOA');
  } finally {
    await may.dong();
  }
});

test('chong CSRF: thay doi du lieu phai kem ma CSRF dung', async () => {
  const may = await dungMayThu();
  try {
    const khach = new Khach(may.goc);
    await khach.dangNhap('daydu', MAT_KHAU.daydu);
    const thieu = await khach.goi('POST', '/api/tai-khoan/dang-xuat', {}, { khongCsrf: true });
    assert.strictEqual(thieu.ma, 403);
    assert.strictEqual(thieu.du.ma, 'CSRF');
    const sai = await khach.goi('POST', '/api/tai-khoan/dang-xuat', {}, { csrfSai: 'ma-gia-mao' });
    assert.strictEqual(sai.ma, 403);
    assert.strictEqual(sai.du.ma, 'CSRF');
    assert.strictEqual((await khach.goi('GET', '/api/tai-khoan/toi')).ma, 200, 'van con dang nhap');
    assert.strictEqual((await khach.goi('POST', '/api/tai-khoan/dang-xuat', {})).ma, 200);
  } finally {
    await may.dong();
  }
});

test('dang xuat huy phien o may chu', async () => {
  const may = await dungMayThu();
  try {
    const khach = new Khach(may.goc);
    await khach.dangNhap('daydu', MAT_KHAU.daydu);
    const cookieCu = khach.cookie;
    await khach.goi('POST', '/api/tai-khoan/dang-xuat', {});
    assert.strictEqual(may.db.prepare('SELECT COUNT(*) AS n FROM phien').get().n, 0);
    const keGian = new Khach(may.goc);
    keGian.cookie = cookieCu; // ke trom dung lai cookie cu
    assert.strictEqual((await keGian.goi('GET', '/api/tai-khoan/toi')).ma, 401);
  } finally {
    await may.dong();
  }
});

test('phien het han do khong hoat dong bi tu choi o may chu', async () => {
  const may = await dungMayThu();
  try {
    const khach = new Khach(may.goc);
    await khach.dangNhap('daydu', MAT_KHAU.daydu);
    may.db.prepare("UPDATE phien SET hoat_dong_cuoi_luc = ?").run(new Date(Date.now() - 31 * 60 * 1000).toISOString());
    assert.strictEqual((await khach.goi('GET', '/api/tai-khoan/toi')).ma, 401);
    assert.strictEqual(may.db.prepare('SELECT COUNT(*) AS n FROM phien').get().n, 0, 'phien het han bi xoa');
  } finally {
    await may.dong();
  }
});

test('tai khoan moi phai doi mat khau lan dau truoc khi dung chuc nang khac', async () => {
  const may = await dungMayThu();
  try {
    const quanTri = new Khach(may.goc);
    await quanTri.dangNhap('qtri', MAT_KHAU.qtri);
    const tao = await quanTri.goi('POST', '/api/tai-khoan/nguoi-dung', { tenDangNhap: 'moi1', hoTen: 'Người mới', loai: 'xem_day_du', matKhauTam: 'TamThoi123456' });
    assert.strictEqual(tao.ma, 201);

    const moi = new Khach(may.goc);
    const dn = await moi.dangNhap('moi1', 'TamThoi123456');
    assert.strictEqual(dn.ma, 200);
    assert.strictEqual(dn.du.nguoiDung.phaiDoiMatKhau, true);
    const bi = await moi.goi('GET', '/api/quan-nhan/1');
    assert.strictEqual(bi.ma, 403);
    assert.strictEqual(bi.du.ma, 'PHAI_DOI_MAT_KHAU');
    assert.strictEqual((await moi.goi('GET', '/api/tai-khoan/toi')).ma, 200);

    assert.strictEqual((await moi.goi('POST', '/api/tai-khoan/doi-mat-khau', { matKhauCu: 'TamThoi123456', matKhauMoi: 'yeu' })).ma, 400);
    assert.strictEqual((await moi.goi('POST', '/api/tai-khoan/doi-mat-khau', { matKhauCu: 'SaiMatKhauCu123', matKhauMoi: 'MatKhauMoiTot123' })).ma, 403);
    assert.strictEqual((await moi.goi('POST', '/api/tai-khoan/doi-mat-khau', { matKhauCu: 'TamThoi123456', matKhauMoi: 'TamThoi123456' })).ma, 400);
    // dang nhap o may khac de kiem tra phien cu bi dua ra sau khi doi mat khau
    const may2 = new Khach(may.goc);
    await may2.dangNhap('moi1', 'TamThoi123456');
    const ok = await moi.goi('POST', '/api/tai-khoan/doi-mat-khau', { matKhauCu: 'TamThoi123456', matKhauMoi: 'MatKhauMoiTot123' });
    assert.strictEqual(ok.ma, 200);
    assert.strictEqual((await moi.goi('GET', '/api/quan-nhan/1')).ma, 200);
    assert.strictEqual((await may2.goi('GET', '/api/tai-khoan/toi')).ma, 401, 'phien khac bi dua ra');
    assert.strictEqual((await new Khach(may.goc).dangNhap('moi1', 'TamThoi123456')).ma, 401, 'mat khau cu het tac dung');
    assert.strictEqual((await new Khach(may.goc).dangNhap('moi1', 'MatKhauMoiTot123')).ma, 200);
  } finally {
    await may.dong();
  }
});

test('admin chi dang nhap tu chinh may chu', async (t) => {
  const diaChi = diaChiMangNgoai();
  if (!diaChi) {
    t.skip('may khong co dia chi mang ngoai de thu');
    return;
  }
  const may = await dungMayThu();
  try {
    const goc = 'http://' + diaChi + ':' + may.cong;
    const khach = new Khach(goc);
    const dung = await khach.dangNhap('qtri', MAT_KHAU.qtri);
    assert.strictEqual(dung.ma, 403);
    assert.strictEqual(dung.du.ma, 'ADMIN_CHI_O_MAY_CHU');
    const sai = await khach.dangNhap('qtri', 'SaiMatKhau12345');
    assert.strictEqual(sai.ma, 403, 'tu xa khong duoc do mat khau admin');
    assert.strictEqual(may.db.prepare("SELECT so_lan_sai FROM nguoi_dung WHERE ten_dang_nhap = 'qtri'").get().so_lan_sai, 0, 'khong lam khoa admin');
    // Tai khoan thuong van dang nhap duoc tu may khac
    assert.strictEqual((await new Khach(goc).dangNhap('daydu', MAT_KHAU.daydu)).ma, 200);
    // Cookie admin lay duoc o may chu cung khong dung duoc tu may khac
    const taiMayChu = new Khach(may.goc);
    assert.strictEqual((await taiMayChu.dangNhap('qtri', MAT_KHAU.qtri)).ma, 200);
    const keTrom = new Khach(goc);
    keTrom.cookie = taiMayChu.cookie;
    assert.strictEqual((await keTrom.goi('GET', '/api/tai-khoan/toi')).ma, 401);
    assert.ok(may.db.prepare("SELECT COUNT(*) AS n FROM nhat_ky WHERE hanh_dong = 'dang_nhap_admin_tu_xa'").get().n >= 2);
  } finally {
    await may.dong();
  }
});

test('chi mot phien admin cung luc; dang nhap lan hai phai xac nhan dua phien cu ra', async () => {
  const may = await dungMayThu();
  try {
    const a = new Khach(may.goc);
    assert.strictEqual((await a.dangNhap('qtri', MAT_KHAU.qtri)).ma, 200);
    const b = new Khach(may.goc);
    const hoi = await b.dangNhap('qtri', MAT_KHAU.qtri);
    assert.strictEqual(hoi.ma, 409);
    assert.strictEqual(hoi.du.coPhienCu, true);
    assert.strictEqual((await a.goi('GET', '/api/tai-khoan/toi')).ma, 200, 'phien cu van con khi chua xac nhan');
    assert.strictEqual((await b.dangNhap('qtri', MAT_KHAU.qtri, { dayPhienCu: true })).ma, 200);
    assert.strictEqual((await a.goi('GET', '/api/tai-khoan/toi')).ma, 401, 'phien cu bi dua ra');
    assert.strictEqual((await b.goi('GET', '/api/tai-khoan/toi')).ma, 200);
    assert.strictEqual(may.db.prepare("SELECT COUNT(*) AS n FROM nhat_ky WHERE hanh_dong = 'day_phien_admin_cu'").get().n, 1);
  } finally {
    await may.dong();
  }
});

test('khoa tai khoan bang API dua phien dang dung ra va chan dang nhap lai; khong khoa duoc admin hay chinh minh', async () => {
  const may = await dungMayThu();
  try {
    const quanTri = new Khach(may.goc);
    await quanTri.dangNhap('qtri', MAT_KHAU.qtri);
    const nguoi = new Khach(may.goc);
    await nguoi.dangNhap('daydu', MAT_KHAU.daydu);
    assert.strictEqual((await quanTri.goi('PATCH', '/api/tai-khoan/nguoi-dung/' + may.id.daydu, { biKhoa: true })).ma, 200);
    assert.strictEqual((await nguoi.goi('GET', '/api/tai-khoan/toi')).ma, 401);
    const khoa = await new Khach(may.goc).dangNhap('daydu', MAT_KHAU.daydu);
    assert.strictEqual(khoa.ma, 403);
    assert.strictEqual(khoa.du.ma, 'TAI_KHOAN_BI_KHOA');
    assert.strictEqual((await quanTri.goi('PATCH', '/api/tai-khoan/nguoi-dung/' + may.id.daydu, { biKhoa: false })).ma, 200);
    assert.strictEqual((await new Khach(may.goc).dangNhap('daydu', MAT_KHAU.daydu)).ma, 200);
    assert.strictEqual((await quanTri.goi('PATCH', '/api/tai-khoan/nguoi-dung/' + may.id.qtri, { biKhoa: true })).ma, 400);
    // dat lai mat khau bat doi lan dau va dua phien ra
    const dn = new Khach(may.goc);
    await dn.dangNhap('motso', MAT_KHAU.motso);
    assert.strictEqual((await quanTri.goi('POST', '/api/tai-khoan/nguoi-dung/' + may.id.motso + '/dat-lai-mat-khau', { matKhauTam: 'DatLaiTam123456' })).ma, 200);
    assert.strictEqual((await dn.goi('GET', '/api/tai-khoan/toi')).ma, 401);
    const lai = await new Khach(may.goc).dangNhap('motso', 'DatLaiTam123456');
    assert.strictEqual(lai.du.nguoiDung.phaiDoiMatKhau, true);
  } finally {
    await may.dong();
  }
});

test('nhat ky ghi dang nhap, that bai, doi mat khau va KHONG chua mat khau', async () => {
  const may = await dungMayThu();
  try {
    const khach = new Khach(may.goc);
    await khach.dangNhap('daydu', 'SaiMatKhau12345');
    await khach.dangNhap('daydu', MAT_KHAU.daydu);
    await khach.goi('POST', '/api/tai-khoan/doi-mat-khau', { matKhauCu: MAT_KHAU.daydu, matKhauMoi: 'MatKhauMoiTot123' });
    await khach.goi('POST', '/api/tai-khoan/dang-xuat', {});
    const hanhDong = may.db.prepare('SELECT hanh_dong FROM nhat_ky').all().map((d) => d.hanh_dong);
    for (const h of ['dang_nhap_that_bai', 'dang_nhap', 'doi_mat_khau', 'dang_xuat']) {
      assert.ok(hanhDong.includes(h), 'thieu ' + h);
    }
    const toanBo = JSON.stringify(may.db.prepare('SELECT * FROM nhat_ky').all());
    for (const mk of [...Object.values(MAT_KHAU), 'SaiMatKhau12345', 'MatKhauMoiTot123']) {
      assert.ok(!toanBo.includes(mk), 'nhat ky chua mat khau');
    }
    const dongDangNhap = may.db.prepare("SELECT ten_dang_nhap, may FROM nhat_ky WHERE hanh_dong = 'dang_nhap'").get();
    assert.strictEqual(dongDangNhap.ten_dang_nhap, 'daydu');
    assert.ok(dongDangNhap.may);
  } finally {
    await may.dong();
  }
});

test('/api/suc-khoe cong khai, API khac can dang nhap', async () => {
  const may = await dungMayThu();
  try {
    const khach = new Khach(may.goc);
    assert.strictEqual((await khach.goi('GET', '/api/suc-khoe')).ma, 200);
    assert.strictEqual((await khach.goi('GET', '/api/xin-chao')).ma, 401);
    assert.strictEqual((await khach.goi('GET', '/api/quan-nhan/1')).ma, 401);
    assert.strictEqual((await khach.goi('GET', '/api/khong-co')).ma, 404);
  } finally {
    await may.dong();
  }
});
