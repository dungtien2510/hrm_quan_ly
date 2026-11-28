import { useCallback, useEffect, useRef, useState } from "react";
import { goiApi, taoMatKhauNgauNhien } from "../../api.js";
import { dungXacThuc } from "../../xac-thuc.jsx";
import { HopThoaiXacNhan } from "../../thanh-phan.jsx";
import MaTranQuyen from "./MaTranQuyen.jsx";

const NHAN_LOAI = {
  admin: "Admin",
  xem_day_du: "Xem đầy đủ",
  xem_mot_so_muc: "Xem một số mục",
};
const FORM_TRONG = {
  tenDangNhap: "",
  hoTen: "",
  loai: "xem_day_du",
  matKhauTam: "",
};

function TrangThaiTaiKhoan({ nd }) {
  return (
    <>
      {nd.biKhoa ? (
        <span className="huy-hieu huy-hieu-loi">Bị khóa</span>
      ) : nd.khoaDen ? (
        <span className="huy-hieu huy-hieu-canh-bao">Tạm khóa (nhập sai)</span>
      ) : (
        <span className="huy-hieu huy-hieu-ok">Hoạt động</span>
      )}
      {nd.phaiDoiMatKhau && <span className="huy-hieu">Chờ đổi mật khẩu</span>}
    </>
  );
}

export default function QuanLyTaiKhoan() {
  const { nguoiDung, xuLyLoiApi } = dungXacThuc();
  const [danhSach, setDanhSach] = useState([]);
  const [loi, setLoi] = useState("");
  const [thongBao, setThongBao] = useState("");
  const [form, setForm] = useState(FORM_TRONG);
  const [chonQuyen, setChonQuyen] = useState(null);
  const [mkTam, setMkTam] = useState(null); // { ten, matKhau }: mat khau tam vua tao/dat lai, hien MOT LAN cho den khi admin bam "Da ghi lai"
  const [daChep, setDaChep] = useState(false);
  const [hoiDatLai, setHoiDatLai] = useState(null); // tai khoan dang hoi dat lai mat khau
  const [hoiKhoa, setHoiKhoa] = useState(null); // tai khoan dang hoi khoa
  const [dangXuLy, setDangXuLy] = useState(false);
  const khuQuyenRef = useRef(null);

  const tai = useCallback(async () => {
    try {
      const du = await goiApi("/api/tai-khoan/nguoi-dung");
      setDanhSach(du.nguoiDung);
    } catch (e) {
      setLoi(e.message);
      xuLyLoiApi(e);
    }
  }, [xuLyLoiApi]);

  const laAdmin = nguoiDung.loai === "admin";
  useEffect(() => {
    if (laAdmin) {
      tai(); // khong goi API cua admin khi la tai khoan thuong (may chu cung se tu choi)
    }
  }, [laAdmin, tai]);

  // Bam "Phan quyen" thi cuon xuong bang tick de khong phai tu tim.
  useEffect(() => {
    if (chonQuyen !== null && khuQuyenRef.current) {
      khuQuyenRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [chonQuyen]);

  if (!laAdmin) {
    return <h1>Chỉ tài khoản admin được dùng chức năng này</h1>;
  }

  // Chay mot thao tac goi may chu, tai lai danh sach. Tra ve true neu thanh cong.
  async function lam(viec) {
    setLoi("");
    setThongBao("");
    try {
      await viec();
      await tai();
      return true;
    } catch (e) {
      setLoi(e.message);
      xuLyLoiApi(e);
      return false;
    }
  }

  async function tao(suKien) {
    suKien.preventDefault();
    const { tenDangNhap, matKhauTam } = form;
    setDangXuLy(true);
    const ok = await lam(async () => {
      await goiApi("/api/tai-khoan/nguoi-dung", {
        phuongThuc: "POST",
        body: form,
      });
      setForm(FORM_TRONG);
    });
    setDangXuLy(false);
    if (ok) {
      setDaChep(false);
      setMkTam({ ten: tenDangNhap, matKhau: matKhauTam });
    }
  }

  async function datLai() {
    const nd = hoiDatLai;
    const mk = taoMatKhauNgauNhien();
    setDangXuLy(true);
    const ok = await lam(() =>
      goiApi("/api/tai-khoan/nguoi-dung/" + nd.id + "/dat-lai-mat-khau", {
        phuongThuc: "POST",
        body: { matKhauTam: mk },
      }),
    );
    setDangXuLy(false);
    setHoiDatLai(null);
    if (ok) {
      setDaChep(false);
      setMkTam({ ten: nd.tenDangNhap, matKhau: mk });
    }
  }

  async function datKhoa(nd, khoaLai) {
    setDangXuLy(true);
    const ok = await lam(() =>
      goiApi("/api/tai-khoan/nguoi-dung/" + nd.id, {
        phuongThuc: "PATCH",
        body: { biKhoa: khoaLai },
      }),
    );
    setDangXuLy(false);
    setHoiKhoa(null);
    if (ok) {
      setThongBao(
        khoaLai
          ? 'Đã khóa tài khoản "' + nd.tenDangNhap + '".'
          : 'Đã mở khóa tài khoản "' + nd.tenDangNhap + '".',
      );
    }
  }

  async function chep() {
    try {
      await navigator.clipboard.writeText(mkTam.matKhau);
      setDaChep(true);
    } catch {
      setDaChep(false);
      setLoi(
        "Không sao chép tự động được. Hãy bôi đen mật khẩu rồi nhấn Ctrl+C.",
      );
    }
  }

  return (
    <div>
      <div className="hang tieu-de-trang">
        <h1>Tài khoản và quyền</h1>
      </div>
      {loi && <div className="loi">{loi}</div>}
      {thongBao && <div className="thanh-cong">{thongBao}</div>}

      {mkTam && (
        <div className="mk-tam" role="status">
          <p>
            Mật khẩu tạm của <strong>{mkTam.ten}</strong> (chỉ hiện một lần;
            người dùng sẽ bị buộc đổi ở lần đăng nhập đầu):
          </p>
          <div className="hang">
            <code>{mkTam.matKhau}</code>
            <button type="button" className="nut nut-phu" onClick={chep}>
              {daChep ? "Đã sao chép" : "Sao chép"}
            </button>
            <button
              type="button"
              className="nut"
              onClick={() => setMkTam(null)}
            >
              Đã ghi lại
            </button>
          </div>
        </div>
      )}

      <div className="cuon-ngang">
        <table className="bang">
          <thead>
            <tr>
              <th>Tên đăng nhập</th>
              <th>Họ tên</th>
              <th>Loại</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {danhSach.map((nd) => (
              <tr
                key={nd.id}
                className={chonQuyen === nd.id ? "dong-chon" : ""}
              >
                <td>{nd.tenDangNhap}</td>
                <td>{nd.hoTen}</td>
                <td>{NHAN_LOAI[nd.loai] || nd.loai}</td>
                <td>
                  <TrangThaiTaiKhoan nd={nd} />
                </td>
                <td className="thao-tac">
                  {nd.loai === "admin" ? (
                    <span className="phu">Toàn quyền</span>
                  ) : (
                    <>
                      <button
                        className="nut"
                        onClick={() => setChonQuyen(nd.id)}
                      >
                        Phân quyền
                      </button>
                      <button
                        className="nut nut-phu"
                        onClick={() =>
                          nd.biKhoa ? datKhoa(nd, false) : setHoiKhoa(nd)
                        }
                        disabled={dangXuLy}
                      >
                        {nd.biKhoa ? "Mở khóa" : "Khóa"}
                      </button>
                      <button
                        className="nut nut-phu"
                        onClick={() => setHoiDatLai(nd)}
                        disabled={dangXuLy}
                      >
                        Đặt lại mật khẩu
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {chonQuyen !== null && (
        <div ref={khuQuyenRef} className="khu-quyen">
          <MaTranQuyen
            key={chonQuyen}
            nguoiDungId={chonQuyen}
            dong={() => setChonQuyen(null)}
          />
        </div>
      )}

      <form className="hop-ngang" onSubmit={tao}>
        <h2>Thêm tài khoản</h2>
        <div className="luoi-nhap">
          <label>
            Tên đăng nhập
            <input
              value={form.tenDangNhap}
              onChange={(e) =>
                setForm({ ...form, tenDangNhap: e.target.value })
              }
            />
          </label>
          <label>
            Họ tên
            <input
              value={form.hoTen}
              onChange={(e) => setForm({ ...form, hoTen: e.target.value })}
            />
          </label>
          <label>
            Loại
            <select
              value={form.loai}
              onChange={(e) => setForm({ ...form, loai: e.target.value })}
            >
              <option value="xem_day_du">{NHAN_LOAI.xem_day_du}</option>
              <option value="xem_mot_so_muc">{NHAN_LOAI.xem_mot_so_muc}</option>
            </select>
          </label>
          <label>
            Mật khẩu tạm
            <span className="hang">
              <input
                value={form.matKhauTam}
                onChange={(e) =>
                  setForm({ ...form, matKhauTam: e.target.value })
                }
              />
              <button
                type="button"
                className="nut nut-phu"
                onClick={() =>
                  setForm({ ...form, matKhauTam: taoMatKhauNgauNhien() })
                }
              >
                Tạo ngẫu nhiên
              </button>
            </span>
          </label>
        </div>
        <div>
          <button
            className="nut"
            type="submit"
            disabled={
              dangXuLy || !form.tenDangNhap || !form.hoTen || !form.matKhauTam
            }
          >
            {dangXuLy ? "Đang tạo..." : "Tạo tài khoản"}
          </button>
        </div>
        <p className="phu">
          Tên đăng nhập 3–32 ký tự (chữ không dấu, số, . _ -). Chỉ có một tài
          khoản admin, tạo bằng lệnh trên máy chủ.
        </p>
      </form>

      <HopThoaiXacNhan
        mo={hoiDatLai !== null}
        tieuDe="Đặt lại mật khẩu?"
        nhanXacNhan="Đặt lại mật khẩu"
        nguyHiem
        dangXuLy={dangXuLy}
        khiXacNhan={datLai}
        khiHuy={() => setHoiDatLai(null)}
      >
        <p>
          Đặt lại mật khẩu của{" "}
          <strong>{hoiDatLai ? hoiDatLai.tenDangNhap : ""}</strong> bằng một mật
          khẩu tạm ngẫu nhiên.
        </p>
        <p className="phu">
          Các phiên đăng nhập hiện có của họ sẽ bị đưa ra, và họ phải đổi mật
          khẩu ở lần đăng nhập sau.
        </p>
      </HopThoaiXacNhan>

      <HopThoaiXacNhan
        mo={hoiKhoa !== null}
        tieuDe="Khóa tài khoản?"
        nhanXacNhan="Khóa tài khoản"
        nguyHiem
        dangXuLy={dangXuLy}
        khiXacNhan={() => datKhoa(hoiKhoa, true)}
        khiHuy={() => setHoiKhoa(null)}
      >
        <p>
          Khóa tài khoản <strong>{hoiKhoa ? hoiKhoa.tenDangNhap : ""}</strong>.
        </p>
        <p className="phu">
          Các phiên đăng nhập đang mở của họ bị đưa ra ngay. Mở khóa lại bất cứ
          lúc nào ở bảng này.
        </p>
      </HopThoaiXacNhan>
    </div>
  );
}
