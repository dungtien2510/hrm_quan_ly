import { useCallback, useEffect, useState } from 'react';
import { goiApi } from '../../api.js';
import { dungXacThuc } from '../../xac-thuc.jsx';
import { ngayDuSangHienThi } from '../../../../shared/bieu-mau.js';

const FORM_TRONG = { trang_thai_id: '', tu_ngay: '', den_ngay: '', ly_do_hoac_noi: '' };

// Trang thai hang ngay cua mot quan nhan theo khoang thoi gian. Admin them / sua / xoa; may chu khong cho chong nhau.
export default function TrangThaiHangNgay({ quanNhanId, laAdmin, khiThayDoi }) {
  const { xuLyLoiApi } = dungXacThuc();
  const [du, setDu] = useState(null);
  const [loai, setLoai] = useState([]);
  const [form, setForm] = useState(FORM_TRONG);
  const [dangSua, setDangSua] = useState(null);
  const [loi, setLoi] = useState('');

  const tai = useCallback(async () => {
    try {
      setDu(await goiApi('/api/trang-thai/quan-nhan/' + quanNhanId));
    } catch (e) {
      setLoi(e.message);
      xuLyLoiApi(e);
    }
  }, [quanNhanId, xuLyLoiApi]);

  useEffect(() => {
    tai();
    goiApi('/api/danh-muc?loai=trang_thai')
      .then((kq) => setLoai(kq.dong))
      .catch(() => setLoai([]));
  }, [tai]);

  async function gui(suKien) {
    suKien.preventDefault();
    setLoi('');
    const body = {
      trang_thai_id: Number(form.trang_thai_id),
      tu_ngay: form.tu_ngay,
      den_ngay: form.den_ngay.trim() === '' ? null : form.den_ngay,
      ly_do_hoac_noi: form.ly_do_hoac_noi.trim() === '' ? null : form.ly_do_hoac_noi,
    };
    try {
      if (dangSua) {
        await goiApi('/api/trang-thai/' + dangSua, { phuongThuc: 'PUT', body });
      } else {
        await goiApi('/api/trang-thai/quan-nhan/' + quanNhanId, { phuongThuc: 'POST', body });
      }
      setForm(FORM_TRONG);
      setDangSua(null);
      await tai();
      if (khiThayDoi) {
        khiThayDoi();
      }
    } catch (e) {
      setLoi(e.message);
      xuLyLoiApi(e);
    }
  }

  async function xoa(dong) {
    if (!window.confirm('Xóa khoảng trạng thái "' + dong.ten_trang_thai + '"?')) {
      return;
    }
    setLoi('');
    try {
      await goiApi('/api/trang-thai/' + dong.id, { phuongThuc: 'DELETE' });
      await tai();
      if (khiThayDoi) {
        khiThayDoi();
      }
    } catch (e) {
      setLoi(e.message);
      xuLyLoiApi(e);
    }
  }

  function batDauSua(dong) {
    setDangSua(dong.id);
    setForm({
      trang_thai_id: String(dong.trang_thai_id),
      tu_ngay: ngayDuSangHienThi(dong.tu_ngay),
      den_ngay: ngayDuSangHienThi(dong.den_ngay),
      ly_do_hoac_noi: dong.ly_do_hoac_noi || '',
    });
    setLoi('');
  }

  const chonLoai = loai.find((l) => String(l.id) === String(form.trang_thai_id));
  if (!du) {
    return loi ? <div className="loi">{loi}</div> : <p className="phu">Đang tải trạng thái...</p>;
  }
  return (
    <div>
      <p>
        Hôm nay:{' '}
        <span className="the-trang-thai" style={{ background: du.homNay.mau || '#757575' }}>
          {du.homNay.ten}
        </span>{' '}
        {du.homNay.macDinh && <span className="phu">(không có khoảng nào bao trùm hôm nay nên mặc định là Có mặt)</span>}
      </p>
      {loi && <div className="loi">{loi}</div>}
      <div className="cuon-ngang">
        <table className="bang">
          <thead>
            <tr>
              <th>Trạng thái</th>
              <th>Từ ngày</th>
              <th>Đến ngày</th>
              <th>Lý do / nơi</th>
              {laAdmin && <th>Thao tác</th>}
            </tr>
          </thead>
          <tbody>
            {du.dong.length === 0 && (
              <tr>
                <td colSpan={laAdmin ? 5 : 4} className="phu">
                  Chưa có khoảng trạng thái nào (luôn là Có mặt).
                </td>
              </tr>
            )}
            {du.dong.map((d) => (
              <tr key={d.id}>
                <td>
                  <span className="the-trang-thai" style={{ background: d.mau || '#757575' }}>
                    {d.ten_trang_thai}
                  </span>
                </td>
                <td>{ngayDuSangHienThi(d.tu_ngay)}</td>
                <td>{d.den_ngay ? ngayDuSangHienThi(d.den_ngay) : <span className="phu">chưa kết thúc</span>}</td>
                <td>{d.ly_do_hoac_noi}</td>
                {laAdmin && (
                  <td className="thao-tac">
                    <button className="nut nut-phu" onClick={() => batDauSua(d)}>
                      Sửa
                    </button>
                    <button className="nut nut-phu" onClick={() => xoa(d)}>
                      Xóa
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {laAdmin && (
        <form className="hang-form" onSubmit={gui}>
          <strong>{dangSua ? 'Sửa khoảng trạng thái' : 'Thêm khoảng trạng thái'}</strong>
          <label>
            Trạng thái
            <select value={form.trang_thai_id} onChange={(e) => setForm({ ...form, trang_thai_id: e.target.value })}>
              <option value="">— chọn —</option>
              {loai.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.ten}
                </option>
              ))}
            </select>
          </label>
          {chonLoai && (
            <p className="phu goi-y-hang">
              {chonLoai.cho_dang_ky_truoc === 1
                ? 'Loại này đăng ký trước được: có thể chọn ngày ở tương lai.'
                : 'Loại này chỉ ghi việc đã hoặc đang xảy ra: không chọn ngày ở tương lai. Nếu vẫn đang ở trạng thái này thì để trống "Đến ngày".'}
            </p>
          )}
          <label>
            Từ ngày
            <input placeholder="dd/mm/yyyy" value={form.tu_ngay} onChange={(e) => setForm({ ...form, tu_ngay: e.target.value })} />
          </label>
          <label>
            Đến ngày (bỏ trống nếu chưa kết thúc)
            <input placeholder="dd/mm/yyyy" value={form.den_ngay} onChange={(e) => setForm({ ...form, den_ngay: e.target.value })} />
          </label>
          <label>
            Lý do hoặc nơi
            <input value={form.ly_do_hoac_noi} onChange={(e) => setForm({ ...form, ly_do_hoac_noi: e.target.value })} />
          </label>
          <div className="hang">
            <button className="nut" type="submit" disabled={!form.trang_thai_id || !form.tu_ngay}>
              {dangSua ? 'Lưu thay đổi' : 'Thêm'}
            </button>
            {dangSua && (
              <button
                className="nut nut-phu"
                type="button"
                onClick={() => {
                  setDangSua(null);
                  setForm(FORM_TRONG);
                  setLoi('');
                }}
              >
                Hủy sửa
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
