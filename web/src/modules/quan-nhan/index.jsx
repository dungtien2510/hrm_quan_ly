import ChiTiet from './ChiTiet.jsx';
import DanhSach from './DanhSach.jsx';
import FormHoSo from './FormHoSo.jsx';

// Mo-dun giao dien "quan-nhan": danh sach, chi tiet 4 tab (A.I, A.II, B.I, B.II), them va sua ho so.
export default {
  ten: 'quan-nhan',
  menu: [{ id: 'quan-nhan', nhan: 'Hồ sơ quân nhân', duongDan: '/quan-nhan', thuTu: 10 }],
  routes: [
    { duongDan: '/quan-nhan', phanTu: <DanhSach /> },
    { duongDan: '/quan-nhan/them', phanTu: <FormHoSo /> },
    { duongDan: '/quan-nhan/:id', phanTu: <ChiTiet /> },
    { duongDan: '/quan-nhan/:id/sua', phanTu: <FormHoSo /> },
  ],
};
