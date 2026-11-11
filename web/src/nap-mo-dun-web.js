// nap-mo-dun-web.js: tu doc moi mo-dun giao dien trong web/src/modules/<ten>/index.jsx.
// Khung khong biet truoc ten mo-dun nao. Mo-dun xuat ra { ten, menu, routes }.
// Meo: doi ten thu muc thanh "_ten" de TAM TAT mo-dun.
const cacTep = import.meta.glob('./modules/*/index.jsx', { eager: true });

function kiemTra(mod, tenThuMuc) {
  if (!mod || typeof mod !== 'object') {
    throw new Error('index.jsx phai co "export default { ten, menu, routes }"');
  }
  if (mod.ten !== tenThuMuc) {
    throw new Error('"ten" (' + mod.ten + ') phai trung ten thu muc (' + tenThuMuc + ')');
  }
  if (!Array.isArray(mod.menu) || !Array.isArray(mod.routes)) {
    throw new Error('"menu" va "routes" phai la mang');
  }
}

export const dsMoDun = [];
export const dsLoi = [];

for (const [duongDan, tep] of Object.entries(cacTep)) {
  const tenThuMuc = duongDan.split('/')[2];
  if (tenThuMuc.startsWith('_')) {
    continue;
  }
  try {
    kiemTra(tep.default, tenThuMuc);
    dsMoDun.push(tep.default);
  } catch (loi) {
    console.error('[LOI] Mo-dun giao dien "' + tenThuMuc + '" bi loi, bo qua: ' + loi.message);
    dsLoi.push({ moDun: tenThuMuc, thongBao: loi.message });
  }
}

export const dsMenu = dsMoDun
  .flatMap((mod) => mod.menu.map((muc) => ({ ...muc, moDun: mod.ten })))
  .sort((a, b) => (a.thuTu ?? 999) - (b.thuTu ?? 999));

export const dsRoute = dsMoDun.flatMap((mod) => mod.routes);
