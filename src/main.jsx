import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import PricingPage from './pages/PricingPage.jsx';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

const router = createBrowserRouter([
  { path: '/', element: <App /> },
  { path: '/pricing', element: <PricingPage /> },
]);

createRoot(document.getElementById('root')).render(
  <RouterProvider router={router} />
);
