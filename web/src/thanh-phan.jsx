import { useEffect, useRef } from "react";

// thanh-phan.jsx: cac thanh phan giao dien dung chung (khong thuoc mo-dun nao).

const PHAN_TU_FOCUS =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Hop thoai xac nhan (thay window.confirm).
//  - mo: true thi hien. khiXacNhan / khiHuy: ham xu ly. nguyHiem: nut xac nhan mau do (xoa...).
//  - dangXuLy: dang goi may chu: khoa nut, khong dong bang Esc hay bam ra ngoai.
//  - Esc hoac bam ra ngoai = huy. Phim Tab quay vong trong hop thoai. O duoc chon san la "Huy" (tranh xoa nham).
export function HopThoaiXacNhan({
  mo,
  tieuDe,
  children,
  nhanXacNhan = "Xác nhận",
  nhanHuy = "Hủy",
  nguyHiem = false,
  dangXuLy = false,
  khiXacNhan,
  khiHuy,
}) {
  const hopRef = useRef(null);
  const huyRef = useRef(null);
  const khiHuyRef = useRef(khiHuy);
  const dangXuLyRef = useRef(dangXuLy);
  khiHuyRef.current = khiHuy;
  dangXuLyRef.current = dangXuLy;

  useEffect(() => {
    if (!mo) {
      return undefined;
    }
    const truoc = document.activeElement;
    if (huyRef.current) {
      huyRef.current.focus();
    }
    function khiBamPhim(suKien) {
      if (suKien.key === "Escape") {
        if (!dangXuLyRef.current) {
          khiHuyRef.current();
        }
        return;
      }
      if (suKien.key === "Tab" && hopRef.current) {
        const ds = hopRef.current.querySelectorAll(PHAN_TU_FOCUS);
        if (ds.length === 0) {
          return;
        }
        const dau = ds[0];
        const cuoi = ds[ds.length - 1];
        if (suKien.shiftKey && document.activeElement === dau) {
          suKien.preventDefault();
          cuoi.focus();
        } else if (!suKien.shiftKey && document.activeElement === cuoi) {
          suKien.preventDefault();
          dau.focus();
        }
      }
    }
    document.addEventListener("keydown", khiBamPhim);
    return () => {
      document.removeEventListener("keydown", khiBamPhim);
      if (truoc && truoc.focus) {
        truoc.focus(); // tra focus ve nut da mo hop thoai
      }
    };
  }, [mo]);

  if (!mo) {
    return null;
  }
  return (
    <div
      className="lop-phu"
      onMouseDown={(suKien) => {
        if (suKien.target === suKien.currentTarget && !dangXuLy) {
          khiHuy();
        }
      }}
    >
      <div
        className="hop-thoai"
        role="dialog"
        aria-modal="true"
        aria-labelledby="hop-thoai-tieu-de"
        ref={hopRef}
      >
        <h2 id="hop-thoai-tieu-de">{tieuDe}</h2>
        <div className="hop-thoai-noi-dung">{children}</div>
        <div className="hop-thoai-nut">
          <button
            type="button"
            ref={huyRef}
            className="nut nut-phu"
            onClick={khiHuy}
            disabled={dangXuLy}
          >
            {nhanHuy}
          </button>
          <button
            type="button"
            className={"nut" + (nguyHiem ? " nut-nguy-hiem" : "")}
            onClick={khiXacNhan}
            disabled={dangXuLy}
          >
            {dangXuLy ? "Đang xử lý..." : nhanXacNhan}
          </button>
        </div>
      </div>
    </div>
  );
}
