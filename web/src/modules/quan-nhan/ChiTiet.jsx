import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { goiApi } from "../../api.js";
import { dungXacThuc } from "../../xac-thuc.jsx";
import { HopThoaiXacNhan } from "../../thanh-phan.jsx";
import { MUC } from "../../../../shared/truong-muc.js";
import {
  BangCon,
  KhongCoQuyen,
  LuoiTruong,
  NHAN_MUC,
  TheTrangThai,
  truongCua,
  tuoiHienThi,
} from "./hien-thi.jsx";
import TrangThaiHangNgay from "./TrangThaiHangNgay.jsx";

const CAC_TAB = [
  { ma: "ai", nhan: "A.I Sơ lược lý lịch" },
  { ma: "aii", nhan: "A.II Đặc điểm bản thân" },
  { ma: "bi", nhan: "B.I Gia đình bản thân" },
  { ma: "bii", nhan: "B.II Gia đình vợ/chồng" },
];
// Cac muc cua bang quan_nhan hien trong tab A.I (theo thu tu)
const MUC_TAB_AI = [
  "thong_tin_co_ban",
  "lien_he",
  "dac_diem_chinh_tri",
  "so_dinh_danh",
  "qua_trinh_cong_tac",
  "dao_tao",
  "luong",
  "khen_thuong",
];
const MUC_NHAY_CAM = new Set(MUC.filter((m) => m.nhayCam).map((m) => m.ma));

// Dua cac so dinh danh DAY DU (da lay qua API "hien so", co ghi nhat ky) vao dong de hien.
function ghepSoDayDu(dong, thatSo) {
  return thatSo ? { ...dong, ...thatSo } : dong;
}

export default function ChiTiet() {
  const { id } = useParams();
  const dieuHuong = useNavigate();
  const { nguoiDung, xuLyLoiApi } = dungXacThuc();
  const laAdmin = nguoiDung.loai === "admin";
  const [ho, setHo] = useState(null);
  const [loi, setLoi] = useState(""); // loi TAI ho so (khong tim thay, mat quyen...): thay ca trang
  const [loiThaoTac, setLoiThaoTac] = useState(""); // loi khi bam nut (xoa, hien so): hien thanh khoi bao loi tren trang
  const [tab, setTab] = useState("ai");
  const [thatSo, setThatSo] = useState(null);
  const [hoiXoa, setHoiXoa] = useState(false);
  const [dangXoa, setDangXoa] = useState(false);

  const tai = useCallback(async () => {
    try {
      setHo(await goiApi("/api/quan-nhan/" + id));
      setLoi("");
    } catch (e) {
      setLoi(e.message);
      xuLyLoiApi(e);
    }
  }, [id, xuLyLoiApi]);

  useEffect(() => {
    setHo(null);
    setThatSo(null);
    setLoiThaoTac("");
    tai();
  }, [tai]);

  if (loi) {
    return (
      <div>
        <div className="loi">{loi}</div>
        <p>
          <Link className="nut nut-phu" to="/quan-nhan">
            ← Về danh sách
          </Link>
        </p>
      </div>
    );
  }
  if (!ho) {
    return <p className="phu">Đang tải hồ sơ...</p>;
  }

  const duocXem = new Set(ho.mucDuocXem);
  const tenDm = ho.tenDanhMuc;
  const q = ho.quan_nhan;
  const coSoDinhDanh = duocXem.has("so_dinh_danh");
  const tomTat = [q.don_vi_id, q.quan_ham_id, q.chuc_vu_id]
    .map((maDm) => (maDm ? tenDm[maDm] : null))
    .filter(Boolean)
    .join(" · ");

  async function hienSo() {
    setLoiThaoTac("");
    try {
      const kq = await goiApi("/api/quan-nhan/" + id + "/so-dinh-danh");
      setThatSo({
        quan_nhan: kq.quan_nhan,
        than_nhan: Object.fromEntries(kq.than_nhan.map((t) => [t.id, t])),
      });
    } catch (e) {
      setLoiThaoTac(e.message);
      xuLyLoiApi(e);
    }
  }

  async function xoa() {
    setDangXoa(true);
    setLoiThaoTac("");
    try {
      await goiApi("/api/quan-nhan/" + id + "?version=" + q.version, {
        phuongThuc: "DELETE",
      });
      dieuHuong("/quan-nhan");
    } catch (e) {
      setDangXoa(false);
      setHoiXoa(false);
      setLoiThaoTac(e.message);
      xuLyLoiApi(e);
    }
  }

  const dongQuanNhan = ghepSoDayDu(q, thatSo && thatSo.quan_nhan);
  const thanNhan = (ho.than_nhan || []).map((t) =>
    ghepSoDayDu(t, thatSo && thatSo.than_nhan[t.id]),
  );

  function bangThanNhan(nhom) {
    if (!ho.than_nhan) {
      return <KhongCoQuyen muc="than_nhan" />;
    }
    const dong = thanNhan.filter((t) => t.nhom === nhom);
    return (
      <BangCon
        bang="than_nhan"
        dsDong={dong}
        tenDm={tenDm}
        boCot={["nhom"]}
        themCot={
          dong.some((d) => "tuoi" in d)
            ? {
                tieuDe: "Tuổi (tự tính)",
                giaTri: (d) => (d.quan_he === "con" ? tuoiHienThi(d) : ""),
              }
            : null
        }
      />
    );
  }

  return (
    <div>
      <div className="hang tieu-de-trang">
        <h1>
          {q.ho_ten_khai_sinh} <span className="phu">({q.ma_quan_nhan})</span>
        </h1>
        {ho.trangThaiHomNay && <TheTrangThai trangThai={ho.trangThaiHomNay} />}
        <Link to="/quan-nhan" className="nut nut-phu">
          ← Danh sách
        </Link>
        {laAdmin && (
          <>
            <Link to={"/quan-nhan/" + id + "/sua"} className="nut">
              Sửa hồ sơ
            </Link>
            <button
              className="nut nut-nguy-hiem"
              onClick={() => setHoiXoa(true)}
            >
              Xóa
            </button>
          </>
        )}
        {coSoDinhDanh && !thatSo && (
          <button
            className="nut nut-phu"
            onClick={hienSo}
            title="Mỗi lần hiện đều được ghi vào nhật ký"
          >
            Hiện số định danh
          </button>
        )}
        {thatSo && (
          <button className="nut nut-phu" onClick={() => setThatSo(null)}>
            Che số
          </button>
        )}
      </div>
      {tomTat && <p className="tom-tat">{tomTat}</p>}
      {loiThaoTac && <div className="loi">{loiThaoTac}</div>}

      <div className="cac-tab" role="tablist">
        {CAC_TAB.map((t) => (
          <button
            key={t.ma}
            role="tab"
            aria-selected={tab === t.ma}
            className={"tab" + (tab === t.ma ? " tab-chon" : "")}
            onClick={() => setTab(t.ma)}
          >
            {t.nhan}
          </button>
        ))}
      </div>

      {tab === "ai" && (
        <div className="noi-dung-tab">
          {MUC_TAB_AI.map((ma) => (
            <section key={ma} className="phan">
              <h3>
                {NHAN_MUC[ma]}
                {MUC_NHAY_CAM.has(ma) && (
                  <span className="the-vang">nhạy cảm</span>
                )}
              </h3>
              {duocXem.has(ma) ? (
                <LuoiTruong
                  danhSach={truongCua("quan_nhan").filter((t) => t.muc === ma)}
                  dong={dongQuanNhan}
                  tenDm={tenDm}
                />
              ) : (
                <KhongCoQuyen muc={ma} />
              )}
            </section>
          ))}
        </div>
      )}

      {tab === "aii" && (
        <div className="noi-dung-tab">
          <section className="phan">
            <h3>Trạng thái hằng ngày</h3>
            {duocXem.has("trang_thai") ? (
              <TrangThaiHangNgay
                quanNhanId={Number(id)}
                laAdmin={laAdmin}
                khiThayDoi={tai}
              />
            ) : (
              <KhongCoQuyen muc="trang_thai" />
            )}
          </section>
          {[
            [
              "qua_trinh_truoc_tuyen_dung",
              "Quá trình trước khi được tuyển dụng",
              "qua_trinh_cong_tac",
            ],
            ["qua_trinh_cong_tac", "Quá trình công tác", "qua_trinh_cong_tac"],
            ["dao_tao", "Đào tạo, bồi dưỡng", "dao_tao"],
            ["khen_thuong", "Khen thưởng, danh hiệu thi đua", "khen_thuong"],
            ["luong", "Quá trình lương", "luong"],
          ].map(([bang, tieuDe, muc]) => (
            <section key={bang} className="phan">
              <h3>
                {tieuDe}
                {MUC_NHAY_CAM.has(muc) && (
                  <span className="the-vang">nhạy cảm</span>
                )}
              </h3>
              {ho[bang] ? (
                <BangCon bang={bang} dsDong={ho[bang]} tenDm={tenDm} />
              ) : (
                <KhongCoQuyen muc={muc} />
              )}
            </section>
          ))}
          <section className="phan">
            <h3>
              Kỷ luật, tiền án, tiền sự
              <span className="the-vang">nhạy cảm</span>
            </h3>
            {!duocXem.has("ky_luat") && <KhongCoQuyen muc="ky_luat" />}
            {!duocXem.has("tien_an_tien_su") && (
              <KhongCoQuyen muc="tien_an_tien_su" />
            )}
            {ho.ky_luat_tien_an_tien_su && (
              <BangCon
                bang="ky_luat_tien_an_tien_su"
                dsDong={ho.ky_luat_tien_an_tien_su}
                tenDm={tenDm}
              />
            )}
          </section>
        </div>
      )}

      {tab === "bi" && (
        <div className="noi-dung-tab">
          <section className="phan">
            <h3>Cha, mẹ, vợ/chồng, con, anh chị em ruột</h3>
            {bangThanNhan("ban_than")}
          </section>
        </div>
      )}

      {tab === "bii" && (
        <div className="noi-dung-tab">
          <section className="phan">
            <h3>Cha, mẹ, anh chị em ruột của vợ/chồng</h3>
            {bangThanNhan("vo_chong")}
          </section>
        </div>
      )}

      <HopThoaiXacNhan
        mo={hoiXoa}
        tieuDe="Xóa hồ sơ?"
        nhanXacNhan="Xóa hồ sơ"
        nguyHiem
        dangXuLy={dangXoa}
        khiXacNhan={xoa}
        khiHuy={() => setHoiXoa(false)}
      >
        <p>
          Bạn sắp xóa hồ sơ <strong>{q.ho_ten_khai_sinh}</strong> (
          {q.ma_quan_nhan}).
        </p>
        <p className="phu">
          Đây là xóa mềm: hồ sơ biến khỏi danh sách nhưng vẫn còn trong dữ liệu
          và nhật ký thao tác.
        </p>
      </HopThoaiXacNhan>
    </div>
  );
}
