import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { datMaCsrf, goiApi } from './api.js';

const NguCanhXacThuc = createContext(null);

export function dungXacThuc() {
  return useContext(NguCanhXacThuc);
}

export function NhaCungCapXacThuc({ children }) {
  const [trangThai, setTrangThai] = useState({ dangTai: true, nguoiDung: null, quyen: null });

  const taiLai = useCallback(async () => {
    try {
      const du = await goiApi('/api/tai-khoan/toi');
      datMaCsrf(du.csrfToken);
      setTrangThai({ dangTai: false, nguoiDung: du.nguoiDung, quyen: du.quyen });
    } catch {
      datMaCsrf(null);
      setTrangThai({ dangTai: false, nguoiDung: null, quyen: null });
    }
  }, []);

  useEffect(() => {
    taiLai();
  }, [taiLai]);

  const dangNhap = useCallback(
    async (tenDangNhap, matKhau, dayPhienCu) => {
      const du = await goiApi('/api/tai-khoan/dang-nhap', {
        phuongThuc: 'POST',
        body: dayPhienCu ? { tenDangNhap, matKhau, dayPhienCu: true } : { tenDangNhap, matKhau },
      });
      datMaCsrf(du.csrfToken);
      await taiLai();
    },
    [taiLai]
  );

  const dangXuat = useCallback(async () => {
    try {
      await goiApi('/api/tai-khoan/dang-xuat', { phuongThuc: 'POST', body: {} });
    } finally {
      await taiLai();
    }
  }, [taiLai]);

  // Goi khi mot yeu cau bi 401 (het phien): quay ve man hinh dang nhap.
  const xuLyLoiApi = useCallback(
    (loi) => {
      if (loi && loi.trangThai === 401) {
        taiLai();
      }
    },
    [taiLai]
  );

  const giaTri = { ...trangThai, taiLai, dangNhap, dangXuat, xuLyLoiApi };
  return <NguCanhXacThuc.Provider value={giaTri}>{children}</NguCanhXacThuc.Provider>;
}

export function DangNhap() {
  const { dangNhap } = dungXacThuc();
  const [ten, setTen] = useState('');
  const [matKhau, setMatKhau] = useState('');
  const [loi, setLoi] = useState('');
  const [coPhienCu, setCoPhienCu] = useState(false);
  const [dangGui, setDangGui] = useState(false);

  async function gui(suKien, dayPhienCu = false) {
    if (suKien) {
      suKien.preventDefault();
    }
    setDangGui(true);
    setLoi('');
    try {
      await dangNhap(ten.trim(), matKhau, dayPhienCu);
    } catch (e) {
      if (e.du && e.du.coPhienCu) {
        setCoPhienCu(true);
      } else {
        setCoPhienCu(false);
        setLoi(e.message);
      }
      setMatKhau('');
    } finally {
      setDangGui(false);
    }
  }

  return (
    <div className="trang-giua">
      <form className="hop" onSubmit={gui}>
        <h1>Quản lý quân nhân</h1>
        <p className="phu">Đăng nhập để tiếp tục.</p>
        <label>
          Tên đăng nhập
          <input value={ten} onChange={(e) => setTen(e.target.value)} autoFocus autoComplete="username" />
        </label>
        <label>
          Mật khẩu
          <input type="password" value={matKhau} onChange={(e) => setMatKhau(e.target.value)} autoComplete="current-password" />
        </label>
        {loi && <div className="loi">{loi}</div>}
        {coPhienCu && (
          <div className="canh-bao">
            Đang có một phiên admin khác đang đăng nhập. Nếu đăng nhập tiếp, phiên cũ sẽ bị đưa ra.
            <div>
              <button type="button" className="nut nut-nguy-hiem" disabled={dangGui} onClick={() => gui(null, true)}>
                Đưa phiên cũ ra và đăng nhập
              </button>
            </div>
          </div>
        )}
        <button className="nut" type="submit" disabled={dangGui || !ten || !matKhau}>
          Đăng nhập
        </button>
        <p className="phu">Tài khoản admin chỉ đăng nhập được trên chính máy chủ (địa chỉ localhost).</p>
      </form>
    </div>
  );
}

export function DoiMatKhau({ batBuoc = false }) {
  const { taiLai, dangXuat, nguoiDung } = dungXacThuc();
  const [cu, setCu] = useState('');
  const [moi, setMoi] = useState('');
  const [lai, setLai] = useState('');
  const [loi, setLoi] = useState('');
  const [xong, setXong] = useState(false);

  async function gui(suKien) {
    suKien.preventDefault();
    setLoi('');
    setXong(false);
    if (moi !== lai) {
      setLoi('Hai lần nhập mật khẩu mới không giống nhau');
      return;
    }
    try {
      await goiApi('/api/tai-khoan/doi-mat-khau', { phuongThuc: 'POST', body: { matKhauCu: cu, matKhauMoi: moi } });
      setCu('');
      setMoi('');
      setLai('');
      setXong(true);
      await taiLai();
    } catch (e) {
      setLoi(e.message);
    }
  }

  const noiDung = (
    <form className="hop" onSubmit={gui}>
      <h1>Đổi mật khẩu</h1>
      {batBuoc && (
        <p className="canh-bao">
          Xin chào {nguoiDung.hoTen}. Đây là lần đăng nhập đầu hoặc mật khẩu vừa được đặt lại: bạn cần đặt mật khẩu mới trước khi tiếp tục.
        </p>
      )}
      <p className="phu">Mật khẩu mới: ít nhất 10 ký tự, có cả chữ và số, không chứa tên đăng nhập.</p>
      <label>
        Mật khẩu hiện tại
        <input type="password" value={cu} onChange={(e) => setCu(e.target.value)} autoComplete="current-password" />
      </label>
      <label>
        Mật khẩu mới
        <input type="password" value={moi} onChange={(e) => setMoi(e.target.value)} autoComplete="new-password" />
      </label>
      <label>
        Nhập lại mật khẩu mới
        <input type="password" value={lai} onChange={(e) => setLai(e.target.value)} autoComplete="new-password" />
      </label>
      {loi && <div className="loi">{loi}</div>}
      {xong && <div className="thanh-cong">Đã đổi mật khẩu. Các phiên đăng nhập khác (nếu có) đã bị đưa ra.</div>}
      <button className="nut" type="submit" disabled={!cu || !moi || !lai}>
        Đổi mật khẩu
      </button>
      {batBuoc && (
        <button className="nut nut-phu" type="button" onClick={dangXuat}>
          Đăng xuất
        </button>
      )}
    </form>
  );
  return batBuoc ? <div className="trang-giua">{noiDung}</div> : noiDung;
}
