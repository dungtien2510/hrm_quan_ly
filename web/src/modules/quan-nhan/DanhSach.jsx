import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { goiApi } from '../../api.js';
import { dungXacThuc } from '../../xac-thuc.jsx';
import { TheTrangThai } from './hien-thi.jsx';

const SO_DONG = 20;

export default function DanhSach() {
  const { nguoiDung, xuLyLoiApi } = dungXacThuc();
  const [thamSo, setThamSo] = useSearchParams();
  const trang = Math.max(1, Number(thamSo.get('trang')) || 1);
  const [du, setDu] = useState(null);
  const [loi, setLoi] = useState('');

  useEffect(() => {
    let huy = false;
    setLoi('');
    goiApi('/api/quan-nhan?trang=' + trang + '&soDong=' + SO_DONG)
      .then((kq) => {
        if (!huy) {
          setDu(kq);
        }
      })
      .catch((e) => {
        if (!huy) {
          setLoi(e.message);
          xuLyLoiApi(e);
        }
      });
    return () => {
      huy = true;
    };
  }, [trang, xuLyLoiApi]);

  const chuyenTrang = (t) => setThamSo({ trang: String(t) });

  return (
    <div>
      <div className="hang tieu-de-trang">
        <h1>Hồ sơ quân nhân</h1>
        {nguoiDung.loai === 'admin' && (
          <Link className="nut" to="/quan-nhan/them">
            + Thêm hồ sơ
          </Link>
        )}
      </div>
      {loi && <div className="loi">{loi}</div>}
      {!du && !loi && <p className="phu">Đang tải...</p>}
      {du && (
        <>
          <p className="phu">
            Tổng {du.tong} hồ sơ. Trang {du.trang}/{du.soTrang}.
          </p>
          <div className="cuon-ngang">
            <table className="bang">
              <thead>
                <tr>
                  <th>Mã</th>
                  <th>Họ và tên</th>
                  <th>Đơn vị</th>
                  <th>Quân hàm</th>
                  <th>Chức vụ</th>
                  {du.trangThaiHomNay && <th>Hôm nay</th>}
                </tr>
              </thead>
              <tbody>
                {du.dong.map((d) => (
                  <tr key={d.id}>
                    <td>{d.ma_quan_nhan}</td>
                    <td>
                      <Link to={'/quan-nhan/' + d.id}>{d.ho_ten_khai_sinh}</Link>
                    </td>
                    <td>{du.tenDanhMuc[d.don_vi_id]}</td>
                    <td>{du.tenDanhMuc[d.quan_ham_id]}</td>
                    <td>{d.chuc_vu_id ? du.tenDanhMuc[d.chuc_vu_id] : ''}</td>
                    {du.trangThaiHomNay && (
                      <td>
                        <TheTrangThai trangThai={du.trangThaiHomNay[d.id]} />
                      </td>
                    )}
                  </tr>
                ))}
                {du.dong.length === 0 && (
                  <tr>
                    <td colSpan={6} className="phu">
                      Không có hồ sơ nào ở trang này.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="hang">
            <button className="nut nut-phu" disabled={du.trang <= 1} onClick={() => chuyenTrang(du.trang - 1)}>
              ← Trang trước
            </button>
            <button className="nut nut-phu" disabled={du.trang >= du.soTrang} onClick={() => chuyenTrang(du.trang + 1)}>
              Trang sau →
            </button>
          </div>
        </>
      )}
    </div>
  );
}
