import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import PricingPage from './pages/PricingPage.jsx';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

// GitHub Pages deploys to /trading-backtest/ subpath
// Use basename (without trailing slash) so React Router prepends it to routes
const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || undefined;

const router = createBrowserRouter(
  [
    { path: '/', element: <App /> },
    { path: '/pricing', element: <PricingPage /> },
  ],
  { basename }
);

createRoot(document.getElementById('root')).render(
  <RouterProvider router={router} />
);