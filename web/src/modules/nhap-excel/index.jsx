import NhapExcel from './NhapExcel.jsx';

// Mo-dun giao dien "nhap-excel": nhap ho so tu file Excel (chi admin).
export default {
  ten: 'nhap-excel',
  menu: [{ id: 'nhap-excel', nhan: 'Nhập từ Excel', duongDan: '/nhap-excel', thuTu: 850, chiAdmin: true }],
  routes: [{ duongDan: '/nhap-excel', phanTu: <NhapExcel /> }],
};
