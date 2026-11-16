'use strict';
// Kiem thu trang thai hang ngay: them / sua / xoa khoang, khong chong nhau, "hom nay", phan quyen. Chay: npm test
const test = require('node:test');
const assert = require('node:assert');
const { dungMayThu, Khach, MAT_KHAU } = require('./tro-giup');
const { trangThaiNgay, trangThaiNhieuNguoi, timKhoangChong } = require('../modules/trang-thai/trang-thai-ngay');

async function dang(may, ten) {
  const khach = new Khach(may.goc);
  assert.strictEqual((await khach.dangNhap(ten, MAT_KHAU[ten])).ma, 200);
  return khach;
}
const idTT = (may, ma) => may.db.prepare("SELECT id FROM danh_muc WHERE loai = 'trang_thai' AND ma = ?").get(ma).id;
// Mot nguoi that su khong co dong trang thai nao
const nguoiTrong = (db) =>
  db.prepare('SELECT id FROM quan_nhan WHERE id NOT IN (SELECT quan_nhan_id FROM trang_thai_quan_nhan) ORDER BY id LIMIT 1').get().id;

test('trangThaiNgay: khong co khoang nao thi la "Co mat"; co khoang thi tra dung; khoang mo (khong den ngay)', async () => {
  const may = await dungMayThu();
  try {
    const id = nguoiTrong(may.db);
    const macDinh = trangThaiNgay(may.db, id, '2026-11-11');
    assert.strictEqual(macDinh.ma, 'co_mat');
    assert.strictEqual(macDinh.macDinh, true);
    assert.strictEqual(macDinh.tinh_la_vang, 0);
    const benhXa = idTT(may, 'benh_xa');
    may.db.prepare("INSERT INTO trang_thai_quan_nhan (quan_nhan_id, trang_thai_id, tu_ngay, den_ngay) VALUES (?, ?, '2026-11-10', '2026-11-12')").run(id, benhXa);
    may.db.prepare("INSERT INTO trang_thai_quan_nhan (quan_nhan_id, trang_thai_id, tu_ngay, den_ngay) VALUES (?, ?, '2026-11-20', NULL)").run(id, idTT(may, 'cong_tac'));
    assert.strictEqual(trangThaiNgay(may.db, id, '2026-11-09').ma, 'co_mat');
    for (const ngay of ['2026-11-10', '2026-11-11', '2026-11-12']) {
      assert.strictEqual(trangThaiNgay(may.db, id, ngay).ma, 'benh_xa', ngay);
    }
    assert.strictEqual(trangThaiNgay(may.db, id, '2026-11-13').ma, 'co_mat');
    assert.strictEqual(trangThaiNgay(may.db, id, '2030-01-01').ma, 'cong_tac', 'khoang chua ket thuc');
    const nhieu = trangThaiNhieuNguoi(may.db, [id, id + 1], '2026-11-11');
    assert.strictEqual(nhieu[id].ma, 'benh_xa');
    assert.ok(nhieu[id + 1]);
    assert.deepStrictEqual(trangThaiNhieuNguoi(may.db, [], '2026-11-11'), {});
  } finally {
    await may.dong();
  }
});

test('timKhoangChong: sat nhau khong chong, trung 1 ngay la chong, khoang mo chong moi khoang sau no', async () => {
  const may = await dungMayThu();
  try {
    const id = nguoiTrong(may.db);
    const tt = idTT(may, 'nghi_phep');
    may.db.prepare("INSERT INTO trang_thai_quan_nhan (quan_nhan_id, trang_thai_id, tu_ngay, den_ngay) VALUES (?, ?, '2026-11-10', '2026-11-20')").run(id, tt);
    assert.strictEqual(timKhoangChong(may.db, id, '2026-11-21', '2026-11-25'), null);
    assert.strictEqual(timKhoangChong(may.db, id, '2026-11-01', '2026-11-09'), null);
    assert.ok(timKhoangChong(may.db, id, '2026-11-20', '2026-11-25'), 'trung dung ngay cuoi');
    assert.ok(timKhoangChong(may.db, id, '2026-11-05', '2026-11-10'), 'trung dung ngay dau');
    assert.ok(timKhoangChong(may.db, id, '2026-11-12', '2026-11-13'), 'nam gon ben trong');
    assert.ok(timKhoangChong(may.db, id, '2026-11-01', '2026-12-31'), 'bao trum');
    assert.ok(timKhoangChong(may.db, id, '2026-11-15', null), 'khoang mo bat dau ben trong');
    assert.strictEqual(timKhoangChong(may.db, id + 1, '2026-11-12', '2026-11-13'), null, 'nguoi khac khong lien quan');
  } finally {
    await may.dong();
  }
});

test('API: them Benh xa hom nay -> ho so va danh sach hien dung; chong nhau bao loi ro; sua/xoa', async () => {
  const may = await dungMayThu();
  try {
    const admin = await dang(may, 'qtri');
    const daydu = await dang(may, 'daydu');
    const id = nguoiTrong(may.db);
    const url = '/api/trang-thai/quan-nhan/' + id;

    const tao = await admin.goi('POST', url, { trang_thai_id: idTT(may, 'benh_xa'), tu_ngay: '01/01/2000', den_ngay: null, ly_do_hoac_noi: 'Kham mau' });
    assert.strictEqual(tao.ma, 201, JSON.stringify(tao.du));
    // ho so + danh sach hien trang thai hom nay
    const ho = (await daydu.goi('GET', '/api/quan-nhan/' + id)).du;
    assert.strictEqual(ho.trangThaiHomNay.ma, 'benh_xa');
    assert.strictEqual(ho.trangThaiHomNay.tinh_la_vang, 1);
    assert.strictEqual(ho.trang_thai_quan_nhan.length, 1);
    const ds = (await daydu.goi('GET', '/api/quan-nhan?soDong=100')).du;
    assert.strictEqual(ds.trangThaiHomNay[id].ma, 'benh_xa');
    assert.strictEqual(ds.tenDanhMuc[ds.trangThaiHomNay[id].trang_thai_id], 'Bệnh xá');

    // Chong nhau -> 409 thong bao ro, nhac ten trang thai va khoang bi chong
    const chong = await admin.goi('POST', url, { trang_thai_id: idTT(may, 'nghi_phep'), tu_ngay: '05/05/2030', den_ngay: '06/05/2030' });
    assert.strictEqual(chong.ma, 409);
    assert.strictEqual(chong.du.ma, 'TRUNG_KHOANG_NGAY');
    assert.match(chong.du.loi, /chồng với trạng thái "Bệnh xá" \(01\/01\/2000 – chưa kết thúc\)/);
    assert.strictEqual(chong.du.xungDot.trang_thai, 'Bệnh xá');
    // Ket thuc khoang cu hom qua roi them khoang moi tu hom nay: duoc
    const dongCu = ho.trang_thai_quan_nhan[0].id;
    assert.strictEqual((await admin.goi('PUT', '/api/trang-thai/' + dongCu, { trang_thai_id: idTT(may, 'benh_xa'), tu_ngay: '01/01/2000', den_ngay: '31/12/2025' })).ma, 200);
    assert.strictEqual((await admin.goi('POST', url, { trang_thai_id: idTT(may, 'nghi_phep'), tu_ngay: '01/01/2026', den_ngay: null })).ma, 201);
    assert.strictEqual((await daydu.goi('GET', '/api/quan-nhan/' + id)).du.trangThaiHomNay.ma, 'nghi_phep');
    // Sua khoang moi thanh trung khoang cu -> chong (khong tinh chinh no)
    const dongMoi = (await daydu.goi('GET', url)).du.dong.find((d) => d.ma_trang_thai === 'nghi_phep').id;
    assert.strictEqual((await admin.goi('PUT', '/api/trang-thai/' + dongMoi, { trang_thai_id: idTT(may, 'nghi_phep'), tu_ngay: '15/06/2025', den_ngay: null })).ma, 409);
    assert.strictEqual((await admin.goi('PUT', '/api/trang-thai/' + dongMoi, { trang_thai_id: idTT(may, 'cong_tac'), tu_ngay: '01/01/2026', den_ngay: null })).ma, 200, 'sua khong tu chong voi chinh no');
    // Xoa
    assert.strictEqual((await admin.goi('DELETE', '/api/trang-thai/' + dongMoi)).ma, 200);
    const sauXoa = (await daydu.goi('GET', '/api/quan-nhan/' + id)).du.trangThaiHomNay;
    assert.strictEqual(sauXoa.ma, 'co_mat', 'het khoang nao thi tro ve Co mat');
    assert.strictEqual(sauXoa.macDinh, true);
    // Nhat ky
    const hd = may.db.prepare("SELECT hanh_dong FROM nhat_ky WHERE doi_tuong = 'trang_thai_quan_nhan'").all().map((d) => d.hanh_dong);
    assert.deepStrictEqual([...new Set(hd)].sort(), ['sua_trang_thai', 'them_trang_thai', 'xoa_trang_thai']);
  } finally {
    await may.dong();
  }
});

test('API trang thai: du lieu sai bi tu choi ro rang; quyen: chi admin ghi, can muc trang_thai de xem', async () => {
  const may = await dungMayThu();
  try {
    const admin = await dang(may, 'qtri');
    const daydu = await dang(may, 'daydu');
    const motso = await dang(may, 'motso');
    const id = nguoiTrong(may.db);
    const url = '/api/trang-thai/quan-nhan/' + id;
    const tt = idTT(may, 'nghi_phep');
    const loi = async (body, ma, mau) => {
      const kq = await admin.goi('POST', url, body);
      assert.strictEqual(kq.ma, ma, JSON.stringify(body) + ' -> ' + kq.ma);
      if (mau) {
        assert.match(kq.du.loi, mau);
      }
    };
    await loi({ trang_thai_id: tt, tu_ngay: '31/02/2026' }, 400, /không có trong tháng/);
    await loi({ trang_thai_id: tt, tu_ngay: '10/11/2026', den_ngay: '09/11/2026' }, 400, /không được trước/);
    await loi({ trang_thai_id: tt, tu_ngay: '11/2026' }, 400, /ngày đầy đủ/);
    await loi({ trang_thai_id: 999999, tu_ngay: '10/11/2026' }, 400, /không có trong danh mục/);
    await loi({ trang_thai_id: may.db.prepare("SELECT id FROM danh_muc WHERE loai = 'quan_ham' LIMIT 1").get()?.id || 1, tu_ngay: '10/11/2026' }, 400, /không có trong danh mục/);
    await loi({ trang_thai_id: tt, tu_ngay: '10/11/2026', them: 1 }, 400);
    await loi({ tu_ngay: '10/11/2026' }, 400);
    assert.strictEqual((await admin.goi('POST', '/api/trang-thai/quan-nhan/99999', { trang_thai_id: tt, tu_ngay: '10/11/2026' })).ma, 404);
    assert.strictEqual((await admin.goi('PUT', '/api/trang-thai/99999', { trang_thai_id: tt, tu_ngay: '10/11/2026' })).ma, 404);
    // phan quyen
    assert.strictEqual((await daydu.goi('POST', url, { trang_thai_id: tt, tu_ngay: '10/11/2026' })).ma, 403);
    assert.strictEqual((await motso.goi('GET', url)).ma, 403, 'chua duoc cap muc trang_thai');
    assert.strictEqual((await daydu.goi('GET', url)).ma, 200);
    assert.strictEqual((await new Khach(may.goc).goi('GET', url)).ma, 401);
    // xem_mot_so_muc khong thay trang thai trong ho so, ca danh sach
    const ho = (await motso.goi('GET', '/api/quan-nhan/' + id)).du;
    assert.ok(!('trangThaiHomNay' in ho) && !('trang_thai_quan_nhan' in ho));
    assert.ok(!('trangThaiHomNay' in (await motso.goi('GET', '/api/quan-nhan')).du));
  } finally {
    await may.dong();
  }
});

// ---- Ngay o tuong lai ----
const { ngayDuongLich: homNayISO } = require('../../shared/ngay-chuoi.js');
const dinhDang = (d) => String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
const congNgayLocal = (soNgay) => {
  const d = new Date();
  d.setDate(d.getDate() + soNgay);
  return d;
};

test('ngay tuong lai: benh vien/benh xa/khac KHONG dang ky truoc duoc; nghi phep, cong tac thi duoc', async () => {
  const may = await dungMayThu();
  try {
    const admin = await dang(may, 'qtri');
    const daydu = await dang(may, 'daydu');
    const ids = may.db.prepare('SELECT id FROM quan_nhan WHERE id NOT IN (SELECT quan_nhan_id FROM trang_thai_quan_nhan) ORDER BY id LIMIT 6').all().map((d) => d.id);
    const url = (i) => '/api/trang-thai/quan-nhan/' + ids[i];
    const demDong = (i) => may.db.prepare('SELECT COUNT(*) AS n FROM trang_thai_quan_nhan WHERE quan_nhan_id = ?').get(ids[i]).n;
    const namSau = dinhDang(congNgayLocal(400));
    const mai = dinhDang(congNgayLocal(1));
    const homNay = dinhDang(new Date());

    // Truong hop nguoi dung gap: Benh xa nam sau
    const xa = await admin.goi('POST', url(0), { trang_thai_id: idTT(may, 'benh_xa'), tu_ngay: namSau, den_ngay: null });
    assert.strictEqual(xa.ma, 400);
    assert.strictEqual(xa.du.ma, 'NGAY_TUONG_LAI');
    assert.match(xa.du.loi, /"Bệnh xá" không đăng ký trước được/);
    assert.ok(xa.du.loi.includes(namSau), 'noi ro ngay sai');
    assert.match(xa.du.loi, /"Nghỉ phép", "Công tác" mới đăng ký trước được/);
    assert.strictEqual(demDong(0), 0, 'bi tu choi thi khong ghi gi');
    // ca 3 loai
    for (const ma of ['benh_vien', 'benh_xa', 'khac']) {
      assert.strictEqual((await admin.goi('POST', url(0), { trang_thai_id: idTT(may, ma), tu_ngay: mai, den_ngay: null })).ma, 400, ma + ' ngay mai');
    }
    // "den ngay" o tuong lai cung bi tu choi, goi y de trong
    const den = await admin.goi('POST', url(0), { trang_thai_id: idTT(may, 'benh_xa'), tu_ngay: homNay, den_ngay: namSau });
    assert.strictEqual(den.ma, 400);
    assert.match(den.du.loi, /để trống "đến ngày"/);
    assert.strictEqual(demDong(0), 0);
    // Dung cach: bat dau hom nay, chua ket thuc
    assert.strictEqual((await admin.goi('POST', url(0), { trang_thai_id: idTT(may, 'benh_xa'), tu_ngay: homNay, den_ngay: null })).ma, 201);
    assert.strictEqual((await daydu.goi('GET', '/api/quan-nhan/' + ids[0])).du.trangThaiHomNay.ma, 'benh_xa');
    // Da ket thuc hom qua: duoc
    assert.strictEqual((await admin.goi('POST', url(1), { trang_thai_id: idTT(may, 'benh_vien'), tu_ngay: dinhDang(congNgayLocal(-5)), den_ngay: dinhDang(congNgayLocal(-1)) })).ma, 201);
    // den ngay = hom nay: duoc
    assert.strictEqual((await admin.goi('POST', url(2), { trang_thai_id: idTT(may, 'khac'), tu_ngay: dinhDang(congNgayLocal(-2)), den_ngay: homNay })).ma, 201);

    // Nghi phep va cong tac dang ky truoc duoc
    for (const [i, ma] of [[3, 'nghi_phep'], [4, 'cong_tac']]) {
      const ok = await admin.goi('POST', url(i), { trang_thai_id: idTT(may, ma), tu_ngay: namSau, den_ngay: null });
      assert.strictEqual(ok.ma, 201, ma + ': ' + JSON.stringify(ok.du));
    }
    // Chua den ngay thi hom nay van la "Co mat"
    assert.strictEqual((await daydu.goi('GET', '/api/quan-nhan/' + ids[3])).du.trangThaiHomNay.ma, 'co_mat');

    // Sua mot khoang dang hop le thanh ngay tuong lai cung bi chan
    const dongId = (await daydu.goi('GET', url(1))).du.dong[0].id;
    const sua = await admin.goi('PUT', '/api/trang-thai/' + dongId, { trang_thai_id: idTT(may, 'benh_vien'), tu_ngay: mai, den_ngay: null });
    assert.strictEqual(sua.ma, 400);
    assert.strictEqual(sua.du.ma, 'NGAY_TUONG_LAI');
  } finally {
    await may.dong();
  }
});

test('admin doi duoc loai nao dang ky truoc o man hinh Danh muc', async () => {
  const may = await dungMayThu();
  try {
    const admin = await dang(may, 'qtri');
    const nguoi = may.db.prepare('SELECT id FROM quan_nhan WHERE id NOT IN (SELECT quan_nhan_id FROM trang_thai_quan_nhan) ORDER BY id LIMIT 1').get().id;
    const url = '/api/trang-thai/quan-nhan/' + nguoi;
    const namSau = dinhDang(congNgayLocal(400));
    // Mac dinh: chi nghi phep va cong tac
    const dm = (await admin.goi('GET', '/api/danh-muc?loai=trang_thai')).du.dong;
    assert.deepStrictEqual(dm.filter((d) => d.cho_dang_ky_truoc === 1).map((d) => d.ma).sort(), ['cong_tac', 'nghi_phep']);
    assert.strictEqual((await admin.goi('POST', url, { trang_thai_id: idTT(may, 'benh_xa'), tu_ngay: namSau })).ma, 400);
    // Bat cho benh xa -> duoc
    assert.strictEqual((await admin.goi('PUT', '/api/danh-muc/' + idTT(may, 'benh_xa'), { cho_dang_ky_truoc: true })).ma, 200);
    assert.strictEqual((await admin.goi('POST', url, { trang_thai_id: idTT(may, 'benh_xa'), tu_ngay: namSau })).ma, 201);
    // Tat cho nghi phep -> bi chan, va thong bao cap nhat danh sach loai duoc dang ky truoc
    assert.strictEqual((await admin.goi('PUT', '/api/danh-muc/' + idTT(may, 'nghi_phep'), { cho_dang_ky_truoc: false })).ma, 200);
    const chan = await admin.goi('POST', '/api/trang-thai/quan-nhan/' + (nguoi + 1), { trang_thai_id: idTT(may, 'nghi_phep'), tu_ngay: namSau });
    assert.strictEqual(chan.ma, 400);
    assert.match(chan.du.loi, /"Công tác", "Bệnh xá" mới đăng ký trước được/);
    // Co chi ap dung cho trang thai; "Co mat" duoc bao ve; loai moi tao co the dat co
    assert.strictEqual((await admin.goi('PUT', '/api/danh-muc/' + may.db.prepare("SELECT id FROM danh_muc WHERE ma = 'dai_uy'").get().id, { cho_dang_ky_truoc: true })).ma, 400);
    assert.strictEqual((await admin.goi('PUT', '/api/danh-muc/' + idTT(may, 'co_mat'), { cho_dang_ky_truoc: true })).ma, 400);
    const moi = await admin.goi('POST', '/api/danh-muc', { loai: 'trang_thai', ma: 'huan_luyen', ten: 'Huấn luyện', tinh_la_vang: true, cho_dang_ky_truoc: true });
    assert.strictEqual(moi.ma, 201);
    assert.strictEqual((await admin.goi('POST', '/api/danh-muc', { loai: 'quan_ham', ma: 'x', ten: 'X', cho_dang_ky_truoc: true })).ma, 400);
    assert.strictEqual((await admin.goi('POST', '/api/trang-thai/quan-nhan/' + (nguoi + 2), { trang_thai_id: moi.du.id, tu_ngay: namSau })).ma, 201);
  } finally {
    await may.dong();
  }
});

test('du lieu gia: khong co trang thai nao vi pham quy tac ngay tuong lai', async () => {
  const may = await dungMayThu();
  try {
    const homNay = homNayISO(new Date(2026, 10, 11));
    const sai = may.db
      .prepare(
        `SELECT COUNT(*) AS n FROM trang_thai_quan_nhan t JOIN danh_muc d ON d.id = t.trang_thai_id
          WHERE d.cho_dang_ky_truoc = 0 AND (t.tu_ngay > ? OR COALESCE(t.den_ngay, '0000-00-00') > ?)`
      )
      .get(homNay, homNay).n;
    assert.strictEqual(sai, 0);
  } finally {
    await may.dong();
  }
});
