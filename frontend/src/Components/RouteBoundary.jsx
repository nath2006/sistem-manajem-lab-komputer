import { Component, Suspense } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import LoadingSkeleton from './Loading/Skeleton';

export class RouteErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      return <main role="alert" className="p-6 text-center space-y-4">
        <h1 className="text-xl font-semibold">Halaman belum dapat dimuat</h1>
        <p>Periksa koneksi Anda, lalu muat ulang untuk mengambil versi terbaru.</p>
        <button className="min-h-11 px-4 py-2 rounded bg-maroon text-white" onClick={() => window.location.reload()}>Muat ulang halaman</button>
        <Link className="block underline" to="/login">Kembali ke login</Link>
      </main>;
    }
    return this.props.children;
  }
}

export default function RouteBoundary() {
  const { pathname } = useLocation();
  return <RouteErrorBoundary key={pathname}>
    <Suspense fallback={<LoadingSkeleton label="Memuat halaman..." className="p-4 sm:p-6" />}>
      <Outlet />
    </Suspense>
  </RouteErrorBoundary>;
}
