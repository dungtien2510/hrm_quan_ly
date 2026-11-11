import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import Khung from './khung.jsx';
import './style.css';

createRoot(document.getElementById('goc')).render(
  <StrictMode>
    <BrowserRouter>
      <Khung />
    </BrowserRouter>
  </StrictMode>
);
