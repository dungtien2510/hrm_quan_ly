// thu-sqlite.js: tao file .db, them 1 dong, doc ra (du lieu gia)
const path = require("path");
const Database = require("better-sqlite3");

const duongDan = path.join(__dirname, "thu.db");
const db = new Database(duongDan);

db.exec("DROP TABLE IF EXISTS quan_nhan_thu");
db.exec(`
  CREATE TABLE quan_nhan_thu (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ma_quan_nhan TEXT NOT NULL UNIQUE,
    ho_ten TEXT NOT NULL
  )
`);

const them = db.prepare(
  "INSERT INTO quan_nhan_thu (ma_quan_nhan, ho_ten) VALUES (?, ?)",
);
them.run("00.000.00", "NGUYỄN VĂN A (dữ liệu giả)");

const cacDong = db
  .prepare("SELECT id, ma_quan_nhan, ho_ten FROM quan_nhan_thu")
  .all();
console.log("Số dòng đọc được:", cacDong.length);
console.log(cacDong);
console.log(
  "Phiên bản SQLite:",
  db.prepare("SELECT sqlite_version() AS v").get().v,
);

db.close();
console.log("Xong. File dữ liệu:", duongDan);
