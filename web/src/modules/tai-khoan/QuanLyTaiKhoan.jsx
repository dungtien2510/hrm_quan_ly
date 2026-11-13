import { useCallback, useEffect, useState } from 'react';
import { goiApi, taoMatKhauNgauNhien } from '../../api.js';
import { dungXacThuc } from '../../xac-thuc.jsx';
import MaTranQuyen from './MaTranQuyen.jsx';

const NHAN_LOAI = { admin: 'Admin', xem_day_du: 'Xem đầy đủ', xem_mot_so_muc: 'Xem một số mục' };
const FORM_TRONG = { tenDangNhap: '', hoTen: '', loai: 'xem_day_du', matKhauTam: '' };

export default function QuanLyTaiKhoan() {
  const { nguoiDung, xuLyLoiApi } = dungXacThuc();
  const [danhSach, setDanhSach] = useState([]);
  const [loi, setLoi] = useState('');
  const [thongBao, setThongBao] = useState('');
  const [form, setForm] = useState(FORM_TRONG);
  const [chonQuyen, setChonQuyen] = useState(null);

  const tai = useCallback(async () => {
    try {
      const du = await goiApi('/api/tai-khoan/nguoi-dung');
      setDanhSach(du.nguoiDung);
    } catch (e) {
      setLoi(e.message);
      xuLyLoiApi(e);
    }
  }, [xuLyLoiApi]);

  const laAdmin = nguoiDung.loai === 'admin';
  useEffect(() => {
    if (laAdmin) {
      tai(); // khong goi API cua admin khi la tai khoan thuong (may chu cung se tu choi)
    }
  }, [laAdmin, tai]);

  if (!laAdmin) {
    return <h1>Chỉ tài khoản admin được dùng chức năng này</h1>;
  }

  async function lam(viec, thanhCong) {
    setLoi('');
    setThongBao('');
    try {
      await viec();
      if (thanhCong) {
        setThongBao(thanhCong);
      }
      await tai();
    } catch (e) {
      setLoi(e.message);
      xuLyLoiApi(e);
    }
  }

  function tao(suKien) {
    suKien.preventDefault();
    const mk = form.matKhauTam;
    lam(async () => {
      await goiApi('/api/tai-khoan/nguoi-dung', { phuongThuc: 'POST', body: form });
      setForm(FORM_TRONG);
    }, 'Đã tạo tài khoản "' + form.tenDangNhap + '". Mật khẩu tạm: ' + mk + ' (ghi lại ngay, chỉ hiện một lần; người dùng sẽ bị buộc đổi ở lần đăng nhập đầu).');
  }

  function datLai(nd) {
    const mk = taoMatKhauNgauNhien();
    if (!window.confirm('Đặt lại mật khẩu của "' + nd.tenDangNhap + '"? Các phiên đăng nhập của họ sẽ bị đưa ra.')) {
      return;
    }
    lam(
      () => goiApi('/api/tai-khoan/nguoi-dung/' + nd.id + '/dat-lai-mat-khau', { phuongThuc: 'POST', body: { matKhauTam: mk } }),
      'Mật khẩu tạm của "' + nd.tenDangNhap + '": ' + mk + ' (ghi lại ngay, chỉ hiện một lần).'
    );
  }

  function khoa(nd) {
    lam(() => goiApi('/api/tai-khoan/nguoi-dung/' + nd.id, { phuongThuc: 'PATCH', body: { biKhoa: !nd.biKhoa } }), nd.biKhoa ? 'Đã mở khóa.' : 'Đã khóa tài khoản.');
  }

  return (
    <div>
      <h1>Tài khoản và quyền</h1>
      {loi && <div className="loi">{loi}</div>}
      {thongBao && <div className="thanh-cong">{thongBao}</div>}

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
            <tr key={nd.id}>
              <td>{nd.tenDangNhap}</td>
              <td>{nd.hoTen}</td>
              <td>{NHAN_LOAI[nd.loai] || nd.loai}</td>
              <td>
                {nd.biKhoa ? 'Bị khóa' : nd.khoaDen ? 'Tạm khóa (nhập sai)' : 'Hoạt động'}
                {nd.phaiDoiMatKhau ? ' · chờ đổi mật khẩu' : ''}
              </td>
              <td className="thao-tac">
                {nd.loai === 'admin' ? (
                  <span className="phu">Toàn quyền</span>
                ) : (
                  <>
                    <button className="nut" onClick={() => setChonQuyen(nd.id)}>
                      Phân quyền
                    </button>
                    <button className="nut nut-phu" onClick={() => khoa(nd)}>
                      {nd.biKhoa ? 'Mở khóa' : 'Khóa'}
                    </button>
                    <button className="nut nut-phu" onClick={() => datLai(nd)}>
                      Đặt lại mật khẩu
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <form className="hop-ngang" onSubmit={tao}>
        <h2>Thêm tài khoản</h2>
        <label>
          Tên đăng nhập
          <input value={form.tenDangNhap} onChange={(e) => setForm({ ...form, tenDangNhap: e.target.value })} />
        </label>
        <label>
          Họ tên
          <input value={form.hoTen} onChange={(e) => setForm({ ...form, hoTen: e.target.value })} />
        </label>
        <label>
          Loại
          <select value={form.loai} onChange={(e) => setForm({ ...form, loai: e.target.value })}>
            <option value="xem_day_du">{NHAN_LOAI.xem_day_du}</option>
            <option value="xem_mot_so_muc">{NHAN_LOAI.xem_mot_so_muc}</option>
          </select>
        </label>
        <label>
          Mật khẩu tạm
          <span className="hang">
            <input value={form.matKhauTam} onChange={(e) => setForm({ ...form, matKhauTam: e.target.value })} />
            <button type="button" className="nut nut-phu" onClick={() => setForm({ ...form, matKhauTam: taoMatKhauNgauNhien() })}>
              Tạo ngẫu nhiên
            </button>
          </span>
        </label>
        <button className="nut" type="submit" disabled={!form.tenDangNhap || !form.hoTen || !form.matKhauTam}>
          Tạo tài khoản
        </button>
        <p className="phu">Tên đăng nhập 3–32 ký tự (chữ không dấu, số, . _ -). Chỉ có một tài khoản admin, tạo bằng lệnh trên máy chủ.</p>
      </form>

      {chonQuyen !== null && <MaTranQuyen nguoiDungId={chonQuyen} dong={() => setChonQuyen(null)} />}
    </div>
  );
}
