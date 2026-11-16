'use strict';
// ghi-sql.js: them / sua / xoa dong du lieu theo bang khai bao truong-muc.
// Ten bang va ten cot khong the dung dau "?", nen chi cho phep ten NAM TRONG bang khai bao; gia tri luon qua "?".
const { TRUONG, COT_KY_THUAT } = require('../../../shared/truong-muc.js');

const COT_HOP_LE = {};
for (const t of TRUONG) {
  if (!COT_HOP_LE[t.bang]) {
    COT_HOP_LE[t.bang] = new Set();
  }
  for (const c of t.cot) {
    COT_HOP_LE[t.bang].add(c);
  }
}

function kiemTra(bang, cot) {
  if (!COT_HOP_LE[bang]) {
    throw new Error('Bang khong hop le: ' + bang);
  }
  for (const c of cot) {
    if (!COT_HOP_LE[bang].has(c) && !COT_KY_THUAT.includes(c)) {
      throw new Error('Cot khong hop le: ' + bang + '.' + c);
    }
  }
}

function chenDong(db, bang, dong) {
  const cot = Object.keys(dong);
  kiemTra(bang, cot);
  const sql = 'INSERT INTO ' + bang + ' (' + cot.join(', ') + ') VALUES (' + cot.map(() => '?').join(', ') + ')';
  return Number(db.prepare(sql).run(...cot.map((c) => dong[c])).lastInsertRowid);
}

// UPDATE ... WHERE id = ? AND version = ? (chi cho quan_nhan). Tra ve so dong bi doi (0 = sai phien ban).
function capNhatQuanNhanTheoPhienBan(db, id, phienBan, dong) {
  const cot = Object.keys(dong);
  kiemTra('quan_nhan', cot);
  const sql =
    'UPDATE quan_nhan SET ' + cot.map((c) => c + ' = ?').join(', ') +
    ", version = version + 1, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ? AND version = ? AND da_xoa = 0";
  return db.prepare(sql).run(...cot.map((c) => dong[c]), id, phienBan).changes;
}

module.exports = { chenDong, capNhatQuanNhanTheoPhienBan, COT_HOP_LE };
