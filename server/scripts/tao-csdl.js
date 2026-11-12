'use strict';
// tao-csdl.js: tao file du lieu va cac bang (chay tat ca migration chua chay).
// Chay: node server/scripts/tao-csdl.js     (chay lai nhieu lan van an toan)
const path = require('path');
const { docEnv, layCauHinh } = require('../loi/doc-env');
const { napMoDun } = require('../loi/nap-mo-dun');
const { moCsdl, chayMigrations, nguonMigration } = require('../loi/csdl');

function main() {
  const goc = path.resolve(__dirname, '..', '..');
  docEnv(path.join(goc, '.env'));
  const cauHinh = layCauHinh(goc);
  const { dsMoDun } = napMoDun(path.join(goc, 'server', 'modules'));

  console.log('File du lieu: ' + cauHinh.duongDanDb);
  const db = moCsdl(cauHinh.duongDanDb);
  try {
    const kq = chayMigrations(db, nguonMigration(dsMoDun));
    if (kq.daChay.length === 0) {
      console.log('Khong co migration moi (da chay san ' + kq.daCo + ' file). Khong thay doi gi.');
    } else {
      console.log('Da chay ' + kq.daChay.length + ' migration moi:');
      for (const ten of kq.daChay) {
        console.log('  + ' + ten);
      }
    }
    const bang = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
      .all()
      .map((dong) => dong.name);
    console.log('Cac bang (' + bang.length + '): ' + bang.join(', '));
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
