import { useEffect, useState } from 'react';
import { goiApi } from '../../api.js';
import { dungXacThuc } from '../../xac-thuc.jsx';

function TrangXinChao() {
  const { xuLyLoiApi } = dungXacThuc();
  const [loiChao, setLoiChao] = useState('Đang gọi máy chủ...');

  useEffect(() => {
    const huy = new AbortController();
    goiApi('/api/xin-chao', { huy: huy.signal })
      .then((du) => setLoiChao(du.loiChao))
      .catch((loi) => {
        if (loi.name !== 'AbortError') {
          setLoiChao(loi.message);
          xuLyLoiApi(loi);
        }
      });
    return () => huy.abort();
  }, [xuLyLoiApi]);

  return (
    <div>
      <h1>Xin chào</h1>
      <p>{loiChao}</p>
    </div>
  );
}

// Mo-dun giao dien tu khai bao muc menu va route cua minh.
export default {
  ten: 'xin-chao',
  menu: [{ id: 'xin-chao', nhan: 'Xin chào', duongDan: '/xin-chao', thuTu: 100 }],
  routes: [{ duongDan: '/xin-chao', phanTu: <TrangXinChao /> }],
};
