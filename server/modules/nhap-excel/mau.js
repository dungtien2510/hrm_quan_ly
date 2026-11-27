'use strict';
// mau.js: tao file Excel MAU tu bang truong (exceljs): 9 sheet nhap lieu + sheet Huong_dan + sheet Danh_muc.
// O "chon tu danh muc" co danh sach tha xuong; ngay dat dinh dang Text de Excel khong tu doi.
const ExcelJS = require('exceljs');
const { GIA_TRI_LUA_CHON } = require('../../../shared/truong-muc.js');
const { CAC_SHEET, cotCuaSheet } = require('./cau-hinh-sheet');
const { LOAI_DANH_MUC } = require('../danh-muc/routes');

const SO_DONG_NHAP = 1000;
const KIEU_CHU = {
  chu: 'Chữ',
  so: 'Số (dấu phẩy hoặc dấu chấm thập phân)',
  ngay_du: 'Ngày đầy đủ dd/mm/yyyy',
  ngay_thieu: 'Ngày dd/mm/yyyy, hoặc chỉ mm/yyyy nếu không biết ngày',
  lua_chon: 'Chọn từ danh sách',
  co_khong: 'Có hoặc Không (để trống = Không)',
};
const VI_DU = {
  ma_quan_nhan: '20.364.26',
  ho_ten_khai_sinh: 'NGUYỄN VĂN A',
  ngay_sinh: '20/10/2000',
  gioi_tinh: 'Nam',
  so_can_cuoc: '012345678901',
  ngay_tuyen_dung_lan_dau: '05/09/2016',
  ngay_vao_dang: '02/2019',
  la_dang_vien: 'Có',
  nhom: 'ban_than',
  quan_he: 'cha',
  loai: 'ky_luat',
  trang_thai: 'Nghỉ phép',
  tu_ngay: '10/11/2026',
};

function chuaSo(hang, cot) {
  return hang.getCell(cot);
}

async function taoMau(db) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Phan mem quan ly quan nhan';
  wb.created = new Date();

  // ---- Sheet Danh_muc: danh sach ten de tha xuong ----
  const dm = wb.addWorksheet('Danh_muc');
  const vungDm = {};
  const loaiDung = [...new Set(CAC_SHEET.flatMap((s) => cotCuaSheet(s)).filter((t) => t.danhMuc).map((t) => t.danhMuc))];
  loaiDung.forEach((loai, i) => {
    const ten = (LOAI_DANH_MUC.find((l) => l.loai === loai) || { nhan: loai }).nhan;
    const ds = db.prepare('SELECT ten FROM danh_muc WHERE loai = ? AND dang_dung = 1 ORDER BY thu_tu, id').all(loai).map((d) => d.ten);
    const cot = i + 1;
    chuaSo(dm.getRow(1), cot).value = ten;
    chuaSo(dm.getRow(1), cot).font = { bold: true };
    ds.forEach((t, j) => {
      chuaSo(dm.getRow(j + 2), cot).value = t;
    });
    dm.getColumn(cot).width = 30;
    vungDm[loai] = ds.length > 0 ? 'Danh_muc!$' + dm.getColumn(cot).letter + '$2:$' + dm.getColumn(cot).letter + '$' + (ds.length + 1) : null;
  });
  dm.getRow(1).commit();

  // ---- Cac sheet nhap lieu ----
  for (const sh of CAC_SHEET) {
    const ws = wb.addWorksheet(sh.ten);
    const cacCot = cotCuaSheet(sh);
    cacCot.forEach((t, i) => {
      const cot = i + 1;
      const col = ws.getColumn(cot);
      col.width = Math.max(16, Math.min(34, t.truong.length + 4));
      col.numFmt = '@'; // Text: Excel khong tu doi ngay, khong mat so 0 dau
      const o = ws.getCell(1, cot);
      o.value = t.truong;
      o.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      o.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: t.batBuoc && t.kieu !== 'co_khong' ? 'FFC00000' : 'FF1F3864' } };
      o.alignment = { wrapText: true, vertical: 'middle' };
      o.note = t.hienThi + '\n' + (KIEU_CHU[t.kieu] || '') + (t.batBuoc && t.kieu !== 'co_khong' ? '\nBẮT BUỘC' : '');
      // danh sach tha xuong
      let congThuc = null;
      if (t.kieu === 'co_khong') {
        congThuc = '"Có,Không"';
      } else if (t.kieu === 'lua_chon' && t.danhMuc) {
        congThuc = vungDm[t.danhMuc];
      } else if (t.kieu === 'lua_chon') {
        congThuc = '"' + GIA_TRI_LUA_CHON[t.bang + '.' + t.truong].map((g) => (['nhom', 'quan_he', 'loai', 'tinh_chat'].includes(t.truong) ? g.ma : g.nhan)).join(',') + '"';
      }
      if (congThuc) {
        ws.dataValidations.add(ws.getColumn(cot).letter + '2:' + ws.getColumn(cot).letter + (SO_DONG_NHAP + 1), {
          type: 'list',
          allowBlank: true,
          formulae: [congThuc],
          showErrorMessage: true,
          errorStyle: t.danhMuc ? 'warning' : 'stop', // ten danh muc moi van go duoc (se duoc hoi them vao danh muc khi nhap)
          errorTitle: 'Giá trị ngoài danh sách',
          error: t.danhMuc ? 'Tên này chưa có trong danh mục. Vẫn nhập được: khi nhập file, phần mềm sẽ hỏi có thêm vào danh mục không.' : 'Hãy chọn một giá trị trong danh sách.',
        });
      }
    });
    ws.getRow(1).height = 32;
    ws.views = [{ state: 'frozen', xSplit: sh.chinh ? 2 : 1, ySplit: 1 }];
  }

  // ---- Huong_dan ----
  const hd = wb.addWorksheet('Huong_dan', { properties: { tabColor: { argb: 'FFFFC000' } } });
  wb.worksheets.unshift(wb.worksheets.pop()); // dua Huong_dan len dau
  const dong = [
    ['HƯỚNG DẪN NHẬP DỮ LIỆU QUÂN NHÂN BẰNG EXCEL'],
    [''],
    ['1. Mỗi quân nhân là MỘT dòng ở sheet quan_nhan. Các sheet còn lại (qua_trinh_cong_tac, than_nhan...) mỗi dòng là một mục của một quân nhân, gắn với quân nhân bằng cột ma_quan_nhan (phải giống mã ở sheet quan_nhan).'],
    ['2. Dòng 1 của mỗi sheet là tên cột: KHÔNG sửa, không xóa, không đổi thứ tự được thì đổi (phần mềm đọc theo tên cột). Cột nền đỏ là bắt buộc. Rê chuột vào tên cột để xem giải thích.'],
    ['3. Ngày: dd/mm/yyyy (vd 05/09/2016). Chỉ biết tháng/năm thì nhập mm/yyyy (vd 09/2016). KHÔNG nhập ngày ở tương lai (trừ "den_thang_nam" của sheet dao_tao).'],
    ['4. Ô chọn từ danh mục (đơn vị, quân hàm, chức vụ...): chọn trong danh sách hoặc gõ đúng tên. Tên chưa có trong danh mục (trừ trạng thái) sẽ được liệt kê và hỏi bạn có thêm vào danh mục không. Hai đơn vị trùng tên thì ghi mã (ma) thay cho tên.'],
    ['5. Trạng thái (sheet trang_thai): loại trạng thái phải có sẵn trong danh mục. Bệnh viện, bệnh xá... chỉ ghi việc đã/đang xảy ra: không nhập ngày tương lai; chưa kết thúc thì để trống den_ngay. Nghỉ phép, công tác có thể đăng ký trước.'],
    ['6. Nhập lại một quân nhân đã có (cùng ma_quan_nhan) ở chế độ "Thêm hoặc cập nhật": thông tin ở sheet quan_nhan được ghi đè; với mỗi sheet con, nếu file có dòng của người đó thì toàn bộ dòng cũ của họ ở bảng đó được thay bằng các dòng trong file, nếu file không có dòng nào thì giữ nguyên.'],
    ['7. Chế độ "Thay thế": xóa TOÀN BỘ hồ sơ hiện có rồi nhập file (có sao lưu trước và bắt gõ chữ xác nhận).'],
    ['8. Phần mềm kiểm tra cả file trước và báo lỗi theo tên sheet, số dòng, tên cột; chưa ghi gì cho đến khi bạn bấm "Áp dụng". Có lỗi thì sửa file và kiểm tra lại.'],
    ['9. Thân nhân (sheet than_nhan): mỗi nhóm (B.I ban_than / B.II vo_chong) mỗi người chỉ có MỘT cha đẻ và MỘT mẹ đẻ; có thêm cha/mẹ nuôi hoặc kế thì ghi cột tinh_chat = nuoi hoặc ke. Chỉ có một vợ/chồng hiện tại; vợ/chồng cũ ghi tinh_chat = da_ly_hon. Con nuôi ghi tinh_chat = nuoi. Để trống tinh_chat = đẻ (cha, mẹ, con) hoặc hiện tại (vợ, chồng).'],
    ['10. Chỉ dùng dữ liệu giả khi thử. Không gửi file dữ liệu thật qua email hay chat.'],
    [''],
    ['CÁC CỘT CỦA TỪNG SHEET'],
  ];
  dong.forEach((d) => hd.addRow(d));
  hd.getRow(1).font = { bold: true, size: 14 };
  hd.getRow(dong.length).font = { bold: true, size: 12 };
  hd.getColumn(1).width = 34;
  for (const c of [2, 3, 4, 5]) {
    hd.getColumn(c).width = c === 3 ? 44 : 28;
  }
  for (const sh of CAC_SHEET) {
    hd.addRow([]);
    const r = hd.addRow(['Sheet: ' + sh.ten + (sh.chinh ? ' (mỗi quân nhân một dòng)' : ' (gắn bằng ma_quan_nhan)')]);
    r.font = { bold: true };
    const tieuDe = hd.addRow(['Tên cột', 'Ý nghĩa', 'Kiểu', 'Bắt buộc', 'Ví dụ']);
    tieuDe.font = { bold: true };
    for (const t of cotCuaSheet(sh)) {
      hd.addRow([t.truong, t.hienThi, KIEU_CHU[t.kieu], t.batBuoc && t.kieu !== 'co_khong' ? 'Có' : '', VI_DU[t.truong] || '']);
    }
  }
  for (let i = 3; i <= 12; i += 1) {
    hd.getRow(i).alignment = { wrapText: true, vertical: 'top' };
    hd.mergeCells(i, 1, i, 5);
    hd.getRow(i).height = 48;
  }
  wb.views = [{ activeTab: 0 }];
  return wb.xlsx.writeBuffer();
}

module.exports = { taoMau };
