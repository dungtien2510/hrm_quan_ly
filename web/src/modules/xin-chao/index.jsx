import { useEffect, useState } from 'react';

function TrangXinChao() {
  const [loiChao, setLoiChao] = useState('Đang gọi máy chủ...');

  useEffect(() => {
    const huy = new AbortController();
    fetch('/api/xin-chao', { signal: huy.signal })
      .then((phanHoi) => phanHoi.json())
      .then((du) => setLoiChao(du.loiChao))
      .catch((loi) => {
        if (loi.name !== 'AbortError') {
          setLoiChao('Không gọi được máy chủ');
        }
      });
    return () => huy.abort();
  }, []);

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
