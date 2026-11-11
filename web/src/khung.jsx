import { useEffect, useState } from 'react';
import { NavLink, Route, Routes } from 'react-router-dom';
import { dsMenu, dsRoute } from './nap-mo-dun-web.js';

function TrangChu() {
  const [trangThai, setTrangThai] = useState('Đang kiểm tra máy chủ...');

  useEffect(() => {
    const huy = new AbortController();
    fetch('/api/suc-khoe', { signal: huy.signal })
      .then((phanHoi) => phanHoi.json())
      .then((du) => setTrangThai('Máy chủ: ' + du.trangThai + ' | phiên bản ' + du.phienBan + ' | ' + du.soMoDun + ' mô-đun'))
      .catch((loi) => {
        if (loi.name !== 'AbortError') {
          setTrangThai('Không kết nối được máy chủ');
        }
      });
    return () => huy.abort();
  }, []);

  return (
    <div>
      <h1>Quản lý quân nhân</h1>
      <p>{trangThai}</p>
    </div>
  );
}

function KhongTimThay() {
  return <h1>Không tìm thấy trang</h1>;
}

export default function Khung() {
  return (
    <div className="khung">
      <nav className="menu">
        <div className="menu-tieu-de">Quân nhân</div>
        <NavLink to="/" end>
          Trang chủ
        </NavLink>
        {dsMenu.map((muc) => (
          <NavLink key={muc.moDun + ':' + muc.id} to={muc.duongDan}>
            {muc.nhan}
          </NavLink>
        ))}
      </nav>
      <main className="noi-dung">
        <Routes>
          <Route path="/" element={<TrangChu />} />
          {dsRoute.map((r) => (
            <Route key={r.duongDan} path={r.duongDan} element={r.phanTu} />
          ))}
          <Route path="*" element={<KhongTimThay />} />
        </Routes>
      </main>
    </div>
  );
}
