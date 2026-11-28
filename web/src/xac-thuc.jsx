import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useState,
} from "react";
import { datMaCsrf, goiApi } from "./api.js";

const NguCanhXacThuc = createContext(null);

export function dungXacThuc() {
  return useContext(NguCanhXacThuc);
}

export function NhaCungCapXacThuc({ children }) {
  const [trangThai, setTrangThai] = useState({
    dangTai: true,
    nguoiDung: null,
    quyen: null,
  });

  const taiLai = useCallback(async () => {
    try {
      const du = await goiApi("/api/tai-khoan/toi");
      datMaCsrf(du.csrfToken);
      setTrangThai({
        dangTai: false,
        nguoiDung: du.nguoiDung,
        quyen: du.quyen,
      });
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
      const du = await goiApi("/api/tai-khoan/dang-nhap", {
        phuongThuc: "POST",
        body: dayPhienCu
          ? { tenDangNhap, matKhau, dayPhienCu: true }
          : { tenDangNhap, matKhau },
      });
      datMaCsrf(du.csrfToken);
      await taiLai();
    },
    [taiLai],
  );

  const dangXuat = useCallback(async () => {
    try {
      await goiApi("/api/tai-khoan/dang-xuat", {
        phuongThuc: "POST",
        body: {},
      });
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
    [taiLai],
  );

  const giaTri = { ...trangThai, taiLai, dangNhap, dangXuat, xuLyLoiApi };
  return (
    <NguCanhXacThuc.Provider value={giaTri}>{children}</NguCanhXacThuc.Provider>
  );
}

// O nhap mat khau co nut Hien / An. Nhan va o nhap noi voi nhau bang id (de trinh doc man hinh doc dung ten o).
function OMatKhau({ nhan, giaTri, doi, autoComplete }) {
  const id = useId();
  const [hien, setHien] = useState(false);
  return (
    <div className="truong-mk">
      <label htmlFor={id}>{nhan}</label>
      <div className="o-mat-khau">
        <input
          id={id}
          type={hien ? "text" : "password"}
          value={giaTri}
          onChange={(e) => doi(e.target.value)}
          autoComplete={autoComplete}
        />
        <button
          type="button"
          className="nut-hien-mk"
          onClick={() => setHien(!hien)}
          aria-pressed={hien}
          aria-label={hien ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
        >
          {hien ? "Ẩn" : "Hiện"}
        </button>
      </div>
    </div>
  );
}

export function DangNhap() {
  const { dangNhap } = dungXacThuc();
  const [ten, setTen] = useState("");
  const [matKhau, setMatKhau] = useState("");
  const [loi, setLoi] = useState("");
  const [coPhienCu, setCoPhienCu] = useState(false);
  const [dangGui, setDangGui] = useState(false);

  async function gui(suKien, dayPhienCu = false) {
    if (suKien) {
      suKien.preventDefault();
    }
    setDangGui(true);
    setLoi("");
    try {
      await dangNhap(ten.trim(), matKhau, dayPhienCu);
    } catch (e) {
      if (e.du && e.du.coPhienCu) {
        setCoPhienCu(true);
      } else {
        setCoPhienCu(false);
        setLoi(e.message);
      }
      setMatKhau("");
    } finally {
      setDangGui(false);
    }
  }

  return (
    <div className="trang-giua">
      <form className="hop" onSubmit={gui}>
        <div className="hop-dau">
          <div className="thuong-hieu-dau" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M12 3l2.6 5.5 6 .8-4.4 4.2 1.1 6L12 16.6 6.7 19.5l1.1-6L3.4 9.3l6-.8z" />
            </svg>
          </div>
          <div>
            <h1>Quản lý quân nhân</h1>
            <p className="phu">Đăng nhập để tiếp tục.</p>
          </div>
        </div>
        <label>
          Tên đăng nhập
          <input
            value={ten}
            onChange={(e) => setTen(e.target.value)}
            autoFocus
            autoComplete="username"
          />
        </label>
        <OMatKhau
          nhan="Mật khẩu"
          giaTri={matKhau}
          doi={setMatKhau}
          autoComplete="current-password"
        />
        {loi && (
          <div className="loi" role="alert">
            {loi}
          </div>
        )}
        {coPhienCu && (
          <div className="canh-bao" role="alert">
            Đang có một phiên admin khác đang đăng nhập. Nếu đăng nhập tiếp,
            phiên cũ sẽ bị đưa ra.
            <div>
              <button
                type="button"
                className="nut nut-nguy-hiem"
                disabled={dangGui}
                onClick={() => gui(null, true)}
              >
                Đưa phiên cũ ra và đăng nhập
              </button>
            </div>
          </div>
        )}
        <button
          className="nut"
          type="submit"
          disabled={dangGui || !ten || !matKhau}
        >
          {dangGui ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>
        <p className="phu">
          Tài khoản admin chỉ đăng nhập được trên chính máy chủ (địa chỉ
          localhost).
        </p>
      </form>
    </div>
  );
}

export function DoiMatKhau({ batBuoc = false }) {
  const { taiLai, dangXuat, nguoiDung } = dungXacThuc();
  const [cu, setCu] = useState("");
  const [moi, setMoi] = useState("");
  const [lai, setLai] = useState("");
  const [loi, setLoi] = useState("");
  const [xong, setXong] = useState(false);

  async function gui(suKien) {
    suKien.preventDefault();
    setLoi("");
    setXong(false);
    if (moi !== lai) {
      setLoi("Hai lần nhập mật khẩu mới không giống nhau");
      return;
    }
    try {
      await goiApi("/api/tai-khoan/doi-mat-khau", {
        phuongThuc: "POST",
        body: { matKhauCu: cu, matKhauMoi: moi },
      });
      setCu("");
      setMoi("");
      setLai("");
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
          Xin chào {nguoiDung.hoTen}. Đây là lần đăng nhập đầu hoặc mật khẩu vừa
          được đặt lại: bạn cần đặt mật khẩu mới trước khi tiếp tục.
        </p>
      )}
      <p className="phu">
        Mật khẩu mới: ít nhất 10 ký tự, có cả chữ và số, không chứa tên đăng
        nhập.
      </p>
      <OMatKhau
        nhan="Mật khẩu hiện tại"
        giaTri={cu}
        doi={setCu}
        autoComplete="current-password"
      />
      <OMatKhau
        nhan="Mật khẩu mới"
        giaTri={moi}
        doi={setMoi}
        autoComplete="new-password"
      />
      <OMatKhau
        nhan="Nhập lại mật khẩu mới"
        giaTri={lai}
        doi={setLai}
        autoComplete="new-password"
      />
      {loi && (
        <div className="loi" role="alert">
          {loi}
        </div>
      )}
      {xong && (
        <div className="thanh-cong">
          Đã đổi mật khẩu. Các phiên đăng nhập khác (nếu có) đã bị đưa ra.
        </div>
      )}
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
