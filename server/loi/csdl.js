'use strict';
// csdl.js: mo file SQLite (better-sqlite3) va chay "migration" (cac file SQL danh so).
// Migration = cac file SQL danh so 001-..., 002-... de tao/nang cap bang theo tung phien ban.
// Bang phien_ban_csdl ghi cac file da chay nen chay lai nhieu lan khong hong, khong nhan doi.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const THU_MUC_MIGRATION_LOI = path.join(__dirname, 'migrations');
const MAU_TEN_FILE = /^(\d{3})-.+\.sql$/;

function moCsdl(duongDanDb) {
  if (duongDanDb !== ':memory:') {
    fs.mkdirSync(path.dirname(duongDanDb), { recursive: true });
  }
  const db = new Database(duongDanDb);
  db.pragma('journal_mode = WAL'); // nhieu nguoi doc cung luc khi co nguoi ghi
  db.pragma('foreign_keys = ON'); // bat khoa ngoai (SQLite mac dinh TAT)
  db.pragma('synchronous = FULL'); // an toan khi mat dien dot ngot
  db.pragma('busy_timeout = 5000');
  return db;
}

function bamNoiDung(sql) {
  // Doi CRLF -> LF de checksum khong doi khi Git tren Windows doi kieu xuong dong.
  const chuan = sql.replace(/^\ufeff/, '').replace(/\r\n/g, '\n');
  return crypto.createHash('sha256').update(chuan, 'utf8').digest('hex');
}

// Danh sach cac nguon migration: loi truoc, roi cac mo-dun co thu muc migrations.
function nguonMigration(dsMoDun) {
  const nguon = [{ ten: 'loi', thuMuc: THU_MUC_MIGRATION_LOI }];
  for (const mod of dsMoDun) {
    if (mod.migrations) {
      nguon.push({ ten: mod.ten, thuMuc: mod.migrations });
    }
  }
  return nguon;
}

// Chay cac migration chua chay. Tra ve { daChay: [...ten file], daCo: so file da chay truoc do }.
// Moi file chay trong MOT giao dich (transaction): loi giua chung thi file do khong de lai gi.
function chayMigrations(db, dsNguon) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS phien_ban_csdl (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nguon TEXT NOT NULL,
      ten_file TEXT NOT NULL,
      checksum TEXT NOT NULL,
      chay_luc TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      UNIQUE (nguon, ten_file)
    )
  `);
  const tim = db.prepare('SELECT checksum FROM phien_ban_csdl WHERE nguon = ? AND ten_file = ?');
  const ghi = db.prepare('INSERT INTO phien_ban_csdl (nguon, ten_file, checksum) VALUES (?, ?, ?)');
  const daChay = [];
  let daCo = 0;

  for (const nguon of dsNguon) {
    if (!fs.existsSync(nguon.thuMuc)) {
      continue;
    }
    const cacFile = fs.readdirSync(nguon.thuMuc).filter((ten) => MAU_TEN_FILE.test(ten)).sort();
    const cacSo = new Set();
    for (const tenFile of cacFile) {
      const so = MAU_TEN_FILE.exec(tenFile)[1];
      if (cacSo.has(so)) {
        throw new Error('Migration cua "' + nguon.ten + '" co hai file cung so ' + so);
      }
      cacSo.add(so);
    }
    for (const tenFile of cacFile) {
      const sql = fs.readFileSync(path.join(nguon.thuMuc, tenFile), 'utf8');
      const checksum = bamNoiDung(sql);
      const bangGhi = tim.get(nguon.ten, tenFile);
      if (bangGhi) {
        if (bangGhi.checksum !== checksum) {
          throw new Error(
            'Migration ' + nguon.ten + '/' + tenFile + ' da chay roi nhung noi dung bi sua. ' +
              'Khong sua migration cu; hay them file migration moi.'
          );
        }
        daCo += 1;
        continue;
      }
      try {
        db.transaction(() => {
          db.exec(sql);
          ghi.run(nguon.ten, tenFile, checksum);
        })();
      } catch (loi) {
        throw new Error('Migration ' + nguon.ten + '/' + tenFile + ' bi loi: ' + loi.message);
      }
      daChay.push(nguon.ten + '/' + tenFile);
    }
  }
  return { daChay, daCo };
}

module.exports = { moCsdl, chayMigrations, nguonMigration, THU_MUC_MIGRATION_LOI };
