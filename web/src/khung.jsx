import { useEffect, useState } from 'react';
import { NavLink, Route, Routes } from 'react-router-dom';
import { dsMenu, dsRoute } from './nap-mo-dun-web.js';
import { DangNhap, DoiMatKhau, NhaCungCapXacThuc, dungXacThuc } from './xac-thuc.jsx';

function TrangChu() {
  const { nguoiDung, quyen } = dungXacThuc();
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
      <p>Xin chào {nguoiDung.hoTen}.</p>
      <p>{trangThai}</p>
      <p className="phu">
        Bạn được xem {quyen.muc.length} mục dữ liệu, dùng {quyen.boLoc.length} bộ lọc, {quyen.baoCao.length} báo cáo, {quyen.xuat.length} định dạng xuất.
      </p>
    </div>
  );
}

function KhongTimThay() {
  return <h1>Không tìm thấy trang</h1>;
}

function KhungChinh() {
  const { dangTai, nguoiDung, dangXuat } = dungXacThuc();
  if (dangTai) {
    return <div className="trang-giua">Đang tải...</div>;
  }
  if (!nguoiDung) {
    return <DangNhap />;
  }
  if (nguoiDung.phaiDoiMatKhau) {
    return <DoiMatKhau batBuoc />;
  }
  // Menu chi la tien loi: moi API van duoc may chu kiem tra quyen rieng.
  const menu = dsMenu.filter((muc) => !muc.chiAdmin || nguoiDung.loai === 'admin');
  return (
    <div className="khung">
      <nav className="menu">
        <div className="menu-tieu-de">Quân nhân</div>
        <NavLink to="/" end>
          Trang chủ
        </NavLink>
        {menu.map((muc) => (
          <NavLink key={muc.moDun + ':' + muc.id} to={muc.duongDan}>
            {muc.nhan}
          </NavLink>
        ))}
        <NavLink to="/doi-mat-khau">Đổi mật khẩu</NavLink>
        <div className="menu-chan">
          <div>{nguoiDung.hoTen}</div>
          <button className="nut nut-phu" onClick={dangXuat}>
            Đăng xuất
          </button>
        </div>
      </nav>
      <main className="noi-dung">
        <Routes>
          <Route path="/" element={<TrangChu />} />
          <Route path="/doi-mat-khau" element={<DoiMatKhau />} />
          {dsRoute.map((r) => (
            <Route key={r.duongDan} path={r.duongDan} element={r.phanTu} />
          ))}
          <Route path="*" element={<KhongTimThay />} />
        </Routes>
      </main>
    </div>
  );
}

export default function Khung() {
  return (
    <NhaCungCapXacThuc>
      <KhungChinh />
    </NhaCungCapXacThuc>
  );
}
