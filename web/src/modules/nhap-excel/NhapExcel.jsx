import { useState } from 'react';
import { Link } from 'react-router-dom';
import { goiApi, guiTep, taiTep } from '../../api.js';
import { dungXacThuc } from '../../xac-thuc.jsx';
import { boDau } from '../../../../shared/ngay-chuoi.js';

const CHU_XAC_NHAN = 'THAY THẾ';
const NHAN_SHEET = {
  quan_nhan: 'Hồ sơ (quan_nhan)',
  qua_trinh_truoc_tuyen_dung: 'Trước tuyển dụng',
  qua_trinh_cong_tac: 'Quá trình công tác',
  dao_tao: 'Đào tạo',
  khen_thuong: 'Khen thưởng',
  ky_luat_tien_an_tien_su: 'Kỷ luật, tiền án, tiền sự',
  luong: 'Lương',
  than_nhan: 'Thân nhân',
  trang_thai: 'Trạng thái',
};

// Ba buoc: 1) chon file  2) xem ket qua kiem tra  3) ap dung
export default function NhapExcel() {
  const { nguoiDung, xuLyLoiApi } = dungXacThuc();
  const [tep, setTep] = useState(null);
  const [cheDo, setCheDo] = useState('them_hoac_cap_nhat');
  const [buoc, setBuoc] = useState(1);
  const [baoCao, setBaoCao] = useState(null);
  const [themDm, setThemDm] = useState(false);
  const [xacNhan, setXacNhan] = useState('');
  const [dangXuLy, setDangXuLy] = useState(false);
  const [loi, setLoi] = useState('');
  const [ketQua, setKetQua] = useState(null);

  if (nguoiDung.loai !== 'admin') {
    return <h1>Chỉ tài khoản admin được nhập dữ liệu từ Excel</h1>;
  }

  async function lam(viec) {
    setLoi('');
    setDangXuLy(true);
    try {
      await viec();
    } catch (e) {
      setLoi(e.message);
      xuLyLoiApi(e);
    } finally {
      setDangXuLy(false);
    }
  }

  const taiMau = () => lam(() => taiTep('/api/nhap-excel/mau', 'mau-nhap-quan-nhan.xlsx'));

  const kiemTra = () =>
    lam(async () => {
      const kq = await guiTep('/api/nhap-excel/kiem-tra?che_do=' + cheDo, tep);
      setBaoCao(kq);
      setThemDm(false);
      setXacNhan('');
      setBuoc(2);
    });

  const apDung = () =>
    lam(async () => {
      let url = '/api/nhap-excel/ap-dung?che_do=' + cheDo + '&sha256=' + baoCao.sha256;
      if (themDm) {
        url += '&them_danh_muc=1';
      }
      if (cheDo === 'thay_the') {
        url += '&xac_nhan=' + encodeURIComponent(xacNhan);
      }
      setKetQua(await guiTep(url, tep));
      setBuoc(3);
    });

  function lamLai() {
    setTep(null);
    setBaoCao(null);
    setKetQua(null);
    setLoi('');
    setBuoc(1);
  }

  const coLoi = baoCao && baoCao.soLoi > 0;
  const canXacNhanDm = baoCao && baoCao.danhMucLa.length > 0;
  const xacNhanDung = boDau(xacNhan).trim() === boDau(CHU_XAC_NHAN);
  const duDieuKien = baoCao && !coLoi && (!canXacNhanDm || themDm) && (cheDo !== 'thay_the' || xacNhanDung);

  return (
    <div>
      <h1>Nhập hồ sơ từ Excel</h1>
      <div className="cac-buoc">
        {['1. Chọn file', '2. Xem kết quả kiểm tra', '3. Áp dụng'].map((t, i) => (
          <span key={t} className={'buoc' + (buoc === i + 1 ? ' buoc-chon' : '')}>
            {t}
          </span>
        ))}
      </div>
      {loi && <div className="loi">{loi}</div>}

      {buoc === 1 && (
        <div className="hop-ngang">
          <p>
            Dùng file Excel mẫu để nhập nhiều hồ sơ một lần. Phần mềm <strong>kiểm tra cả file trước và chưa ghi gì</strong>; chỉ khi bạn bấm "Áp dụng" dữ liệu mới được ghi, và nếu lỗi giữa chừng thì không thay đổi gì.
          </p>
          <div className="hang">
            <button className="nut nut-phu" onClick={taiMau} disabled={dangXuLy}>
              Tải file Excel mẫu
            </button>
            <span className="phu">Có sheet "Huong_dan", danh sách chọn từ danh mục và ghi chú định dạng ngày.</span>
          </div>
          <label>
            <span>File Excel (.xlsx)</span>
            <input type="file" accept=".xlsx" onChange={(e) => setTep(e.target.files && e.target.files[0] ? e.target.files[0] : null)} />
          </label>
          <fieldset className="chon-che-do">
            <legend>Chế độ nhập</legend>
            <label className="o-tick">
              <input type="radio" name="che-do" checked={cheDo === 'them_hoac_cap_nhat'} onChange={() => setCheDo('them_hoac_cap_nhat')} />
              <span>Thêm hoặc cập nhật (theo mã quân nhân): người đã có thì ghi đè thông tin, người mới thì thêm.</span>
            </label>
            <label className="o-tick">
              <input type="radio" name="che-do" checked={cheDo === 'thay_the'} onChange={() => setCheDo('thay_the')} />
              <span>Thay thế toàn bộ: xóa mọi hồ sơ hiện có rồi nhập file (có sao lưu trước, phải gõ chữ xác nhận).</span>
            </label>
          </fieldset>
          <div>
            <button className="nut" onClick={kiemTra} disabled={!tep || dangXuLy}>
              {dangXuLy ? 'Đang kiểm tra...' : 'Kiểm tra file'}
            </button>
          </div>
        </div>
      )}

      {buoc === 2 && baoCao && (
        <div>
          <div className="hop-ngang">
            <h2>Kết quả kiểm tra: {tep && tep.name}</h2>
            <p>
              Chế độ: <strong>{cheDo === 'thay_the' ? 'Thay thế toàn bộ' : 'Thêm hoặc cập nhật'}</strong>. Số dòng dữ liệu theo sheet:{' '}
              {Object.entries(baoCao.tomTat.soDongTheoSheet)
                .filter(([, n]) => n > 0)
                .map(([s, n]) => (NHAN_SHEET[s] || s) + ' ' + n)
                .join(' · ') || 'không có'}
              .
            </p>
            {!coLoi && (
              <p className="thanh-cong">
                File hợp lệ. Sẽ <strong>thêm {baoCao.tomTat.them}</strong> hồ sơ
                {baoCao.tomTat.capNhat > 0 && <>, <strong>cập nhật {baoCao.tomTat.capNhat}</strong> hồ sơ</>}
                {baoCao.tomTat.chiCon > 0 && <>, cập nhật dữ liệu con của {baoCao.tomTat.chiCon} hồ sơ có sẵn</>}.
              </p>
            )}
            {coLoi && (
              <div className="loi">
                <strong>Có {baoCao.soLoi} lỗi</strong>
                {baoCao.biCatLoi ? ' (chỉ hiện ' + baoCao.loi.length + ' lỗi đầu)' : ''}. Sửa trong file Excel rồi kiểm tra lại. Chưa có gì được ghi.
              </div>
            )}
            {baoCao.canhBao.map((c) => (
              <div key={c} className="canh-bao">
                {c}
              </div>
            ))}
          </div>

          {coLoi && (
            <div className="cuon-ngang">
              <table className="bang" id="bang-loi">
                <thead>
                  <tr>
                    <th>Sheet</th>
                    <th>Dòng</th>
                    <th>Cột</th>
                    <th>Lỗi</th>
                  </tr>
                </thead>
                <tbody>
                  {baoCao.loi.map((l, i) => (
                    <tr key={i}>
                      <td>{l.sheet}</td>
                      <td>{l.dong === null ? '' : l.dong}</td>
                      <td>{l.cot || ''}</td>
                      <td>{l.thongBao}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {canXacNhanDm && (
            <div className="hop-ngang">
              <h2>Mục chưa có trong danh mục ({baoCao.danhMucLa.length})</h2>
              <ul>
                {baoCao.danhMucLa.map((d) => (
                  <li key={d.loai + d.ten}>
                    {d.nhanLoai}: <strong>{d.ten}</strong> <span className="phu">({d.soDong} dòng)</span>
                  </li>
                ))}
              </ul>
              <label className="o-tick">
                <input type="checkbox" checked={themDm} onChange={(e) => setThemDm(e.target.checked)} />
                <span>Thêm các mục trên vào danh mục (xếp ở cấp gốc, bạn chỉnh lại ở màn hình Danh mục). Nếu không muốn, hãy sửa tên trong file Excel.</span>
              </label>
            </div>
          )}

          {cheDo === 'thay_the' && !coLoi && (
            <div className="hop-ngang hop-nguy-hiem">
              <h2>Xác nhận thay thế toàn bộ</h2>
              <p>
                Thao tác này <strong>xóa toàn bộ {baoCao.tomTat.xoaTruoc} hồ sơ hiện có</strong> rồi nhập các hồ sơ trong file. Hệ thống tạo một bản sao lưu tạm trước khi xóa. Gõ <strong>{CHU_XAC_NHAN}</strong> để xác nhận.
              </p>
              <input value={xacNhan} onChange={(e) => setXacNhan(e.target.value)} placeholder={CHU_XAC_NHAN} aria-label="Chữ xác nhận" />
            </div>
          )}

          <div className="hang thanh-luu">
            <button className="nut nut-phu" onClick={lamLai} disabled={dangXuLy}>
              ← Chọn file khác
            </button>
            <button className="nut nut-phu" onClick={kiemTra} disabled={dangXuLy}>
              Kiểm tra lại file này
            </button>
            <button className={'nut' + (cheDo === 'thay_the' ? ' nut-nguy-hiem' : '')} onClick={apDung} disabled={!duDieuKien || dangXuLy}>
              {dangXuLy ? 'Đang ghi...' : cheDo === 'thay_the' ? 'Thay thế và nhập' : 'Áp dụng'}
            </button>
          </div>
        </div>
      )}

      {buoc === 3 && ketQua && (
        <div className="hop-ngang">
          <h2>Đã nhập xong</h2>
          <p className="thanh-cong">
            Đã thêm <strong>{ketQua.soThem}</strong> hồ sơ, cập nhật <strong>{ketQua.soCapNhat}</strong> hồ sơ
            {ketQua.soChiCon > 0 && <>, cập nhật dữ liệu con của {ketQua.soChiCon} hồ sơ có sẵn</>}
            {ketQua.soDanhMucMoi > 0 && <>; thêm {ketQua.soDanhMucMoi} mục vào danh mục</>}
            {ketQua.soXoaTruoc > 0 && <>; đã xóa {ketQua.soXoaTruoc} hồ sơ cũ</>}.
          </p>
          {ketQua.banSaoLuu && <p className="phu">Bản sao lưu tạm trước khi thay thế: {ketQua.banSaoLuu}</p>}
          <div className="hang">
            <Link className="nut" to="/quan-nhan">
              Xem danh sách hồ sơ
            </Link>
            <button className="nut nut-phu" onClick={lamLai}>
              Nhập file khác
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
