'use strict';
// tim-than-nhan-trung.js: liet ke cac quan nhan dang co than nhan GHI TRUNG (vd hai "me de", hai vo/chong hien tai, dong trung)
// de sua lai (du lieu nhap truoc khi co quy tac nay). Chi doc, khong sua gi.
// Chay: node server/scripts/tim-than-nhan-trung.js
const path = require('path');
const { docEnv, layCauHinh } = require('../loi/doc-env');
const { moCsdl } = require('../loi/csdl');
const { kiemTraTrungThanNhan } = require('../../shared/than-nhan.js');

// Tra ve [{ ma, hoTen, loi: [thongBao...] }] cho cac quan nhan (chua xoa) co than nhan trung.
function timViPham(db) {
  const ketQua = [];
  const nguoi = db.prepare('SELECT id, ma_quan_nhan, ho_ten_khai_sinh FROM quan_nhan WHERE da_xoa = 0 ORDER BY ma_quan_nhan').all();
  const lay = db.prepare('SELECT nhom, quan_he, tinh_chat, ho_ten, ngay_sinh_chuan FROM than_nhan WHERE quan_nhan_id = ? ORDER BY id');
  for (const n of nguoi) {
    const dong = lay.all(n.id);
    const loi = kiemTraTrungThanNhan(dong, (i) => '"' + dong[i].ho_ten + '"');
    if (loi.length > 0) {
      ketQua.push({ ma: n.ma_quan_nhan, hoTen: n.ho_ten_khai_sinh, loi: loi.map((l) => l.thongBao) });
    }
  }
  return ketQua;
}

function main() {
  const goc = path.resolve(__dirname, '..', '..');
  docEnv(path.join(goc, '.env'));
  const cauHinh = layCauHinh(goc);
  const db = moCsdl(cauHinh.duongDanDb);
  try {
    const ds = timViPham(db);
    if (ds.length === 0) {
      console.log('Khong co quan nhan nao co than nhan ghi trung.');
      return;
    }
    console.log('Co ' + ds.length + ' quan nhan co than nhan ghi trung (mo ho so > Sua de chinh lai):');
    for (const n of ds) {
      console.log('  ' + n.ma + ' ' + n.hoTen);
      for (const l of n.loi) {
        console.log('     - ' + l);
      }
    }
  } finally {
    db.close();
  }
}

if (require.main === module) {
  try {
    main();
  } catch (loi) {
    console.error('[LOI] ' + loi.message);
    process.exit(1);
  }
}

module.exports = { timViPham };
