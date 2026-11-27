'use strict';
// Kiem thu ho so: danh sach, xem, che so dinh danh, them/sua/xoa mem, khoa lac quan. Chay: npm test
const test = require('node:test');
const assert = require('node:assert');
const { dungMayThu, Khach, MAT_KHAU } = require('./tro-giup');
const { TRUONG } = require('../../shared/truong-muc.js');
const { dongSangBieuMau } = require('../../shared/bieu-mau.js');
const { tinhTuoi, ngayDuongLich } = require('../../shared/ngay-chuoi.js');

async function dang(may, ten) {
  const khach = new Khach(may.goc);
  assert.strictEqual((await khach.dangNhap(ten, MAT_KHAU[ten])).ma, 200);
  return khach;
}
const idDm = (may, loai, ma) => may.db.prepare('SELECT id FROM danh_muc WHERE loai = ? AND ma = ?').get(loai, ma).id;

// Bieu mau day du cho mot ho so moi
function hoSoMoi(may, ma, them = {}) {
  return {
    quan_nhan: {
      ma_quan_nhan: ma, ho_ten_khai_sinh: 'NGUYỄN VĂN MỚI', ngay_sinh: '20/10/2000', gioi_tinh: 'nam', que_quan: 'Xã A, tỉnh B',
      don_vi: idDm(may, 'don_vi', 'gia_c1'), quan_ham: idDm(may, 'quan_ham', 'dai_uy'), chuc_vu: idDm(may, 'chuc_vu', 'dai_doi_truong'),
      ngay_tuyen_dung_lan_dau: '05/09/2016', la_dang_vien: true, ngay_vao_dang: '02/2019', so_can_cuoc: '900000009999', he_so_luong: '5,4',
      so_dien_thoai: '0912345678', ...them,
    },
    than_nhan: [
      { nhom: 'ban_than', quan_he: 'cha', ho_ten: 'Nguyễn Văn Cha', ngay_sinh: '1970', so_can_cuoc: '900000001111' },
    ].map((d) => ({ ...d, ngay_sinh: '07/1970' })),
    luong: [{ tu_thang_nam: '07/2020', he_so_luong: '4,0' }],
  };
}

test('danh sach: phan trang, chi cot co ban, trang thai hom nay chi cho ai co muc trang_thai', async () => {
  const may = await dungMayThu();
  try {
    const daydu = await dang(may, 'daydu');
    const motso = await dang(may, 'motso');
    const t1 = (await daydu.goi('GET', '/api/quan-nhan')).du;
    assert.strictEqual(t1.tong, 100);
    assert.strictEqual(t1.dong.length, 20);
    assert.strictEqual(t1.soTrang, 5);
    assert.strictEqual(t1.dong[0].ma_quan_nhan, 'GIA.001');
    assert.deepStrictEqual(Object.keys(t1.dong[0]).sort(), ['chuc_vu_id', 'don_vi_id', 'gioi_tinh', 'ho_ten_khai_sinh', 'id', 'ma_quan_nhan', 'quan_ham_id', 'version']);
    assert.strictEqual(t1.tenDanhMuc[t1.dong[0].don_vi_id].startsWith('Đại đội mẫu'), true);
    assert.ok(t1.trangThaiHomNay[t1.dong[0].id]);
    const t5 = (await daydu.goi('GET', '/api/quan-nhan?trang=5')).du;
    assert.strictEqual(t5.dong[19].ma_quan_nhan, 'GIA.100');
    assert.strictEqual((await daydu.goi('GET', '/api/quan-nhan?trang=6')).du.dong.length, 0);
    assert.strictEqual((await daydu.goi('GET', '/api/quan-nhan?soDong=7&trang=2')).du.dong.length, 7);
    assert.strictEqual((await daydu.goi('GET', '/api/quan-nhan?soDong=1000')).ma, 400);
    assert.strictEqual((await daydu.goi('GET', '/api/quan-nhan?trang=0')).ma, 400);
    const m = (await motso.goi('GET', '/api/quan-nhan')).du;
    assert.strictEqual(m.dong.length, 20);
    assert.ok(!('trangThaiHomNay' in m), 'khong co muc trang_thai thi khong co trang thai');
    assert.strictEqual((await new Khach(may.goc).goi('GET', '/api/quan-nhan')).ma, 401);
  } finally {
    await may.dong();
  }
});

test('xem ho so: che so dinh danh, tinh tuoi con, ten danh muc; chi hien so day du qua API rieng co ghi nhat ky', async () => {
  const may = await dungMayThu();
  try {
    const daydu = await dang(may, 'daydu');
    const motso = await dang(may, 'motso');
    // Tim mot nguoi co con
    const id = may.db.prepare("SELECT quan_nhan_id AS id FROM than_nhan WHERE quan_he = 'con' LIMIT 1").get().id;
    const ho = (await daydu.goi('GET', '/api/quan-nhan/' + id)).du;
    assert.match(ho.quan_nhan.so_can_cuoc, /^\*+\d{4}$/);
    assert.match(ho.quan_nhan.so_bhxh, /^\*+\d{4}$/);
    assert.ok(ho.than_nhan.filter((t) => t.so_can_cuoc).every((t) => /^\*+\d{4}$/.test(t.so_can_cuoc)));
    const thatSu = may.db.prepare('SELECT so_can_cuoc FROM quan_nhan WHERE id = ?').get(id).so_can_cuoc;
    assert.ok(!JSON.stringify(ho).includes(thatSu), 'so can cuoc day du khong duoc nam trong ho so');
    const con = ho.than_nhan.find((t) => t.quan_he === 'con');
    assert.deepStrictEqual({ tuoi: con.tuoi, soThang: con.soThang }, { tuoi: tinhTuoi(con.ngay_sinh_chuan, ngayDuongLich()).tuoi, soThang: tinhTuoi(con.ngay_sinh_chuan, ngayDuongLich()).soThang });
    assert.ok(con.tuoi >= 0 && con.tuoi <= 20);
    assert.ok(Object.keys(ho.tenDanhMuc).length > 3);
    assert.strictEqual(ho.tenDanhMuc[ho.quan_nhan.don_vi_id].startsWith('Đại đội'), true);

    // API hien so
    assert.strictEqual((await motso.goi('GET', '/api/quan-nhan/' + id + '/so-dinh-danh')).ma, 403, 'chua co muc so_dinh_danh');
    const that = (await daydu.goi('GET', '/api/quan-nhan/' + id + '/so-dinh-danh')).du;
    assert.strictEqual(that.quan_nhan.so_can_cuoc, thatSu);
    assert.ok(!('ho_ten_khai_sinh' in that.quan_nhan), 'chi co cot cua muc so_dinh_danh');
    assert.ok(that.than_nhan.length > 0 && that.than_nhan.every((t) => !('ho_ten' in t)));
    const nhatKy = may.db.prepare("SELECT * FROM nhat_ky WHERE hanh_dong = 'hien_so_dinh_danh'").all();
    assert.strictEqual(nhatKy.length, 1);
    assert.strictEqual(nhatKy[0].ten_dang_nhap, 'daydu');
    assert.strictEqual(String(nhatKy[0].doi_tuong_id), String(id));
    assert.ok(!JSON.stringify(nhatKy).includes(thatSu), 'nhat ky khong chua so day du');
    // Cap muc so_dinh_danh cho tai khoan han che thi duoc hien
    const quanTri = await dang(may, 'qtri');
    assert.strictEqual((await quanTri.goi('PUT', '/api/tai-khoan/nguoi-dung/' + may.id.motso + '/quyen', { muc: { so_dinh_danh: true }, xacNhan: ['muc:so_dinh_danh'] })).ma, 200);
    assert.strictEqual((await motso.goi('GET', '/api/quan-nhan/' + id + '/so-dinh-danh')).ma, 200);
    assert.strictEqual((await motso.goi('GET', '/api/quan-nhan/99999/so-dinh-danh')).ma, 404);
  } finally {
    await may.dong();
  }
});

test('them ho so: thanh cong, trung ma, du lieu sai bao tung truong, chi admin', async () => {
  const may = await dungMayThu();
  try {
    const admin = await dang(may, 'qtri');
    const daydu = await dang(may, 'daydu');
    const tao = await admin.goi('POST', '/api/quan-nhan', hoSoMoi(may, 'MOI.001'));
    assert.strictEqual(tao.ma, 201, JSON.stringify(tao.du));
    assert.strictEqual(tao.du.version, 1);
    const ho = (await admin.goi('GET', '/api/quan-nhan/' + tao.du.id)).du;
    assert.strictEqual(ho.quan_nhan.ma_quan_nhan, 'MOI.001');
    assert.strictEqual(ho.quan_nhan.ngay_vao_dang_thang, 2);
    assert.strictEqual(ho.quan_nhan.ngay_vao_dang_ngay, null);
    assert.strictEqual(ho.quan_nhan.la_dang_vien, 1);
    assert.strictEqual(ho.quan_nhan.he_so_luong, 5.4);
    assert.strictEqual(ho.than_nhan.length, 1);
    assert.strictEqual(ho.luong.length, 1);
    assert.strictEqual(may.db.prepare('SELECT tim_kiem FROM quan_nhan WHERE id = ?').get(tao.du.id).tim_kiem, 'nguyen van moi moi.001 0912345678');

    const trung = await admin.goi('POST', '/api/quan-nhan', hoSoMoi(may, 'MOI.001'));
    assert.strictEqual(trung.ma, 409);
    assert.strictEqual(trung.du.ma, 'TRUNG_MA');
    assert.strictEqual(may.db.prepare("SELECT COUNT(*) AS n FROM quan_nhan WHERE ma_quan_nhan = 'MOI.001'").get().n, 1);

    const sai = hoSoMoi(may, 'MOI.002', { ngay_sinh: '31/02/2000', don_vi: 99999, ho_ten_khai_sinh: '' });
    sai.than_nhan.push({ nhom: 'vo_chong', quan_he: 'vo', ho_ten: 'Sai nhom' }, { nhom: 'ban_than', quan_he: 'anh_chi_em', ho_ten: '' });
    const kq = await admin.goi('POST', '/api/quan-nhan', sai);
    assert.strictEqual(kq.ma, 400);
    assert.strictEqual(kq.du.ma, 'DU_LIEU_SAI');
    const chiTiet = kq.du.chiTiet.map((c) => c.bang + '.' + c.truong + (c.dong === null ? '' : '#' + c.dong));
    assert.deepStrictEqual(chiTiet.sort(), ['quan_nhan.don_vi', 'quan_nhan.ho_ten_khai_sinh', 'quan_nhan.ngay_sinh', 'than_nhan.ho_ten#2', 'than_nhan.quan_he#1']);
    assert.strictEqual(may.db.prepare("SELECT COUNT(*) AS n FROM quan_nhan WHERE ma_quan_nhan = 'MOI.002'").get().n, 0, 'loi thi khong ghi gi');
    assert.ok(!JSON.stringify(kq.du).includes('31/02/2000'), 'khong tra lai du lieu da gui');

    assert.strictEqual((await admin.goi('POST', '/api/quan-nhan', { quan_nhan: { ma_quan_nhan: 'X', khong_co_truong_nay: 1 } })).ma, 400);
    assert.strictEqual((await daydu.goi('POST', '/api/quan-nhan', hoSoMoi(may, 'MOI.003'))).ma, 403);
    assert.strictEqual((await new Khach(may.goc).goi('POST', '/api/quan-nhan', hoSoMoi(may, 'MOI.003'))).ma, 401);
  } finally {
    await may.dong();
  }
});

test('khoa lac quan: hai nguoi cung sua, nguoi luu sau nhan 409 va khong ghi de', async () => {
  const may = await dungMayThu();
  try {
    const admin = await dang(may, 'qtri');
    const id = (await admin.goi('POST', '/api/quan-nhan', hoSoMoi(may, 'MOI.010'))).du.id;
    // Hai "cua so" cung mo ho so o phien ban 1
    const cuaSoA = (await admin.goi('GET', '/api/quan-nhan/' + id)).du;
    const cuaSoB = (await admin.goi('GET', '/api/quan-nhan/' + id)).du;
    assert.strictEqual(cuaSoA.quan_nhan.version, 1);
    const bieuMau = (ho, them) => ({ ...dongSangBieuMau('quan_nhan', ho.quan_nhan), so_can_cuoc: '900000009999', so_bhxh: '', so_the_bhyt: '', ...them });

    const luuA = await admin.goi('PUT', '/api/quan-nhan/' + id, { version: 1, quan_nhan: bieuMau(cuaSoA, { ho_ten_khai_sinh: 'SUA BOI A' }) });
    assert.strictEqual(luuA.ma, 200, JSON.stringify(luuA.du));
    assert.strictEqual(luuA.du.version, 2);

    const luuB = await admin.goi('PUT', '/api/quan-nhan/' + id, { version: 1, quan_nhan: bieuMau(cuaSoB, { ho_ten_khai_sinh: 'SUA BOI B', so_dien_thoai: '0999999999' }) });
    assert.strictEqual(luuB.ma, 409);
    assert.strictEqual(luuB.du.ma, 'XUNG_DOT_PHIEN_BAN');
    assert.strictEqual(luuB.du.phienBanHienTai, 2);
    assert.match(luuB.du.loi, /đã được người khác sửa/);
    const hang = may.db.prepare('SELECT ho_ten_khai_sinh, so_dien_thoai, version FROM quan_nhan WHERE id = ?').get(id);
    assert.deepStrictEqual({ ...hang }, { ho_ten_khai_sinh: 'SUA BOI A', so_dien_thoai: '0912345678', version: 2 }, 'khong ghi de len ban cua A');

    // B tai lai roi sua tiep: duoc
    const taiLai = (await admin.goi('GET', '/api/quan-nhan/' + id)).du;
    assert.strictEqual(taiLai.quan_nhan.version, 2);
    const luuB2 = await admin.goi('PUT', '/api/quan-nhan/' + id, { version: 2, quan_nhan: bieuMau(taiLai, { so_dien_thoai: '0999999999' }) });
    assert.strictEqual(luuB2.ma, 200);
    assert.strictEqual(may.db.prepare('SELECT ho_ten_khai_sinh, so_dien_thoai FROM quan_nhan WHERE id = ?').get(id).ho_ten_khai_sinh, 'SUA BOI A');

    // Xoa mem cung khoa lac quan
    const xoaCu = await admin.goi('DELETE', '/api/quan-nhan/' + id + '?version=2');
    assert.strictEqual(xoaCu.ma, 409);
    assert.strictEqual((await admin.goi('DELETE', '/api/quan-nhan/' + id + '?version=3')).ma, 200);
    assert.strictEqual((await admin.goi('GET', '/api/quan-nhan/' + id)).ma, 404);
    assert.strictEqual((await admin.goi('PUT', '/api/quan-nhan/' + id, { version: 4, quan_nhan: bieuMau(taiLai, {}) })).ma, 404);
    assert.strictEqual((await admin.goi('DELETE', '/api/quan-nhan/' + id + '?version=4')).ma, 404);
    assert.strictEqual((await admin.goi('GET', '/api/quan-nhan')).du.tong, 100, 'ho so da xoa mem khong con trong danh sach');
    assert.strictEqual(may.db.prepare('SELECT da_xoa FROM quan_nhan WHERE id = ?').get(id).da_xoa, 1, 'chi xoa mem');
    assert.strictEqual((await admin.goi('DELETE', '/api/quan-nhan/' + id)).ma, 400, 'thieu version');
  } finally {
    await may.dong();
  }
});

test('sua ho so: bang con nao co mat thi duoc thay het, bang con khong co mat giu nguyen; nhat ky khong chua gia tri', async () => {
  const may = await dungMayThu();
  try {
    const admin = await dang(may, 'qtri');
    const id = (await admin.goi('POST', '/api/quan-nhan', hoSoMoi(may, 'MOI.020'))).du.id;
    const ho = (await admin.goi('GET', '/api/quan-nhan/' + id)).du;
    const form = { ...dongSangBieuMau('quan_nhan', ho.quan_nhan), so_can_cuoc: '900000008888', so_bhxh: '', so_the_bhyt: '', ho_ten_khai_sinh: 'TEN MOI' };
    const kq = await admin.goi('PUT', '/api/quan-nhan/' + id, {
      version: 1,
      quan_nhan: form,
      than_nhan: [
        { nhom: 'ban_than', quan_he: 'me', ho_ten: 'Nguyễn Thị Mẹ', ngay_sinh: '1972' === 'x' ? '' : '03/1972' },
        { nhom: 'vo_chong', quan_he: 'anh_chi_em', ho_ten: 'Em vợ', ngay_sinh: '01/01/2010' },
      ],
    });
    assert.strictEqual(kq.ma, 200, JSON.stringify(kq.du));
    const sau = (await admin.goi('GET', '/api/quan-nhan/' + id)).du;
    assert.deepStrictEqual(sau.than_nhan.map((t) => t.ho_ten), ['Nguyễn Thị Mẹ', 'Em vợ']);
    assert.strictEqual(sau.luong.length, 1, 'luong khong co mat trong yeu cau nen giu nguyen');
    assert.strictEqual(sau.than_nhan[1].tuoi, tinhTuoi('2010-01-01', ngayDuongLich()).tuoi);

    const dong = may.db.prepare("SELECT chi_tiet FROM nhat_ky WHERE hanh_dong = 'sua_ho_so'").get();
    const ct = JSON.parse(dong.chi_tiet);
    assert.deepStrictEqual(ct.truongDoi.sort(), ['ho_ten_khai_sinh', 'so_can_cuoc']);
    assert.deepStrictEqual(ct.cacBangThayThe, { than_nhan: { truoc: 1, sau: 2 } });
    const toanBoNhatKy = JSON.stringify(may.db.prepare('SELECT * FROM nhat_ky').all());
    for (const nhayCam of ['900000008888', '900000009999', '900000001111', 'TEN MOI']) {
      assert.ok(!toanBoNhatKy.includes(nhayCam), 'nhat ky lo gia tri: ' + nhayCam);
    }
    const hanhDong = may.db.prepare('SELECT hanh_dong FROM nhat_ky').all().map((d) => d.hanh_dong);
    for (const h of ['tao_ho_so', 'sua_ho_so', 'xem_ho_so']) {
      assert.ok(hanhDong.includes(h), 'thieu nhat ky ' + h);
    }
  } finally {
    await may.dong();
  }
});

test('luong rieng cua form: mo ho so cua 3 nguoi gia, bam luu lai KHONG doi gi (nhu giao dien se lam)', async () => {
  const may = await dungMayThu();
  try {
    const admin = await dang(may, 'qtri');
    const bangCon = [...new Set(TRUONG.map((t) => t.bang))].filter((b) => b !== 'quan_nhan');
    const anh = (id) => {
      const q = may.db.prepare('SELECT * FROM quan_nhan WHERE id = ?').get(id);
      delete q.version;
      delete q.updated_at;
      const con = {};
      for (const b of bangCon) {
        con[b] = may.db.prepare('SELECT * FROM ' + b + ' WHERE quan_nhan_id = ? ORDER BY id').all(id).map((d) => {
          const { id: _i, created_at: _c, updated_at: _u, ...phanConLai } = d;
          return phanConLai;
        });
      }
      return { q, con };
    };
    for (const id of [1, 37, 100]) {
      const truoc = anh(id);
      const ho = (await admin.goi('GET', '/api/quan-nhan/' + id)).du;
      const that = (await admin.goi('GET', '/api/quan-nhan/' + id + '/so-dinh-danh')).du;
      // Chi ghep cac truong cua muc so_dinh_danh tu API "hien so" (khong ghi de cac truong khac bang gia tri rong)
      const bieuMauThat = dongSangBieuMau('quan_nhan', that.quan_nhan);
      const bieuMau = dongSangBieuMau('quan_nhan', ho.quan_nhan);
      for (const t of TRUONG.filter((x) => x.bang === 'quan_nhan' && x.muc === 'so_dinh_danh')) {
        bieuMau[t.truong] = bieuMauThat[t.truong];
      }
      const payload = { version: ho.quan_nhan.version, quan_nhan: bieuMau };
      for (const bang of bangCon) {
        payload[bang] = ho[bang].map((d) => {
          const bm = dongSangBieuMau(bang, d);
          if (bang === 'than_nhan') {
            bm.so_can_cuoc = (that.than_nhan.find((t) => t.id === d.id) || {}).so_can_cuoc || '';
          }
          return bm;
        });
      }
      const kq = await admin.goi('PUT', '/api/quan-nhan/' + id, payload);
      assert.strictEqual(kq.ma, 200, 'id ' + id + ': ' + JSON.stringify(kq.du));
      assert.deepStrictEqual(anh(id), truoc, 'ho so ' + id + ' bi thay doi sau khi luu lai khong sua gi');
      const ct = JSON.parse(may.db.prepare("SELECT chi_tiet FROM nhat_ky WHERE hanh_dong = 'sua_ho_so' ORDER BY id DESC LIMIT 1").get().chi_tiet);
      assert.deepStrictEqual(ct.truongDoi, [], 'khong truong nao doi');
    }
  } finally {
    await may.dong();
  }
});

// ---- Ngay o tuong lai trong ho so ----
const dinhDangNgay = (d) => String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();

test('ho so: ngay o tuong lai bi tu choi o moi truong ngay (tru "den thang/nam" cua dao tao)', async () => {
  const may = await dungMayThu();
  try {
    const admin = await dang(may, 'qtri');
    const bay = new Date();
    const mai = new Date(bay.getFullYear(), bay.getMonth(), bay.getDate() + 1);
    const namSau = dinhDangNgay(new Date(bay.getFullYear() + 1, 0, 1));
    const thangSau = String(bay.getMonth() + 2 > 12 ? 1 : bay.getMonth() + 2).padStart(2, '0') + '/' + (bay.getMonth() + 2 > 12 ? bay.getFullYear() + 1 : bay.getFullYear());
    const thangNay = String(bay.getMonth() + 1).padStart(2, '0') + '/' + bay.getFullYear();

    const sai = hoSoMoi(may, 'TL.001', { ngay_sinh: namSau, ngay_cap_can_cuoc: dinhDangNgay(mai), ngay_vao_dang: thangSau, nam_tot_nghiep_pho_thong: bay.getFullYear() + 3 });
    sai.than_nhan[0].ngay_sinh = namSau;
    sai.luong[0].tu_thang_nam = thangSau;
    sai.khen_thuong = [{ thang_nam: namSau }];
    const kq = await admin.goi('POST', '/api/quan-nhan', sai);
    assert.strictEqual(kq.ma, 400);
    const chiTiet = kq.du.chiTiet.map((c) => c.bang + '.' + c.truong).sort();
    assert.deepStrictEqual(chiTiet, ['khen_thuong.thang_nam', 'luong.tu_thang_nam', 'quan_nhan.nam_tot_nghiep_pho_thong', 'quan_nhan.ngay_cap_can_cuoc', 'quan_nhan.ngay_sinh', 'quan_nhan.ngay_vao_dang', 'than_nhan.ngay_sinh']);
    assert.match(kq.du.chiTiet[0].thongBao, /chưa đến/);
    assert.strictEqual(may.db.prepare("SELECT COUNT(*) AS n FROM quan_nhan WHERE ma_quan_nhan = 'TL.001'").get().n, 0);

    // Thang hien tai (chi co thang/nam) va ngay hom nay van hop le; dao tao dang hoc duoc "den" sau nay
    const ok = hoSoMoi(may, 'TL.002', { ngay_vao_dang: thangNay, ngay_cap_can_cuoc: dinhDangNgay(bay), nam_tot_nghiep_pho_thong: bay.getFullYear() });
    ok.dao_tao = [{ ten_truong_co_so: 'Hoc vien X', tu_thang_nam: '09/2025', den_thang_nam: '09/' + (bay.getFullYear() + 2) }];
    const tao = await admin.goi('POST', '/api/quan-nhan', ok);
    assert.strictEqual(tao.ma, 201, JSON.stringify(tao.du));

    // Sua thanh ngay tuong lai cung bi chan
    const ho = (await admin.goi('GET', '/api/quan-nhan/' + tao.du.id)).du;
    const bm = { ...dongSangBieuMau('quan_nhan', ho.quan_nhan), so_can_cuoc: '900000009999', so_bhxh: '', so_the_bhyt: '' };
    const suaSai = await admin.goi('PUT', '/api/quan-nhan/' + tao.du.id, { version: 1, quan_nhan: { ...bm, ngay_sinh: namSau } });
    assert.strictEqual(suaSai.ma, 400);
    assert.strictEqual(suaSai.du.chiTiet[0].truong, 'ngay_sinh');
  } finally {
    await may.dong();
  }
});
