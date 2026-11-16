import { useCallback, useEffect, useState } from 'react';
import { goiApi } from '../../api.js';
import { dungXacThuc } from '../../xac-thuc.jsx';

const FORM_TRONG = { ma: '', ten: '', thu_tu: '', mau: '', tinh_la_vang: false, cho_dang_ky_truoc: false, cha_id: '' };

// Thu tu hien thi dang cay: cha truoc, con thut vao. Tra ve [{ ...muc, sau }]
function xepCay(ds) {
  const theoCha = new Map();
  for (const m of ds) {
    const k = m.cha_id && ds.some((x) => x.id === m.cha_id) ? m.cha_id : 0;
    if (!theoCha.has(k)) {
      theoCha.set(k, []);
    }
    theoCha.get(k).push(m);
  }
  const ketQua = [];
  const duyet = (k, sau) => {
    for (const m of theoCha.get(k) || []) {
      ketQua.push({ ...m, sau });
      duyet(m.id, sau + 1);
    }
  };
  duyet(0, 0);
  return ketQua;
}

export default function QuanLyDanhMuc() {
  const { nguoiDung, xuLyLoiApi } = dungXacThuc();
  const laAdmin = nguoiDung.loai === 'admin';
  const [cacLoai, setCacLoai] = useState([]);
  const [loai, setLoai] = useState('don_vi');
  const [du, setDu] = useState(null);
  const [form, setForm] = useState(FORM_TRONG);
  const [dangSua, setDangSua] = useState(null);
  const [suaForm, setSuaForm] = useState(FORM_TRONG);
  const [loi, setLoi] = useState('');
  const [thongBao, setThongBao] = useState('');

  const tai = useCallback(async () => {
    try {
      setDu(await goiApi('/api/danh-muc?loai=' + loai + '&tatCa=1'));
    } catch (e) {
      setLoi(e.message);
      xuLyLoiApi(e);
    }
  }, [loai, xuLyLoiApi]);

  useEffect(() => {
    if (laAdmin) {
      goiApi('/api/danh-muc/loai')
        .then((kq) => setCacLoai(kq.loai))
        .catch(() => setCacLoai([]));
    }
  }, [laAdmin]);
  useEffect(() => {
    if (laAdmin) {
      setDu(null);
      tai();
    }
  }, [laAdmin, tai]);

  if (!laAdmin) {
    return <h1>Chỉ tài khoản admin được quản lý danh mục</h1>;
  }

  async function lam(viec, ok) {
    setLoi('');
    setThongBao('');
    try {
      await viec();
      if (ok) {
        setThongBao(ok);
      }
      await tai();
    } catch (e) {
      setLoi(e.message);
      xuLyLoiApi(e);
    }
  }

  const choPhep = (kieu) => (du ? Boolean(du.loai[kieu]) : false);
  const ds = du ? (du.loai.cay ? xepCay(du.dong) : du.dong) : [];

  function them(suKien) {
    suKien.preventDefault();
    const body = { loai, ma: form.ma.trim(), ten: form.ten.trim() };
    if (form.thu_tu !== '') {
      body.thu_tu = Number(form.thu_tu);
    }
    if (form.mau) {
      body.mau = form.mau;
    }
    if (choPhep('coTinhLaVang')) {
      body.tinh_la_vang = form.tinh_la_vang;
    }
    if (choPhep('coDangKyTruoc')) {
      body.cho_dang_ky_truoc = form.cho_dang_ky_truoc;
    }
    if (form.cha_id) {
      body.cha_id = Number(form.cha_id);
    }
    lam(async () => {
      await goiApi('/api/danh-muc', { phuongThuc: 'POST', body });
      setForm(FORM_TRONG);
    }, 'Đã thêm "' + body.ten + '".');
  }

  function batDauSua(m) {
    setDangSua(m.id);
    setSuaForm({ ma: m.ma, ten: m.ten, thu_tu: String(m.thu_tu), mau: m.mau || '', tinh_la_vang: m.tinh_la_vang === 1, cho_dang_ky_truoc: m.cho_dang_ky_truoc === 1, cha_id: m.cha_id ? String(m.cha_id) : '', dang_dung: m.dang_dung === 1 });
    setLoi('');
  }

  function luuSua(m) {
    const body = { ten: suaForm.ten.trim(), thu_tu: Number(suaForm.thu_tu), dang_dung: suaForm.dang_dung };
    if (choPhep('coMau')) {
      body.mau = suaForm.mau || null;
    }
    if (choPhep('coTinhLaVang')) {
      body.tinh_la_vang = suaForm.tinh_la_vang;
    }
    if (choPhep('coDangKyTruoc')) {
      body.cho_dang_ky_truoc = suaForm.cho_dang_ky_truoc;
    }
    if (du.loai.cay) {
      body.cha_id = suaForm.cha_id ? Number(suaForm.cha_id) : null;
    }
    const baoVe = (du.loai.baoVe || []).includes(m.ma);
    if (baoVe) {
      delete body.dang_dung;
      delete body.tinh_la_vang;
      delete body.cho_dang_ky_truoc;
    }
    lam(async () => {
      await goiApi('/api/danh-muc/' + m.id, { phuongThuc: 'PUT', body });
      setDangSua(null);
    }, 'Đã lưu "' + body.ten + '".');
  }

  function xoa(m) {
    if (!window.confirm('Xóa "' + m.ten + '"? Nếu đã có hồ sơ dùng thì chỉ có thể chọn Ngừng dùng.')) {
      return;
    }
    lam(() => goiApi('/api/danh-muc/' + m.id, { phuongThuc: 'DELETE' }), 'Đã xóa "' + m.ten + '".');
  }

  return (
    <div>
      <h1>Danh mục</h1>
      <div className="cac-tab" role="tablist">
        {cacLoai.map((l) => (
          <button key={l.loai} role="tab" aria-selected={loai === l.loai} className={'tab' + (loai === l.loai ? ' tab-chon' : '')} onClick={() => { setLoai(l.loai); setDangSua(null); setLoi(''); setThongBao(''); }}>
            {l.nhan}
          </button>
        ))}
      </div>
      {loi && <div className="loi">{loi}</div>}
      {thongBao && <div className="thanh-cong">{thongBao}</div>}
      {!du && !loi && <p className="phu">Đang tải...</p>}
      {du && (
        <>
          <div className="cuon-ngang">
            <table className="bang">
              <thead>
                <tr>
                  <th>Tên</th>
                  <th>Mã</th>
                  <th>Thứ tự</th>
                  {choPhep('coMau') && <th>Màu</th>}
                  {choPhep('coTinhLaVang') && <th>Tính là vắng</th>}
                  {choPhep('coDangKyTruoc') && <th>Cho đăng ký trước (ngày tương lai)</th>}
                  {du.loai.cay && <th>Cấp trên</th>}
                  <th>Đang dùng</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {ds.map((m) =>
                  dangSua === m.id ? (
                    <tr key={m.id}>
                      <td>
                        <input value={suaForm.ten} onChange={(e) => setSuaForm({ ...suaForm, ten: e.target.value })} />
                      </td>
                      <td>{m.ma}</td>
                      <td>
                        <input className="o-so" value={suaForm.thu_tu} onChange={(e) => setSuaForm({ ...suaForm, thu_tu: e.target.value })} />
                      </td>
                      {choPhep('coMau') && (
                        <td>
                          <input type="color" value={suaForm.mau || '#757575'} onChange={(e) => setSuaForm({ ...suaForm, mau: e.target.value })} />
                        </td>
                      )}
                      {choPhep('coTinhLaVang') && (
                        <td>
                          <input type="checkbox" disabled={(du.loai.baoVe || []).includes(m.ma)} checked={suaForm.tinh_la_vang} onChange={(e) => setSuaForm({ ...suaForm, tinh_la_vang: e.target.checked })} />
                        </td>
                      )}
                      {choPhep('coDangKyTruoc') && (
                        <td>
                          <input type="checkbox" disabled={(du.loai.baoVe || []).includes(m.ma)} checked={suaForm.cho_dang_ky_truoc} onChange={(e) => setSuaForm({ ...suaForm, cho_dang_ky_truoc: e.target.checked })} />
                        </td>
                      )}
                      {du.loai.cay && (
                        <td>
                          <select value={suaForm.cha_id} onChange={(e) => setSuaForm({ ...suaForm, cha_id: e.target.value })}>
                            <option value="">(gốc)</option>
                            {xepCay(du.dong)
                              .filter((x) => x.id !== m.id)
                              .map((x) => (
                                <option key={x.id} value={x.id}>
                                  {'— '.repeat(x.sau) + x.ten}
                                </option>
                              ))}
                          </select>
                        </td>
                      )}
                      <td>
                        <input type="checkbox" disabled={(du.loai.baoVe || []).includes(m.ma)} checked={suaForm.dang_dung} onChange={(e) => setSuaForm({ ...suaForm, dang_dung: e.target.checked })} />
                      </td>
                      <td className="thao-tac">
                        <button className="nut" onClick={() => luuSua(m)}>
                          Lưu
                        </button>
                        <button className="nut nut-phu" onClick={() => setDangSua(null)}>
                          Hủy
                        </button>
                      </td>
                    </tr>
                  ) : (
                    <tr key={m.id} className={m.dang_dung === 1 ? '' : 'mo'}>
                      <td style={{ paddingLeft: 8 + (m.sau || 0) * 20 }}>{m.ten}</td>
                      <td>{m.ma}</td>
                      <td>{m.thu_tu}</td>
                      {choPhep('coMau') && (
                        <td>
                          {m.mau ? <span className="the-trang-thai" style={{ background: m.mau }}>{m.mau}</span> : ''}
                        </td>
                      )}
                      {choPhep('coTinhLaVang') && <td>{m.tinh_la_vang === 1 ? 'Có' : 'Không'}</td>}
                      {choPhep('coDangKyTruoc') && <td>{m.cho_dang_ky_truoc === 1 ? 'Có' : 'Không'}</td>}
                      {du.loai.cay && <td>{m.cha_id ? (du.dong.find((x) => x.id === m.cha_id) || {}).ten : ''}</td>}
                      <td>{m.dang_dung === 1 ? 'Có' : 'Ngừng dùng'}</td>
                      <td className="thao-tac">
                        <button className="nut nut-phu" onClick={() => batDauSua(m)}>
                          Sửa
                        </button>
                        {!(du.loai.baoVe || []).includes(m.ma) && (
                          <button className="nut nut-phu" onClick={() => xoa(m)}>
                            Xóa
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>

          <form className="hop-ngang" onSubmit={them}>
            <h2>Thêm vào "{du.loai.nhan}"</h2>
            <div className="luoi-nhap">
              <label>
                <span>Mã (chữ thường không dấu, số, _) *</span>
                <input value={form.ma} onChange={(e) => setForm({ ...form, ma: e.target.value })} />
              </label>
              <label>
                <span>Tên hiển thị *</span>
                <input value={form.ten} onChange={(e) => setForm({ ...form, ten: e.target.value })} />
              </label>
              <label>
                <span>Thứ tự</span>
                <input value={form.thu_tu} onChange={(e) => setForm({ ...form, thu_tu: e.target.value })} />
              </label>
              {choPhep('coMau') && (
                <label>
                  <span>Màu</span>
                  <input type="color" value={form.mau || '#757575'} onChange={(e) => setForm({ ...form, mau: e.target.value })} />
                </label>
              )}
              {choPhep('coTinhLaVang') && (
                <label className="o-tick">
                  <span>Tính là vắng</span>
                  <input type="checkbox" checked={form.tinh_la_vang} onChange={(e) => setForm({ ...form, tinh_la_vang: e.target.checked })} />
                </label>
              )}
              {choPhep('coDangKyTruoc') && (
                <label className="o-tick">
                  <span>Cho đăng ký trước (ngày tương lai)</span>
                  <input type="checkbox" checked={form.cho_dang_ky_truoc} onChange={(e) => setForm({ ...form, cho_dang_ky_truoc: e.target.checked })} />
                </label>
              )}
              {du.loai.cay && (
                <label>
                  <span>Cấp trên</span>
                  <select value={form.cha_id} onChange={(e) => setForm({ ...form, cha_id: e.target.value })}>
                    <option value="">(gốc)</option>
                    {xepCay(du.dong).map((x) => (
                      <option key={x.id} value={x.id}>
                        {'— '.repeat(x.sau) + x.ten}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
            <button className="nut" type="submit" disabled={!form.ma || !form.ten}>
              Thêm
            </button>
          </form>
        </>
      )}
    </div>
  );
}
