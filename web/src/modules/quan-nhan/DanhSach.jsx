import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { goiApi } from "../../api.js";
import { dungXacThuc } from "../../xac-thuc.jsx";
import { TheTrangThai } from "./hien-thi.jsx";

const SO_DONG = 20;

// Trang thai rong: bieu tuong nho + cau giai thich + (tuy chon) nut hanh dong.
function TrangThaiRong({ tieuDe, moTa, children }) {
  return (
    <div className="rong">
      <svg className="rong-bieu-tuong" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 3h9l4 4v14H6zM14 3v5h5" />
      </svg>
      <p className="rong-tieu-de">{tieuDe}</p>
      {moTa && <p className="phu">{moTa}</p>}
      {children}
    </div>
  );
}

export default function DanhSach() {
  const { nguoiDung, xuLyLoiApi } = dungXacThuc();
  const laAdmin = nguoiDung.loai === "admin";
  const [thamSo, setThamSo] = useSearchParams();
  const trang = Math.max(1, Number(thamSo.get("trang")) || 1);
  const [du, setDu] = useState(null);
  const [loi, setLoi] = useState("");

  useEffect(() => {
    let huy = false;
    setLoi("");
    goiApi("/api/quan-nhan?trang=" + trang + "&soDong=" + SO_DONG)
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
  const chuaCoHoSo = du && du.tong === 0;
  const trangTrong = du && du.tong > 0 && du.dong.length === 0;
  const coBang = du && du.dong.length > 0;

  return (
    <div>
      <div className="hang tieu-de-trang">
        <h1>Hồ sơ quân nhân</h1>
        {laAdmin && !chuaCoHoSo && (
          <Link className="nut" to="/quan-nhan/them">
            + Thêm hồ sơ
          </Link>
        )}
      </div>
      {loi && <div className="loi">{loi}</div>}
      {!du && !loi && <p className="phu">Đang tải...</p>}

      {chuaCoHoSo && (
        <TrangThaiRong
          tieuDe="Chưa có hồ sơ nào"
          moTa={
            laAdmin
              ? "Thêm hồ sơ đầu tiên, hoặc nhập nhiều hồ sơ một lần từ Excel."
              : "Liên hệ quản trị viên để được nhập hồ sơ."
          }
        >
          {laAdmin && (
            <Link className="nut" to="/quan-nhan/them">
              + Thêm hồ sơ đầu tiên
            </Link>
          )}
        </TrangThaiRong>
      )}

      {trangTrong && (
        <TrangThaiRong
          tieuDe="Không có hồ sơ nào ở trang này"
          moTa={"Tổng cộng có " + du.tong + " hồ sơ, " + du.soTrang + " trang."}
        >
          <button className="nut nut-phu" onClick={() => chuyenTrang(1)}>
            Về trang đầu
          </button>
        </TrangThaiRong>
      )}

      {coBang && (
        <>
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
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {du.dong.map((d) => (
                  <tr key={d.id}>
                    <td className="ma-so">{d.ma_quan_nhan}</td>
                    <td>
                      <Link to={"/quan-nhan/" + d.id}>
                        {d.ho_ten_khai_sinh}
                      </Link>
                    </td>
                    <td>{du.tenDanhMuc[d.don_vi_id]}</td>
                    <td>{du.tenDanhMuc[d.quan_ham_id]}</td>
                    <td>{d.chuc_vu_id ? du.tenDanhMuc[d.chuc_vu_id] : ""}</td>
                    {du.trangThaiHomNay && (
                      <td>
                        <TheTrangThai trangThai={du.trangThaiHomNay[d.id]} />
                      </td>
                    )}
                    <td className="hanh-dong">
                      <Link to={"/quan-nhan/" + d.id}>Xem</Link>
                      {laAdmin && (
                        <Link to={"/quan-nhan/" + d.id + "/sua"}>Sửa</Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="phan-trang">
            <span>
              Hiển thị {(du.trang - 1) * du.soDong + 1}–
              {(du.trang - 1) * du.soDong + du.dong.length} trên {du.tong} hồ sơ
            </span>
            <div className="phan-trang-nut">
              <button
                className="nut nut-phu"
                disabled={du.trang <= 1}
                onClick={() => chuyenTrang(du.trang - 1)}
              >
                ← Trang trước
              </button>
              <span>
                Trang {du.trang} / {du.soTrang}
              </span>
              <button
                className="nut nut-phu"
                disabled={du.trang >= du.soTrang}
                onClick={() => chuyenTrang(du.trang + 1)}
              >
                Trang sau →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
