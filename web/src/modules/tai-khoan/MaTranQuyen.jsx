import { useCallback, useEffect, useState } from 'react';
import { goiApi } from '../../api.js';
import { dungXacThuc } from '../../xac-thuc.jsx';

function trangThaiTuMay(du) {
  const doi = (ds, khoa) => Object.fromEntries(ds.map((x) => [x[khoa], x.choPhep]));
  return { muc: doi(du.muc, 'ma'), boLoc: doi(du.boLoc, 'id'), baoCao: doi(du.baoCao, 'id'), xuat: doi(du.xuat, 'id') };
}

// Bang tick quyen cua mot tai khoan: muc duoc xem, bo loc duoc dung, bao cao, dinh dang xuat.
export default function MaTranQuyen({ nguoiDungId, dong }) {
  const { xuLyLoiApi } = dungXacThuc();
  const [du, setDu] = useState(null);
  const [sua, setSua] = useState(null);
  const [loi, setLoi] = useState('');
  const [thongBao, setThongBao] = useState('');
  const [canhBao, setCanhBao] = useState([]);

  const tai = useCallback(async () => {
    try {
      const kq = await goiApi('/api/tai-khoan/nguoi-dung/' + nguoiDungId + '/quyen');
      setDu(kq);
      setSua(trangThaiTuMay(kq));
    } catch (e) {
      setLoi(e.message);
      xuLyLoiApi(e);
    }
  }, [nguoiDungId, xuLyLoiApi]);

  useEffect(() => {
    tai();
  }, [tai]);

  if (!du || !sua) {
    return <div className="hop-ngang">{loi ? <div className="loi">{loi}</div> : 'Đang tải quyền...'}</div>;
  }

  const tenMuc = Object.fromEntries(du.muc.map((m) => [m.ma, m.nhan]));
  const dat = (nhom, khoa, giaTri) => {
    setSua({ ...sua, [nhom]: { ...sua[nhom], [khoa]: giaTri } });
    setCanhBao([]);
    setThongBao('');
  };

  async function luu(xacNhan) {
    setLoi('');
    setThongBao('');
    try {
      const body = { ...sua };
      if (xacNhan) {
        body.xacNhan = xacNhan;
      }
      await goiApi('/api/tai-khoan/nguoi-dung/' + nguoiDungId + '/quyen', { phuongThuc: 'PUT', body });
      setCanhBao([]);
      setThongBao('Đã lưu quyền. Có hiệu lực ngay ở lần gọi tiếp theo của tài khoản này.');
      await tai();
    } catch (e) {
      if (e.trangThai === 409 && e.du && e.du.canhBao) {
        setCanhBao(e.du.canhBao);
      } else {
        setLoi(e.message);
        xuLyLoiApi(e);
      }
    }
  }

  return (
    <div className="hop-ngang">
      <h2>
        Phân quyền: {du.nguoiDung.tenDangNhap} <span className="phu">({du.nguoiDung.hoTen})</span>
      </h2>

      <h3>1. Mục dữ liệu được xem</h3>
      <div className="luoi-quyen">
        {du.muc.map((m) => (
          <label key={m.ma} className={m.nhayCam ? 'nhay-cam' : ''}>
            <input type="checkbox" checked={Boolean(sua.muc[m.ma])} onChange={(e) => dat('muc', m.ma, e.target.checked)} /> {m.nhan}
            {m.nhayCam && <span className="the-do">nhạy cảm</span>}
          </label>
        ))}
      </div>

      <h3>2. Bộ lọc được dùng</h3>
      <div className="luoi-quyen">
        {du.boLoc.map((b) => {
          const ngoaiMuc = sua.boLoc[b.id] && !sua.muc[b.muc];
          return (
            <label key={b.id} className={ngoaiMuc ? 'nhay-cam' : ''}>
              <input type="checkbox" checked={Boolean(sua.boLoc[b.id])} onChange={(e) => dat('boLoc', b.id, e.target.checked)} /> {b.nhan}{' '}
              <span className="phu">(mục: {tenMuc[b.muc]})</span>
              {ngoaiMuc && <span className="the-do">ngoài mục được xem</span>}
            </label>
          );
        })}
      </div>

      <h3>3. Báo cáo được dùng</h3>
      <div className="luoi-quyen">
        {du.baoCao.map((b) => {
          const thieu = b.mucCanCo.filter((m) => !sua.muc[m]);
          const chuaChay = sua.baoCao[b.id] && thieu.length > 0;
          return (
            <label key={b.id}>
              <input type="checkbox" checked={Boolean(sua.baoCao[b.id])} onChange={(e) => dat('baoCao', b.id, e.target.checked)} /> {b.nhan}
              {chuaChay && <span className="the-vang">chưa chạy được: thiếu mục {thieu.map((m) => tenMuc[m]).join(', ')}</span>}
            </label>
          );
        })}
      </div>

      <h3>4. Định dạng được xuất</h3>
      <div className="luoi-quyen">
        {du.xuat.map((x) => (
          <label key={x.id}>
            <input type="checkbox" checked={Boolean(sua.xuat[x.id])} onChange={(e) => dat('xuat', x.id, e.target.checked)} /> {x.nhan}
          </label>
        ))}
      </div>

      {loi && <div className="loi">{loi}</div>}
      {thongBao && <div className="thanh-cong">{thongBao}</div>}
      {canhBao.length > 0 && (
        <div className="canh-bao">
          <strong>Cần xác nhận trước khi lưu:</strong>
          <ul>
            {canhBao.map((c) => (
              <li key={c.ma}>{c.noiDung}</li>
            ))}
          </ul>
          <button className="nut nut-nguy-hiem" onClick={() => luu(canhBao.map((c) => c.ma))}>
            Tôi hiểu rủi ro, xác nhận và lưu
          </button>
        </div>
      )}
      <div className="hang">
        <button className="nut" onClick={() => luu(null)}>
          Lưu quyền
        </button>
        <button className="nut nut-phu" onClick={dong}>
          Đóng
        </button>
      </div>
    </div>
  );
}
