'use strict';
// tao-admin.js: tao tai khoan admin (chi duoc co DUNG MOT). Mat khau nhap tren ban phim, khong hien ra man hinh.
// Chay: node server/scripts/tao-admin.js
//       node server/scripts/tao-admin.js --ten quantri --ho-ten "Nguyen Van A"
const readline = require('readline');
const path = require('path');
const { docEnv, layCauHinh } = require('../loi/doc-env');
const { napMoDun } = require('../loi/nap-mo-dun');
const { moCsdl, chayMigrations, nguonMigration } = require('../loi/csdl');
const { taoSoDangKy } = require('../loi/quyen');
const { ghiNhatKy } = require('../loi/nhat-ky');
const { taoTaiKhoan } = require('../modules/tai-khoan/dich-vu');

// Doc tung dong nhap vao; che ky tu khi go mat khau (hien dau *).
function taoBoHoi() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: Boolean(process.stdin.isTTY) });
  let dangGiau = false;
  const ghiGoc = rl._writeToOutput ? rl._writeToOutput.bind(rl) : null;
  if (ghiGoc) {
    rl._writeToOutput = (chuoi) => {
      if (dangGiau && chuoi !== '\r\n' && chuoi !== '\n') {
        rl.output.write('*');
      } else {
        ghiGoc(chuoi);
      }
    };
  }
  const cacDong = rl[Symbol.asyncIterator]();
  async function hoi(cauHoi, giauChu) {
    process.stdout.write(cauHoi);
    dangGiau = Boolean(giauChu);
    const kq = await cacDong.next();
    dangGiau = false;
    if (!process.stdin.isTTY) {
      process.stdout.write('\n');
    }
    return kq.done ? '' : kq.value;
  }
  return { hoi, dong: () => rl.close() };
}

function layThamSo(doiSo, ten, macDinh) {
  const vt = doiSo.indexOf(ten);
  return vt >= 0 && doiSo[vt + 1] ? doiSo[vt + 1] : macDinh;
}

async function main() {
  const doiSo = process.argv.slice(2);
  const goc = path.resolve(__dirname, '..', '..');
  docEnv(path.join(goc, '.env'));
  const cauHinh = layCauHinh(goc);
  const { dsMoDun } = napMoDun(path.join(goc, 'server', 'modules'));
  const db = moCsdl(cauHinh.duongDanDb);
  try {
    chayMigrations(db, nguonMigration(dsMoDun));
    if (db.prepare("SELECT COUNT(*) AS n FROM nguoi_dung WHERE loai = 'admin'").get().n > 0) {
      console.log('Da co tai khoan admin. Chi duoc co mot admin; khong tao them.');
      return;
    }
    const tenDangNhap = layThamSo(doiSo, '--ten', 'admin');
    const hoTen = layThamSo(doiSo, '--ho-ten', 'Quản trị hệ thống');
    console.log('Tao tai khoan admin "' + tenDangNhap + '".');
    console.log('Mat khau: it nhat 10 ky tu, co chu va so. Khong hien ra man hinh khi go.');
    const boHoi = taoBoHoi();
    const mk1 = await boHoi.hoi('Mat khau: ', true);
    const mk2 = await boHoi.hoi('Nhap lai mat khau: ', true);
    boHoi.dong();
    if (mk1 !== mk2) {
      console.error('[LOI] Hai lan nhap khong giong nhau.');
      process.exitCode = 1;
      return;
    }
    const soDangKy = taoSoDangKy(dsMoDun);
    const id = await taoTaiKhoan(db, soDangKy, { tenDangNhap, hoTen, loai: 'admin', matKhau: mk1, phaiDoiMatKhau: false }, cauHinh.bcryptCost);
    ghiNhatKy(db, { taiKhoanId: id, tenDangNhap, hanhDong: 'tao_admin', doiTuong: 'tai_khoan', doiTuongId: id, chiTiet: { cach: 'script tao-admin' } });
    console.log('Da tao admin "' + tenDangNhap + '". Dang nhap tren MAY CHU tai http://localhost:' + cauHinh.cong);
  } finally {
    db.close();
  }
}

main().catch((loi) => {
  console.error('[LOI] ' + loi.message);
  process.exit(1);
});
