import { useEffect, useState } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import { dsMenu, dsRoute } from "./nap-mo-dun-web.js";
import {
  DangNhap,
  DoiMatKhau,
  NhaCungCapXacThuc,
  dungXacThuc,
} from "./xac-thuc.jsx";

const NHAN_LOAI = {
  admin: "Quản trị",
  xem_day_du: "Xem đầy đủ",
  xem_mot_so_muc: "Xem một số mục",
};

// Bieu tuong SVG noi tuyen (khong tai tu internet). Mo-dun co the khai bao "bieuTuong" trong muc menu
// (mot trong cac ten duoi day); khong khai bao thi dung "chung". Loi chi biet TEN bieu tuong, khong biet ten mo-dun.
const HINH_VE = {
  trang_chu: <path d="M3 12l9-9 9 9M5 10v10h14V10" />,
  nguoi: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2 20c0-3.5 3-6 7-6s7 2.5 7 6M17 11a3 3 0 100-6M22 20c0-2.5-1.8-4.5-4.5-5" />
    </>
  ),
  tai_khoan: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
    </>
  ),
  lich: (
    <>
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M8 2v4M16 2v4M3 10h18" />
    </>
  ),
  sao: (
    <path d="M12 3l2.6 5.5 6 .8-4.4 4.2 1.1 6L12 16.6 6.7 19.5l1.1-6L3.4 9.3l6-.8z" />
  ),
  danh_sach: <path d="M4 6h16M4 12h16M4 18h16" />,
  tai_len: <path d="M12 16V4M7 9l5-5 5 5M4 20h16" />,
  khoa: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 018 0v3" />
    </>
  ),
  chung: <path d="M6 3h9l4 4v14H6zM14 3v5h5" />,
};

function BieuTuong({ ten }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {HINH_VE[ten] || HINH_VE.chung}
    </svg>
  );
}

function MucMenu({ duongDan, nhan, bieuTuong, end }) {
  return (
    <NavLink to={duongDan} end={end} title={nhan}>
      <BieuTuong ten={bieuTuong} />
      <span className="menu-nhan">{nhan}</span>
    </NavLink>
  );
}

function chuDau(hoTen) {
  const tu =
    String(hoTen || "")
      .trim()
      .split(/\s+/)
      .pop() || "?";
  return tu.charAt(0).toUpperCase();
}

function TrangChu() {
  const { nguoiDung, quyen } = dungXacThuc();
  const [trangThai, setTrangThai] = useState("Đang kiểm tra máy chủ...");

  useEffect(() => {
    const huy = new AbortController();
    fetch("/api/suc-khoe", { signal: huy.signal })
      .then((phanHoi) => phanHoi.json())
      .then((du) =>
        setTrangThai(
          "Máy chủ: " +
            du.trangThai +
            " | phiên bản " +
            du.phienBan +
            " | " +
            du.soMoDun +
            " mô-đun",
        ),
      )
      .catch((loi) => {
        if (loi.name !== "AbortError") {
          setTrangThai("Không kết nối được máy chủ");
        }
      });
    return () => huy.abort();
  }, []);

  return (
    <div>
      <div className="hang tieu-de-trang">
        <h1>Trang chủ</h1>
      </div>
      <div className="hop-ngang">
        <p style={{ margin: 0 }}>Xin chào {nguoiDung.hoTen}.</p>
        <p className="phu">{trangThai}</p>
        <p className="phu">
          Bạn được xem {quyen.muc.length} mục dữ liệu, dùng {quyen.boLoc.length}{" "}
          bộ lọc, {quyen.baoCao.length} báo cáo, {quyen.xuat.length} định dạng
          xuất.
        </p>
      </div>
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
  const laAdmin = nguoiDung.loai === "admin";
  const menuNghiepVu = dsMenu.filter((muc) => !muc.chiAdmin);
  const menuQuanTri = laAdmin ? dsMenu.filter((muc) => muc.chiAdmin) : [];
  const hienMuc = (muc) => (
    <MucMenu
      key={muc.moDun + ":" + muc.id}
      duongDan={muc.duongDan}
      nhan={muc.nhan}
      bieuTuong={muc.bieuTuong}
    />
  );
  return (
    <div className="khung">
      <aside className="menu">
        <div className="thuong-hieu">
          <div className="thuong-hieu-dau" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M12 3l2.6 5.5 6 .8-4.4 4.2 1.1 6L12 16.6 6.7 19.5l1.1-6L3.4 9.3l6-.8z" />
            </svg>
          </div>
          <span className="thuong-hieu-ten">Quản lý quân nhân</span>
        </div>
        <nav aria-label="Điều hướng chính">
          <div className="menu-nhom">Tổng quan</div>
          <MucMenu duongDan="/" nhan="Trang chủ" bieuTuong="trang_chu" end />
          {menuNghiepVu.length > 0 && (
            <div className="menu-nhom">Nghiệp vụ</div>
          )}
          {menuNghiepVu.map(hienMuc)}
          {menuQuanTri.length > 0 && <div className="menu-nhom">Quản trị</div>}
          {menuQuanTri.map(hienMuc)}
          <div className="menu-nhom">Tài khoản</div>
          <MucMenu
            duongDan="/doi-mat-khau"
            nhan="Đổi mật khẩu"
            bieuTuong="khoa"
          />
        </nav>
      </aside>
      <div className="cot-chinh">
        <header className="thanh-tren">
          <div className="nguoi-dung-tren">
            <div className="avatar" aria-hidden="true">
              {chuDau(nguoiDung.hoTen)}
            </div>
            <div className="thong-tin-nguoi">
              <div className="thong-tin-ten">{nguoiDung.hoTen}</div>
              <div className="thong-tin-vai-tro">
                {NHAN_LOAI[nguoiDung.loai] || nguoiDung.loai}
              </div>
            </div>
            <button className="nut nut-phu" onClick={dangXuat}>
              Đăng xuất
            </button>
          </div>
        </header>
        <main className="noi-dung">
          <div className="noi-dung-trong">
            <Routes>
              <Route path="/" element={<TrangChu />} />
              <Route path="/doi-mat-khau" element={<DoiMatKhau />} />
              {dsRoute.map((r) => (
                <Route key={r.duongDan} path={r.duongDan} element={r.phanTu} />
              ))}
              <Route path="*" element={<KhongTimThay />} />
            </Routes>
          </div>
        </main>
      </div>
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
