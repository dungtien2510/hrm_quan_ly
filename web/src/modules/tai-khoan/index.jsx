import QuanLyTaiKhoan from './QuanLyTaiKhoan.jsx';

// Mo-dun giao dien "tai-khoan": man hinh quan ly tai khoan va phan quyen (chi admin).
export default {
  ten: 'tai-khoan',
  menu: [{ id: 'tai-khoan', nhan: 'Tài khoản và quyền', duongDan: '/tai-khoan', thuTu: 900, chiAdmin: true }],
  routes: [{ duongDan: '/tai-khoan', phanTu: <QuanLyTaiKhoan /> }],
};
