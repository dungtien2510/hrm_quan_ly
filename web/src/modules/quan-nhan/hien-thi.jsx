import {
  GIA_TRI_LUA_CHON,
  MUC,
  TRUONG,
} from "../../../../shared/truong-muc.js";
import { hienThiNgayThieu } from "../../../../shared/ngay-chuoi.js";
import { ngayDuSangHienThi } from "../../../../shared/bieu-mau.js";

export const NHAN_MUC = Object.fromEntries(MUC.map((m) => [m.ma, m.nhan]));

// Cac truong cua mot bang (tu bang khai bao dung chung voi may chu).
export const truongCua = (bang) => TRUONG.filter((t) => t.bang === bang);

// Truong nay co du lieu trong "dong" khong? May chu chi gui cac cot thuoc muc duoc cap, nen thieu cot = khong co quyen.
export const coCot = (t, dong) => t.cot.every((c) => c in dong);

// Gia tri de HIEN THI (chu), da doi ma danh muc thanh ten, ngay thanh dd/mm/yyyy...
export function giaTriHienThi(t, dong, tenDm) {
  switch (t.kieu) {
    case "chu":
      return dong[t.cot[0]] ?? "";
    case "so": {
      const v = dong[t.cot[0]];
      return v === null || v === undefined ? "" : String(v).replace(".", ",");
    }
    case "ngay_du":
      return ngayDuSangHienThi(dong[t.cot[0]]);
    case "ngay_thieu": {
      const goc = t.goc || t.truong;
      return hienThiNgayThieu(
        dong[goc + "_nam"],
        dong[goc + "_thang"],
        dong[goc + "_ngay"],
      );
    }
    case "lua_chon": {
      const v = dong[t.cot[0]];
      if (v === null || v === undefined) {
        return "";
      }
      if (t.danhMuc) {
        return (tenDm && tenDm[v]) || "#" + v;
      }
      const g = (GIA_TRI_LUA_CHON[t.bang + "." + t.truong] || []).find(
        (x) => x.ma === v,
      );
      return g ? g.nhan : String(v);
    }
    case "co_khong":
      return dong[t.cot[0]] === 1 ? "Có" : "Không";
    default:
      return "";
  }
}

export function tuoiHienThi(dong) {
  if (dong.tuoi === null || dong.tuoi === undefined) {
    return "";
  }
  return dong.tuoi < 3
    ? dong.tuoi + " tuổi " + (dong.soThang % 12) + " tháng"
    : dong.tuoi + " tuổi";
}

// export function KhongCoQuyen({ muc }) {
//   return (
//     <p className="khong-quyen">
//       Bạn không có quyền xem mục "{NHAN_MUC[muc] || muc}".
//     </p>
//   );
// }
export function KhongCoQuyen({ muc }) {
  return (
    <p className="khong-quyen" role="note">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path d="M8 11V8a4 4 0 018 0v3" />
      </svg>
      <span>Bạn không có quyền xem mục "{NHAN_MUC[muc] || muc}".</span>
    </p>
  );
}

// Luoi "ten truong: gia tri" cho mot dong; chi hien cac truong thuoc "danhSach" ma may chu da gui.
export function LuoiTruong({ danhSach, dong, tenDm }) {
  const hien = danhSach.filter((t) => coCot(t, dong));
  return (
    <dl className="luoi-truong">
      {hien.map((t) => {
        const gt = giaTriHienThi(t, dong, tenDm);
        return (
          <div key={t.truong} className="o-truong">
            <dt>{t.hienThi}</dt>
            <dd>{gt === "" ? <span className="phu">—</span> : gt}</dd>
          </div>
        );
      })}
    </dl>
  );
}

// Bang cac dong con (qua trinh cong tac, luong, than nhan...). Cot = cac truong ma may chu da gui.
// Cot kieu so (he so luong...) can phai; ngay va chu can trai.
export function BangCon({ bang, dsDong, tenDm, boCot = [], themCot = null }) {
  if (dsDong.length === 0) {
    return <p className="phu">Chưa có dữ liệu.</p>;
  }
  const cot = truongCua(bang).filter(
    (t) => !boCot.includes(t.truong) && coCot(t, dsDong[0]),
  );
  return (
    <div className="cuon-ngang">
      <table className="bang">
        <thead>
          <tr>
            {cot.map((t) => (
              <th key={t.truong} className={t.kieu === "so" ? "so" : undefined}>
                {t.hienThi}
              </th>
            ))}
            {themCot && <th>{themCot.tieuDe}</th>}
          </tr>
        </thead>
        <tbody>
          {dsDong.map((d) => (
            <tr key={d.id}>
              {cot.map((t) => (
                <td
                  key={t.truong}
                  className={t.kieu === "so" ? "so" : undefined}
                >
                  {giaTriHienThi(t, d, tenDm)}
                </td>
              ))}
              {themCot && <td>{themCot.giaTri(d)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Mau cua trang thai lay tu danh muc (do admin chon, dang "#rrggbb") nen khong biet truoc.
// Tu mau goc tao: nen NHAT (tron 86% voi trang) va chu DAM (tron 50% voi den) de chu luon doc duoc,
// ke ca voi mau vang. Cham tron ben canh nhan chu dung dung mau goc (bien --mau).
export function kieuHuyHieu(mau) {
  const m = /^#([0-9a-f]{6})$/i.exec(mau || "");
  if (!m) {
    return undefined; // khong co mau hop le: dung kieu trung tinh trong CSS
  }
  const so = parseInt(m[1], 16);
  const kenh = [(so >> 16) & 255, (so >> 8) & 255, so & 255];
  const tron = (dich, tyLe) =>
    "rgb(" +
    kenh.map((k) => Math.round(k * (1 - tyLe) + dich * tyLe)).join(",") +
    ")";
  return { background: tron(255, 0.86), color: tron(0, 0.5), "--mau": mau };
}

export function TheTrangThai({ trangThai }) {
  if (!trangThai) {
    return null;
  }
  return (
    <span className="huy-hieu" style={kieuHuyHieu(trangThai.mau)}>
      {trangThai.ten}
    </span>
  );
}
