"use strict";
// Kiem thu script tao du lieu gia. Chay: npm test
const test = require("node:test");
const assert = require("node:assert");
const path = require("path");
const { moCsdl, chayMigrations, nguonMigration } = require("../loi/csdl");
const { napMoDun } = require("../loi/nap-mo-dun");
const {
  taoDuLieuGia,
  xoaDuLieuGia,
  thongKe,
} = require("../scripts/tao-du-lieu-gia.js");
const { boDau } = require("../../shared/ngay-chuoi.js");

const HOM_NAY = new Date(2026, 10, 11); // 11/11/2026
const NGAY_ISO = "2026-11-11";

function taoDb() {
  const db = moCsdl(":memory:");
  const { dsMoDun } = napMoDun(path.join(__dirname, "..", "modules"));
  chayMigrations(db, nguonMigration(dsMoDun));
  return db;
}
const dem = (db, sql, ...tham) => db.prepare(sql).get(...tham).n;

test("tao 100 ho so gia day du cac truong hop can thu", () => {
  const db = taoDb();
  const kq = taoDuLieuGia(db, { homNay: HOM_NAY });
  assert.strictEqual(kq.taoMoi, 100);
  const tk = thongKe(db, HOM_NAY);
  assert.strictEqual(tk.quanNhan, 100);
  assert.ok(
    tk.dangVien >= 20 && tk.dangVien < 100,
    "dang vien: " + tk.dangVien,
  );
  assert.ok(tk.conDuoi6Tuoi >= 10, "con duoi 6 tuoi: " + tk.conDuoi6Tuoi);
  assert.strictEqual(tk.kyLuatCon, 6);
  assert.strictEqual(tk.kyLuatHet, 6);
  assert.ok(tk.ngayChiCoThang > 0, "phai co ngay chi co thang/nam");
  assert.ok(
    dem(
      db,
      "SELECT COUNT(*) AS n FROM quan_nhan WHERE ngay_tuyen_dung_lan_dau_ngay IS NULL",
    ) > 10,
  );
  assert.strictEqual(
    dem(
      db,
      "SELECT COUNT(*) AS n FROM ky_luat_tien_an_tien_su WHERE loai = 'tien_su'",
    ),
    2,
  );
});

test("trang thai hom nay co du cac loai va cho tung loai dung so nguoi", () => {
  const db = taoDb();
  taoDuLieuGia(db, { homNay: HOM_NAY });
  const dongTT = Object.fromEntries(
    thongKe(db, HOM_NAY).trangThaiHomNay.map((d) => [d.ten, d.n]),
  );
  assert.deepStrictEqual(dongTT, {
    "Nghỉ phép": 7,
    "Công tác": 3,
    "Bệnh viện": 2,
    "Bệnh xá": 2,
    Khác: 1,
  });
});

test("khong co hai khoang trang thai cua mot nguoi chong nhau", () => {
  const db = taoDb();
  taoDuLieuGia(db, { homNay: HOM_NAY });
  const chong = dem(
    db,
    `SELECT COUNT(*) AS n FROM trang_thai_quan_nhan a JOIN trang_thai_quan_nhan b
       ON a.quan_nhan_id = b.quan_nhan_id AND a.id < b.id
      WHERE a.tu_ngay <= COALESCE(b.den_ngay, '9999-12-31') AND b.tu_ngay <= COALESCE(a.den_ngay, '9999-12-31')`,
  );
  assert.strictEqual(chong, 0);
});

test("cot tim_kiem la ten + ma + so dien thoai bo dau", () => {
  const db = taoDb();
  taoDuLieuGia(db, { homNay: HOM_NAY });
  const dong = db
    .prepare(
      "SELECT ho_ten_khai_sinh, tim_kiem FROM quan_nhan WHERE ma_quan_nhan = 'GIA.001'",
    )
    .get();
  assert.ok(dong.tim_kiem.startsWith(boDau(dong.ho_ten_khai_sinh)));
  assert.ok(dong.tim_kiem.includes("gia.001"));
  assert.strictEqual(dong.tim_kiem, dong.tim_kiem.toLowerCase());
  assert.ok(!/[^\x00-\x7f]/.test(dong.tim_kiem), "tim_kiem con ky tu co dau");
});

test("chay hai lan khong nhan doi; --lam-lai tao lai dung 100; xoa sach", () => {
  const db = taoDb();
  taoDuLieuGia(db, { homNay: HOM_NAY });
  const thanNhanLan1 = dem(db, "SELECT COUNT(*) AS n FROM than_nhan");
  const lanHai = taoDuLieuGia(db, { homNay: HOM_NAY });
  assert.deepStrictEqual(lanHai, { daCo: 100, taoMoi: 0 });
  assert.strictEqual(dem(db, "SELECT COUNT(*) AS n FROM quan_nhan"), 100);
  assert.strictEqual(
    dem(db, "SELECT COUNT(*) AS n FROM than_nhan"),
    thanNhanLan1,
  );

  const lamLai = taoDuLieuGia(db, { homNay: HOM_NAY, lamLai: true });
  assert.strictEqual(lamLai.taoMoi, 100);
  assert.strictEqual(dem(db, "SELECT COUNT(*) AS n FROM quan_nhan"), 100);
  assert.strictEqual(
    dem(db, "SELECT COUNT(*) AS n FROM than_nhan"),
    thanNhanLan1,
    "cung hat giong thi cung du lieu",
  );
  assert.strictEqual(
    dem(db, "SELECT COUNT(*) AS n FROM danh_muc WHERE loai = 'don_vi'"),
    15,
  );

  assert.strictEqual(xoaDuLieuGia(db), 100);
  assert.strictEqual(dem(db, "SELECT COUNT(*) AS n FROM quan_nhan"), 0);
  assert.strictEqual(dem(db, "SELECT COUNT(*) AS n FROM than_nhan"), 0);
  assert.strictEqual(
    dem(db, "SELECT COUNT(*) AS n FROM danh_muc WHERE loai = 'don_vi'"),
    0,
  );
  assert.strictEqual(
    dem(db, "SELECT COUNT(*) AS n FROM danh_muc WHERE loai = 'trang_thai'"),
    6,
    "danh muc mac dinh con nguyen",
  );
});

test("khong tao du lieu gia khi co ho so that, va khong dong vao ho so that khi xoa", () => {
  const db = taoDb();
  taoDuLieuGia(db, { homNay: HOM_NAY });
  const donVi = db
    .prepare("SELECT id FROM danh_muc WHERE ma = 'gia_c1'")
    .get().id;
  const ham = db
    .prepare("SELECT id FROM danh_muc WHERE ma = 'dai_uy'")
    .get().id;
  db.prepare(
    `INSERT INTO quan_nhan (ma_quan_nhan, ho_ten_khai_sinh, ngay_sinh, gioi_tinh, que_quan, don_vi_id, quan_ham_id,
       ngay_tuyen_dung_lan_dau_nam, ngay_tuyen_dung_lan_dau_thang) VALUES ('THAT.001', 'A', '2000-01-01', 'nam', 'x', ?, ?, 2016, 9)`,
  ).run(donVi, ham);
  assert.throws(
    () => taoDuLieuGia(db, { homNay: HOM_NAY, lamLai: true }),
    /ho so THAT/,
  );
  assert.strictEqual(
    dem(
      db,
      "SELECT COUNT(*) AS n FROM quan_nhan WHERE ma_quan_nhan = 'THAT.001'",
    ),
    1,
  );
});

test("ghi vao nhat_ky khi tao du lieu gia", () => {
  const db = taoDb();
  taoDuLieuGia(db, { homNay: HOM_NAY });
  const dong = db
    .prepare("SELECT chi_tiet FROM nhat_ky WHERE hanh_dong = 'tao_du_lieu_gia'")
    .get();
  assert.strictEqual(JSON.parse(dong.chi_tiet).quanNhan, 100);
  assert.ok(NGAY_ISO);
});
