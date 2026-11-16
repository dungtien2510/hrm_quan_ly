import { useEffect, useRef, useState } from 'react';
import { Link, useBlocker, useNavigate, useParams } from 'react-router-dom';
import { goiApi } from '../../api.js';
import { dungXacThuc } from '../../xac-thuc.jsx';
import { GIA_TRI_LUA_CHON, QUAN_HE_THEO_NHOM, TRUONG } from '../../../../shared/truong-muc.js';
import { bieuMauSangCot, dongSangBieuMau } from '../../../../shared/bieu-mau.js';
import { ngayDuongLich } from '../../../../shared/ngay-chuoi.js';
import { NHAN_MUC, truongCua } from './hien-thi.jsx';

const CAC_TAB = [
  { ma: 'ai', nhan: 'A.I Sơ lược lý lịch' },
  { ma: 'aii', nhan: 'A.II Đặc điểm bản thân' },
  { ma: 'bi', nhan: 'B.I Gia đình bản thân' },
  { ma: 'bii', nhan: 'B.II Gia đình vợ/chồng' },
];
const MUC_TAB_AI = ['thong_tin_co_ban', 'lien_he', 'dac_diem_chinh_tri', 'so_dinh_danh', 'qua_trinh_cong_tac', 'dao_tao', 'luong', 'khen_thuong'];
const BANG_AII = [
  ['qua_trinh_truoc_tuyen_dung', 'Quá trình trước khi được tuyển dụng'],
  ['qua_trinh_cong_tac', 'Quá trình công tác'],
  ['dao_tao', 'Đào tạo, bồi dưỡng'],
  ['khen_thuong', 'Khen thưởng, danh hiệu thi đua'],
  ['ky_luat_tien_an_tien_su', 'Kỷ luật, tiền án, tiền sự'],
  ['luong', 'Quá trình lương'],
];
const BANG_CON = [...BANG_AII.map((b) => b[0]), 'than_nhan'];
const LOAI_DANH_MUC = [...new Set(TRUONG.filter((t) => t.danhMuc && t.danhMuc !== 'trang_thai').map((t) => t.danhMuc))];

const khoaLoi = (bang, chiSo, truong) => (bang === 'quan_nhan' ? 'quan_nhan.' + truong : bang + '#' + chiSo + '.' + truong);

// "than_nhan#2.ho_ten" -> { bang, chiSo: 2, truong: 'ho_ten' }
function tachKhoa(khoa) {
  const [dau, truong] = khoa.split('.');
  const [bang, chiSo] = dau.split('#');
  return { bang, chiSo: chiSo === undefined ? null : Number(chiSo), truong };
}

function bieuMauRong() {
  const bm = { quan_nhan: dongSangBieuMau('quan_nhan', {}) };
  for (const b of BANG_CON) {
    bm[b] = [];
  }
  return bm;
}

// Do sau cua mot muc trong cay (de thut dong khi hien danh sach don vi)
function doSau(ds, muc) {
  let sau = 0;
  let cur = muc;
  while (cur && cur.cha_id && sau < 20) {
    cur = ds.find((x) => x.id === cur.cha_id);
    sau += 1;
  }
  return sau;
}

function OTruong({ t, gia, doi, loi, luaChon }) {
  const nhan = t.hienThi + (t.batBuoc ? ' *' : '');
  let o;
  if (t.kieu === 'co_khong') {
    o = <input type="checkbox" checked={Boolean(gia)} onChange={(e) => doi(e.target.checked)} />;
  } else if (t.kieu === 'lua_chon') {
    o = (
      <select value={gia === null || gia === undefined ? '' : String(gia)} onChange={(e) => doi(e.target.value)}>
        <option value="">— chọn —</option>
        {luaChon.map((l) => (
          <option key={l.ma} value={String(l.ma)}>
            {l.nhan}
          </option>
        ))}
      </select>
    );
  } else {
    const goiY = t.kieu === 'ngay_du' ? 'dd/mm/yyyy' : t.kieu === 'ngay_thieu' ? 'dd/mm/yyyy hoặc mm/yyyy' : '';
    o = <input value={gia} placeholder={goiY} onChange={(e) => doi(e.target.value)} />;
  }
  return (
    <label className={(t.kieu === 'co_khong' ? 'o-tick ' : '') + (loi ? 'co-loi' : '')} data-truong={t.truong}>
      <span>{nhan}</span>
      {o}
      {loi && <span className="loi-truong">{loi}</span>}
    </label>
  );
}

export default function FormHoSo() {
  const { id } = useParams();
  const laSua = Boolean(id);
  const dieuHuong = useNavigate();
  const { nguoiDung, xuLyLoiApi } = dungXacThuc();
  const [bm, setBm] = useState(null);
  const [goc, setGoc] = useState('');
  const [phienBan, setPhienBan] = useState(1);
  const [danhMuc, setDanhMuc] = useState(null);
  const [tab, setTab] = useState('ai');
  const [loi, setLoi] = useState({});
  const [thongBaoLoi, setThongBaoLoi] = useState('');
  const [xungDot, setXungDot] = useState(null);
  const [dangLuu, setDangLuu] = useState(false);
  const [loiTai, setLoiTai] = useState('');
  const chanRoi = useRef(false);

  const dirty = bm !== null && JSON.stringify(bm) !== goc;
  chanRoi.current = dirty;

  // Chan roi trang khi con thay doi chua luu: nut Quay lai, bam menu... deu hoi truoc.
  const blocker = useBlocker(({ currentLocation, nextLocation }) => chanRoi.current && currentLocation.pathname !== nextLocation.pathname);
  useEffect(() => {
    if (blocker.state === 'blocked') {
      if (window.confirm('Bạn có thay đổi chưa lưu. Rời trang và bỏ các thay đổi này?')) {
        blocker.proceed();
      } else {
        blocker.reset();
      }
    }
  }, [blocker]);
  useEffect(() => {
    if (!dirty) {
      return undefined;
    }
    const chan = (suKien) => {
      suKien.preventDefault();
      suKien.returnValue = '';
    };
    window.addEventListener('beforeunload', chan);
    return () => window.removeEventListener('beforeunload', chan);
  }, [dirty]);

  // Nap danh muc (tat ca, ke ca muc ngung dung de ho so cu van hien dung ten) va du lieu ho so.
  useEffect(() => {
    let huy = false;
    async function nap() {
      try {
        const dsDm = await Promise.all(LOAI_DANH_MUC.map((l) => goiApi('/api/danh-muc?loai=' + l + '&tatCa=1')));
        const dm = Object.fromEntries(LOAI_DANH_MUC.map((l, i) => [l, dsDm[i].dong]));
        let bieuMau;
        let phienBanHienTai = 1;
        if (laSua) {
          const ho = await goiApi('/api/quan-nhan/' + id);
          const that = await goiApi('/api/quan-nhan/' + id + '/so-dinh-danh');
          bieuMau = { quan_nhan: dongSangBieuMau('quan_nhan', ho.quan_nhan) };
          // Chi lay cac truong cua muc so_dinh_danh tu API "hien so" (so day du); khong ghi de truong khac.
          const thatBm = dongSangBieuMau('quan_nhan', that.quan_nhan);
          for (const t of TRUONG.filter((x) => x.bang === 'quan_nhan' && x.muc === 'so_dinh_danh')) {
            bieuMau.quan_nhan[t.truong] = thatBm[t.truong];
          }
          for (const b of BANG_CON) {
            bieuMau[b] = (ho[b] || []).map((d) => {
              const dong = dongSangBieuMau(b, d);
              if (b === 'than_nhan') {
                const day = that.than_nhan.find((x) => x.id === d.id);
                dong.so_can_cuoc = day && day.so_can_cuoc ? day.so_can_cuoc : '';
              }
              return dong;
            });
          }
          phienBanHienTai = ho.quan_nhan.version;
        } else {
          bieuMau = bieuMauRong();
        }
        if (!huy) {
          setDanhMuc(dm);
          setBm(bieuMau);
          setGoc(JSON.stringify(bieuMau));
          setPhienBan(phienBanHienTai);
        }
      } catch (e) {
        if (!huy) {
          setLoiTai(e.message);
          xuLyLoiApi(e);
        }
      }
    }
    nap();
    return () => {
      huy = true;
    };
  }, [id, laSua, xuLyLoiApi]);

  if (nguoiDung.loai !== 'admin') {
    return <h1>Chỉ tài khoản admin được thêm hoặc sửa hồ sơ</h1>;
  }
  if (loiTai) {
    return (
      <div>
        <div className="loi">{loiTai}</div>
        <Link to="/quan-nhan">← Về danh sách</Link>
      </div>
    );
  }
  if (!bm || !danhMuc) {
    return <p className="phu">Đang tải...</p>;
  }

  const datQuanNhan = (truong, gt) => setBm({ ...bm, quan_nhan: { ...bm.quan_nhan, [truong]: gt } });
  const datDong = (bang, i, truong, gt) => {
    const ds = bm[bang].slice();
    ds[i] = { ...ds[i], [truong]: gt };
    setBm({ ...bm, [bang]: ds });
  };
  const themDong = (bang, them = {}) => setBm({ ...bm, [bang]: [...bm[bang], { ...dongSangBieuMau(bang, {}), ...them }] });
  const xoaDong = (bang, i) => setBm({ ...bm, [bang]: bm[bang].filter((_, j) => j !== i) });

  // Cac lua chon cua mot o chon (danh muc hoac gia tri co dinh)
  function luaChonCua(t, gia, dong) {
    if (t.danhMuc) {
      const ds = danhMuc[t.danhMuc] || [];
      return ds
        .filter((m) => m.dang_dung === 1 || String(m.id) === String(gia))
        .map((m) => ({ ma: m.id, nhan: '— '.repeat(doSau(ds, m)) + m.ten + (m.dang_dung === 1 ? '' : ' (ngừng dùng)') }));
    }
    const ds = GIA_TRI_LUA_CHON[t.bang + '.' + t.truong] || [];
    if (t.bang === 'than_nhan' && t.truong === 'quan_he') {
      return ds.filter((g) => (QUAN_HE_THEO_NHOM[dong.nhom] || []).includes(g.ma));
    }
    return ds;
  }

  function tabCuaLoi(khoa) {
    if (khoa.startsWith('quan_nhan.')) {
      return 'ai';
    }
    if (khoa.startsWith('than_nhan#')) {
      const i = Number(khoa.slice('than_nhan#'.length).split('.')[0]);
      return bm.than_nhan[i] && bm.than_nhan[i].nhom === 'vo_chong' ? 'bii' : 'bi';
    }
    return 'aii';
  }

  function kiemTraSom() {
    const ds = {};
    const tuyChon = { homNay: ngayDuongLich() }; // ngay o tuong lai bi tu choi (may chu cung kiem tra lai)
    for (const [k, v] of Object.entries(bieuMauSangCot('quan_nhan', bm.quan_nhan, tuyChon).loi)) {
      ds[khoaLoi('quan_nhan', null, k)] = v;
    }
    for (const bang of BANG_CON) {
      bm[bang].forEach((dong, i) => {
        for (const [k, v] of Object.entries(bieuMauSangCot(bang, dong, tuyChon).loi)) {
          ds[khoaLoi(bang, i, k)] = v;
        }
        if (bang === 'than_nhan' && dong.quan_he && !(QUAN_HE_THEO_NHOM[dong.nhom] || []).includes(dong.quan_he)) {
          ds[khoaLoi(bang, i, 'quan_he')] = 'Quan hệ này không dùng được trong nhóm này';
        }
      });
    }
    return ds;
  }

  async function luu(suKien) {
    suKien.preventDefault();
    setXungDot(null);
    setThongBaoLoi('');
    const ds = kiemTraSom();
    setLoi(ds);
    const khoa = Object.keys(ds);
    if (khoa.length > 0) {
      setThongBaoLoi('Còn ' + khoa.length + ' ô chưa hợp lệ (đánh dấu đỏ). Sửa rồi lưu lại.');
      setTab(tabCuaLoi(khoa[0]));
      return;
    }
    setDangLuu(true);
    try {
      const body = laSua ? { version: phienBan, ...bm } : bm;
      const kq = await goiApi(laSua ? '/api/quan-nhan/' + id : '/api/quan-nhan', { phuongThuc: laSua ? 'PUT' : 'POST', body });
      chanRoi.current = false; // da luu: khong chan chuyen trang nua
      dieuHuong('/quan-nhan/' + kq.id);
    } catch (e) {
      if (e.du && e.du.ma === 'XUNG_DOT_PHIEN_BAN') {
        setXungDot(e.du);
      } else if (e.du && e.du.ma === 'DU_LIEU_SAI' && e.du.chiTiet) {
        const moi = {};
        for (const c of e.du.chiTiet) {
          moi[khoaLoi(c.bang, c.dong, c.truong)] = c.thongBao;
        }
        setLoi(moi);
        setThongBaoLoi(e.message);
        setTab(tabCuaLoi(Object.keys(moi)[0]));
      } else {
        setThongBaoLoi(e.message);
        xuLyLoiApi(e);
      }
    } finally {
      setDangLuu(false);
    }
  }

  const demLoi = (tabMa) => Object.keys(loi).filter((k) => tabCuaLoi(k) === tabMa).length;

  // Mo ta ngan moi loi: "Tab: Ten truong (dong N): thong bao"
  function moTaLoi(khoa) {
    const { bang, chiSo, truong } = tachKhoa(khoa);
    const t = TRUONG.find((x) => x.bang === bang && x.truong === truong);
    const tenTab = CAC_TAB.find((x) => x.ma === tabCuaLoi(khoa)).nhan;
    return tenTab + ': ' + (t ? t.hienThi : truong) + (chiSo === null ? '' : ' (dòng ' + (chiSo + 1) + ')') + ' — ' + loi[khoa];
  }

  function phanDong(bang, tieuDe, chiSo, them = {}, boTruong = []) {
    return (
      <section className="phan" key={bang + tieuDe}>
        <h3>{tieuDe}</h3>
        {chiSo.length === 0 && <p className="phu">Chưa có dòng nào.</p>}
        {chiSo.map((i, thuTu) => (
          <div key={i} className="the-dong" data-dong={bang + '#' + i}>
            <div className="hang">
              <strong>Dòng {thuTu + 1}</strong>
              <button type="button" className="nut nut-phu" onClick={() => xoaDong(bang, i)}>
                Xóa dòng
              </button>
            </div>
            <div className="luoi-nhap">
              {truongCua(bang)
                .filter((t) => !boTruong.includes(t.truong))
                .map((t) => (
                  <OTruong key={t.truong} t={t} gia={bm[bang][i][t.truong]} doi={(g) => datDong(bang, i, t.truong, g)} loi={loi[khoaLoi(bang, i, t.truong)]} luaChon={luaChonCua(t, bm[bang][i][t.truong], bm[bang][i])} />
                ))}
            </div>
          </div>
        ))}
        <button type="button" className="nut nut-phu" onClick={() => themDong(bang, them)}>
          + Thêm dòng
        </button>
      </section>
    );
  }

  const chiSoThanNhan = (nhom) => bm.than_nhan.map((d, i) => (d.nhom === nhom ? i : -1)).filter((i) => i >= 0);

  return (
    <form onSubmit={luu} noValidate>
      <div className="hang tieu-de-trang">
        <h1>{laSua ? 'Sửa hồ sơ: ' + (bm.quan_nhan.ho_ten_khai_sinh || '') : 'Thêm hồ sơ quân nhân'}</h1>
        {dirty && <span className="the-vang">chưa lưu</span>}
      </div>
      <p className="phu">Ngày nhập dạng dd/mm/yyyy; ngày chỉ biết tháng/năm nhập mm/yyyy. Không nhập ngày ở tương lai (trừ "Đến tháng, năm" của đào tạo đang học). Ô có dấu * là bắt buộc.</p>

      {xungDot && (
        <div className="loi" role="alert">
          <strong>Xung đột phiên bản.</strong> {xungDot.loi}
          <div className="hang">
            <button
              type="button"
              className="nut"
              onClick={() => {
                chanRoi.current = false;
                window.location.reload();
              }}
            >
              Tải lại hồ sơ (bỏ thay đổi của tôi)
            </button>
          </div>
        </div>
      )}
      {thongBaoLoi && !xungDot && (
        <div className="loi">
          {thongBaoLoi}
          {Object.keys(loi).length > 0 && (
            <ul>
              {Object.keys(loi)
                .slice(0, 8)
                .map((k) => (
                  <li key={k}>{moTaLoi(k)}</li>
                ))}
            </ul>
          )}
        </div>
      )}

      <div className="cac-tab" role="tablist">
        {CAC_TAB.map((t) => (
          <button type="button" key={t.ma} role="tab" aria-selected={tab === t.ma} className={'tab' + (tab === t.ma ? ' tab-chon' : '')} onClick={() => setTab(t.ma)}>
            {t.nhan}
            {demLoi(t.ma) > 0 && <span className="the-do">{demLoi(t.ma)}</span>}
          </button>
        ))}
      </div>

      <div className="noi-dung-tab">
        {tab === 'ai' &&
          MUC_TAB_AI.map((ma) => (
            <section key={ma} className="phan">
              <h3>{NHAN_MUC[ma]}</h3>
              <div className="luoi-nhap">
                {truongCua('quan_nhan')
                  .filter((t) => t.muc === ma)
                  .map((t) => (
                    <OTruong key={t.truong} t={t} gia={bm.quan_nhan[t.truong]} doi={(g) => datQuanNhan(t.truong, g)} loi={loi[khoaLoi('quan_nhan', null, t.truong)]} luaChon={luaChonCua(t, bm.quan_nhan[t.truong], bm.quan_nhan)} />
                  ))}
              </div>
            </section>
          ))}
        {tab === 'aii' && BANG_AII.map(([bang, tieuDe]) => phanDong(bang, tieuDe, bm[bang].map((_, i) => i), bang === 'ky_luat_tien_an_tien_su' ? { loai: 'ky_luat' } : {}))}
        {tab === 'bi' && phanDong('than_nhan', 'Cha, mẹ, vợ/chồng, con, anh chị em ruột', chiSoThanNhan('ban_than'), { nhom: 'ban_than' }, ['nhom'])}
        {tab === 'bii' && phanDong('than_nhan', 'Cha, mẹ, anh chị em ruột của vợ/chồng', chiSoThanNhan('vo_chong'), { nhom: 'vo_chong' }, ['nhom'])}
      </div>

      <div className="hang thanh-luu">
        <button className="nut" type="submit" disabled={dangLuu}>
          {dangLuu ? 'Đang lưu...' : 'Lưu hồ sơ'}
        </button>
        <Link className="nut nut-phu" to={laSua ? '/quan-nhan/' + id : '/quan-nhan'}>
          Hủy
        </Link>
        {laSua && <span className="phu">Phiên bản đang sửa: {phienBan}. Trạng thái hằng ngày sửa ở trang chi tiết (tab A.II).</span>}
      </div>
    </form>
  );
}
