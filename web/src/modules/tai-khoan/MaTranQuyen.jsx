import { useCallback, useEffect, useState } from "react";
import { goiApi } from "../../api.js";
import { dungXacThuc } from "../../xac-thuc.jsx";
import { HopThoaiXacNhan } from "../../thanh-phan.jsx";

function trangThaiTuMay(du) {
  const doi = (ds, khoa) =>
    Object.fromEntries(ds.map((x) => [x[khoa], x.choPhep]));
  return {
    muc: doi(du.muc, "ma"),
    boLoc: doi(du.boLoc, "id"),
    baoCao: doi(du.baoCao, "id"),
    xuat: doi(du.xuat, "id"),
  };
}

// Mot nhom o tick: tieu de, bo dem "da chon / tong", nut chon het / bo het.
function NhomQuyen({
  tieuDe,
  moTa,
  tong,
  daChon,
  khiChonHet,
  khiBoHet,
  children,
}) {
  return (
    <section className="nhom-quyen">
      <div className="nhom-quyen-dau">
        <h3>
          {tieuDe}{" "}
          <span className="phu">
            (đã chọn {daChon}/{tong})
          </span>
        </h3>
        <div className="hang">
          <button type="button" className="nut nut-chu" onClick={khiChonHet}>
            Chọn tất cả
          </button>
          <button type="button" className="nut nut-chu" onClick={khiBoHet}>
            Bỏ chọn tất cả
          </button>
        </div>
      </div>
      {moTa && <p className="phu">{moTa}</p>}
      <div className="luoi-quyen">{children}</div>
    </section>
  );
}

// Bang tick quyen cua mot tai khoan: muc duoc xem, bo loc duoc dung, bao cao, dinh dang xuat.
export default function MaTranQuyen({ nguoiDungId, dong }) {
  const { xuLyLoiApi } = dungXacThuc();
  const [du, setDu] = useState(null);
  const [sua, setSua] = useState(null);
  const [loi, setLoi] = useState("");
  const [thongBao, setThongBao] = useState("");
  const [canhBao, setCanhBao] = useState([]);
  const [hoiDong, setHoiDong] = useState(false);

  const tai = useCallback(async () => {
    try {
      const kq = await goiApi(
        "/api/tai-khoan/nguoi-dung/" + nguoiDungId + "/quyen",
      );
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
    return (
      <div className="hop-ngang">
        {loi ? <div className="loi">{loi}</div> : "Đang tải quyền..."}
      </div>
    );
  }

  const tenMuc = Object.fromEntries(du.muc.map((m) => [m.ma, m.nhan]));
  const coDoi = JSON.stringify(sua) !== JSON.stringify(trangThaiTuMay(du));
  const dem = (nhom) => Object.values(sua[nhom]).filter(Boolean).length;
  const xoaThongBao = () => {
    setCanhBao([]);
    setThongBao("");
  };
  const dat = (nhom, khoa, giaTri) => {
    setSua({ ...sua, [nhom]: { ...sua[nhom], [khoa]: giaTri } });
    xoaThongBao();
  };
  const datTatCa = (nhom, ds, truongKhoa, giaTri) => {
    const moi = { ...sua[nhom] };
    for (const x of ds) {
      moi[x[truongKhoa]] = giaTri;
    }
    setSua({ ...sua, [nhom]: moi });
    xoaThongBao();
  };

  async function luu(xacNhan) {
    setLoi("");
    setThongBao("");
    try {
      const body = { ...sua };
      if (xacNhan) {
        body.xacNhan = xacNhan;
      }
      await goiApi("/api/tai-khoan/nguoi-dung/" + nguoiDungId + "/quyen", {
        phuongThuc: "PUT",
        body,
      });
      setCanhBao([]);
      setThongBao(
        "Đã lưu quyền. Có hiệu lực ngay ở lần gọi tiếp theo của tài khoản này.",
      );
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
        Phân quyền: {du.nguoiDung.tenDangNhap}{" "}
        <span className="phu">({du.nguoiDung.hoTen})</span>
      </h2>

      <NhomQuyen
        tieuDe="1. Mục dữ liệu được xem"
        moTa="Tài khoản chỉ thấy dữ liệu thuộc các mục được tick. Mục nhạy cảm cần xác nhận khi cấp."
        tong={du.muc.length}
        daChon={dem("muc")}
        khiChonHet={() => datTatCa("muc", du.muc, "ma", true)}
        khiBoHet={() => datTatCa("muc", du.muc, "ma", false)}
      >
        {du.muc.map((m) => (
          <label key={m.ma} className={m.nhayCam ? "nhay-cam" : ""}>
            <input
              type="checkbox"
              checked={Boolean(sua.muc[m.ma])}
              onChange={(e) => dat("muc", m.ma, e.target.checked)}
            />{" "}
            {m.nhan}
            {m.nhayCam && <span className="the-do">nhạy cảm</span>}
          </label>
        ))}
      </NhomQuyen>

      <NhomQuyen
        tieuDe="2. Bộ lọc được dùng"
        moTa="Mặc định bộ lọc đi theo mục chứa trường. Cấp bộ lọc ngoài mục được xem có thể làm lộ thông tin suy ra."
        tong={du.boLoc.length}
        daChon={dem("boLoc")}
        khiChonHet={() => datTatCa("boLoc", du.boLoc, "id", true)}
        khiBoHet={() => datTatCa("boLoc", du.boLoc, "id", false)}
      >
        {du.boLoc.map((b) => {
          const ngoaiMuc = sua.boLoc[b.id] && !sua.muc[b.muc];
          return (
            <label key={b.id} className={ngoaiMuc ? "nhay-cam" : ""}>
              <input
                type="checkbox"
                checked={Boolean(sua.boLoc[b.id])}
                onChange={(e) => dat("boLoc", b.id, e.target.checked)}
              />{" "}
              {b.nhan} <span className="phu">(mục: {tenMuc[b.muc]})</span>
              {ngoaiMuc && <span className="the-do">ngoài mục được xem</span>}
            </label>
          );
        })}
      </NhomQuyen>

      <NhomQuyen
        tieuDe="3. Báo cáo được dùng"
        moTa="Một báo cáo chỉ chạy khi tài khoản có đủ các mục mà báo cáo cần."
        tong={du.baoCao.length}
        daChon={dem("baoCao")}
        khiChonHet={() => datTatCa("baoCao", du.baoCao, "id", true)}
        khiBoHet={() => datTatCa("baoCao", du.baoCao, "id", false)}
      >
        {du.baoCao.map((b) => {
          const thieu = b.mucCanCo.filter((m) => !sua.muc[m]);
          const chuaChay = sua.baoCao[b.id] && thieu.length > 0;
          return (
            <label key={b.id}>
              <input
                type="checkbox"
                checked={Boolean(sua.baoCao[b.id])}
                onChange={(e) => dat("baoCao", b.id, e.target.checked)}
              />{" "}
              {b.nhan}
              {chuaChay && (
                <span className="the-vang">
                  chưa chạy được: thiếu mục{" "}
                  {thieu.map((m) => tenMuc[m]).join(", ")}
                </span>
              )}
            </label>
          );
        })}
      </NhomQuyen>

      <NhomQuyen
        tieuDe="4. Định dạng được xuất"
        tong={du.xuat.length}
        daChon={dem("xuat")}
        khiChonHet={() => datTatCa("xuat", du.xuat, "id", true)}
        khiBoHet={() => datTatCa("xuat", du.xuat, "id", false)}
      >
        {du.xuat.map((x) => (
          <label key={x.id}>
            <input
              type="checkbox"
              checked={Boolean(sua.xuat[x.id])}
              onChange={(e) => dat("xuat", x.id, e.target.checked)}
            />{" "}
            {x.nhan}
          </label>
        ))}
      </NhomQuyen>

      {loi && <div className="loi">{loi}</div>}
      {thongBao && <div className="thanh-cong">{thongBao}</div>}
      {canhBao.length > 0 && (
        <div className="canh-bao" role="alert">
          <strong>Cần xác nhận trước khi lưu:</strong>
          <ul>
            {canhBao.map((c) => (
              <li key={c.ma}>{c.noiDung}</li>
            ))}
          </ul>
          <button
            className="nut nut-nguy-hiem"
            onClick={() => luu(canhBao.map((c) => c.ma))}
          >
            Tôi hiểu rủi ro, xác nhận và lưu
          </button>
        </div>
      )}
      <div className="hang thanh-luu">
        <button className="nut" onClick={() => luu(null)} disabled={!coDoi}>
          Lưu quyền
        </button>
        <button
          className="nut nut-phu"
          onClick={() => (coDoi ? setHoiDong(true) : dong())}
        >
          Đóng
        </button>
        {coDoi && <span className="the-vang">chưa lưu</span>}
      </div>

      <HopThoaiXacNhan
        mo={hoiDong}
        tieuDe="Bỏ thay đổi chưa lưu?"
        nhanXacNhan="Bỏ thay đổi và đóng"
        nguyHiem
        khiXacNhan={dong}
        khiHuy={() => setHoiDong(false)}
      >
        <p>
          Bạn đã tick hoặc bỏ tick một số quyền nhưng chưa bấm "Lưu quyền". Đóng
          bây giờ thì các thay đổi này mất.
        </p>
      </HopThoaiXacNhan>
    </div>
  );
}
