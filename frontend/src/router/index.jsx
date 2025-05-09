import { createBrowserRouter, redirect } from 'react-router-dom';
import LoginPage from '../pages/Login';
//import Dashboard from './pages/Dashboard';

const router = createBrowserRouter([
  {
    path: '/',
    loader: () => redirect('/login'),
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  // {
  //   path: '/dashboard',
  //   element: <Dashboard />,
  // },
]);

export default router;
