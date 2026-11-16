import QuanLyDanhMuc from './QuanLyDanhMuc.jsx';

// Mo-dun giao dien "danh-muc": man hinh quan ly danh muc (chi admin).
export default {
  ten: 'danh-muc',
  menu: [{ id: 'danh-muc', nhan: 'Danh mục', duongDan: '/danh-muc', thuTu: 800, chiAdmin: true }],
  routes: [{ duongDan: '/danh-muc', phanTu: <QuanLyDanhMuc /> }],
};
