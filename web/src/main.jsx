import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import Khung from './khung.jsx';
import './style.css';

// Dung "data router" de co the chan roi trang khi form con thay doi chua luu (useBlocker).
// Moi duong dan do Khung tu xu ly bang <Routes> (cac mo-dun khai bao route cua minh).
const router = createBrowserRouter([{ path: '*', element: <Khung /> }]);

createRoot(document.getElementById('goc')).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
