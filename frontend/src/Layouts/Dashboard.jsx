import React, { useState, useContext, useEffect, useRef } from 'react';
import {
  FaHouse,
  FaBars,
  FaArrowRightFromBracket,
  FaUserGear,
  FaRegNewspaper,
  FaRegCalendarDays,
  FaRegCalendarCheck,
  FaLaptopFile,
  FaLaptopMedical,
  FaComputer,
  FaChevronDown,
  FaCalendarCheck,
} from 'react-icons/fa6';
import img from '../assets/DUMMY-LOGO.png';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { post } from '../utils/api';
import { AuthContext } from '../Context/AuthContext';
import { useSettings } from '../Context/SettingsContext';
import useDialog from '../utils/useDialog';
import useMediaQuery from '../utils/useMediaQuery';
import { DashboardContext } from '../Context/DashboardContext';

const dateFormatter = new Intl.DateTimeFormat('id-ID', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
  timeZone: 'Asia/Jakarta',
});

export const DashboardShell = ({ title, children, onReplayOnboarding }) => {
  const navigate = useNavigate();
  const { state, dispatch } = useContext(AuthContext);
  const { settings, logoSrc } = useSettings();

  const fullName = state?.fullName || 'User';
  const userRole = state?.role;

  const Logout = async () => {
    try {
      await post('/auth/logout');
      dispatch({ type: 'LOGOUT' });
      localStorage.removeItem('token');
      localStorage.removeItem('userName');
      localStorage.removeItem('role');
      navigate('/');
    } catch (error) {
      console.error('Logout Error:', error);
    }
  };

  const menuKepalaLab = [
    { name: 'Dashboard', ic: <FaHouse />, to: '/dashboard-kepala-lab' },
    { type: 'divider' },
    {
      name: 'Pengajuan  Jadwal Lab',
      ic: <FaCalendarCheck />,
      to: '/kelola-jadwal-lab',
    },
    { name: 'Jadwal Lab', ic: <FaRegCalendarDays />, to: '/jadwal-lab' },
    { type: 'divider' },
    {
      name: 'Pemeriksaan Perangkat',
      ic: <FaLaptopMedical />,
      to: '/kelola-pemeriksaan-perangkat',
    },
    {
      name: 'Kelola Data Perangkat',
      ic: <FaLaptopFile />,
      to: '/kelola-perangkat',
    },
  ];

  const menuKoordinatorLab = [
    { name: 'Dashboard', ic: <FaHouse />, to: '/dashboard-koordinator-lab' },
    { type: 'divider' },
    {
      name: 'Kelola Data Lab',
      ic: <FaComputer />,
      to: '/kelola/data-lab',
    },
    {
      name: 'Kelola Pengumuman',
      ic: <FaRegNewspaper />,
      to: '/kelola-pengumuman',
    },
  ];

  const menuTeknisi = [
    { name: 'Dashboard', ic: <FaHouse />, to: '/dashboard-teknisi' },
    { type: 'divider' },
    {
      name: 'Perbaikan Perangkat',
      ic: <FaLaptopMedical />,
      to: '/kelola-perbaikan',
    },
    {
      name: 'Pengecekan Perangkat',
      ic: <FaLaptopMedical />,
      to: '/kelola-pengecekan',
    },
  ];

  const menuGuru = [
    { name: 'Dashboard', ic: <FaHouse />, to: '/dashboard-guru' },
    { type: 'divider' },
    {
      name: 'Pengajuan  Jadwal Lab',
      ic: <FaCalendarCheck />,
      to: '/pengajuan-jadwal-lab',
    },
    {
      name: 'Cek Status Pengajuan Jadwal ',
      ic: <FaCalendarCheck />,
      to: '/pengajuan-jadwal-lab/status',
    },
    { name: 'Jadwal Lab', ic: <FaRegCalendarDays />, to: '/jadwal-lab' },
  ];

  const menuAdmin = [
    { name: 'Dashboard', ic: <FaHouse />, to: '/dashboard' },
    { type: 'divider' },
    {
      name: 'Pemeriksaan Perangkat',
      ic: <FaLaptopMedical />,
      to: '/kelola-pemeriksaan-perangkat',
    },
    {
      name: 'Kelola Data Perangkat',
      ic: <FaLaptopFile />,
      to: '/kelola-perangkat',
    },
    {
      name: 'Pengajuan Jadwal Lab',
      ic: <FaRegCalendarCheck />,
      to: '/kelola-jadwal-lab',
    },
    { name: 'Jadwal Lab', ic: <FaRegCalendarDays />, to: '/jadwal-lab' },
    { type: 'divider' },
    { name: 'Data Lab', ic: <FaComputer />, to: '/kelola/data-lab' },
    {
      name: 'Kelola Pengumuman',
      ic: <FaRegNewspaper />,
      to: '/kelola-pengumuman',
    },
    { type: 'divider' },
    {
      name: 'Perbaikan Perangkat',
      ic: <FaLaptopMedical />,
      to: '/kelola-perbaikan',
    },
    {
      name: 'Pengecekan Perangkat',
      ic: <FaLaptopMedical />,
      to: '/kelola-pengecekan',
    },
    { type: 'divider' },
    { name: 'Kelola User', ic: <FaUserGear />, to: '/user' },
    { name: 'Pengaturan Sistem', ic: <FaUserGear />, to: '/pengaturan' },
    { name: 'Log Aktivitas', ic: <FaRegCalendarCheck />, to: '/log-aktivitas' },
  ];

  let data = [];

  if (userRole === 'Admin') {
    data = menuAdmin;
  } else if (userRole === 'Guru') {
    data = menuGuru;
  } else if (userRole === 'Kepala Lab') {
    data = menuKepalaLab;
  } else if (userRole === 'Koordinator Lab') {
    data = menuKoordinatorLab;
  } else if (userRole === 'Teknisi') {
    data = menuTeknisi;
  }

  if (!data.some((item) => item.to === '/ticketing')) {
    data = [
      ...data,
      { name: 'Tiket Layanan', ic: <FaLaptopMedical />, to: '/ticketing' },
    ];
  }

  const location = useLocation();
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopExpanded, setDesktopExpanded] = useState(true);
  const [showProfile, setShowProfile] = useState(false);
  const [tour, setTour] = useState(null);
  useEffect(() => {
    const coordinate = event => {
      setTour(event.detail ? { sidebar: event.detail.sidebar } : null);
      if (event.detail) setShowProfile(false);
    };
    document.addEventListener('lab:tour-shell', coordinate);
    return () => document.removeEventListener('lab:tour-shell', coordinate);
  }, []);
  const profileRef = useRef(null);
  const sidebarRef = useDialog(mobileOpen && !isDesktop && !tour, () =>
    setMobileOpen(false)
  );
  const sidebarExpanded = tour ? tour.sidebar : (isDesktop ? desktopExpanded : mobileOpen);

  useEffect(() => {
    setMobileOpen(false);
    setShowProfile(false);
  }, [location.pathname, isDesktop]);
  useEffect(() => {
    if (!showProfile) return;
    const closeOutside = (event) => {
      if (!profileRef.current?.contains(event.target)) setShowProfile(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setShowProfile(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [showProfile]);

  const toggleSidebar = () => {
    if (isDesktop) setDesktopExpanded((value) => !value);
    else setMobileOpen((value) => !value);
  };

  return (
    <div data-tour-running={tour ? "true" : undefined} className="min-h-dvh min-w-0 bg-gray-50">
      <a
        href="#dashboard-content"
        className="sr-only focus:not-sr-only fixed left-3 top-3 z-[70] rounded-lg bg-maroon p-3 text-white"
      >
        Lewati navigasi
      </a>
      <nav
        aria-label="Navigasi akun"
        className="fixed inset-x-0 top-0 z-50 h-[69px] min-w-0 border-b border-maroon bg-white px-3 sm:px-5"
      >
        <div className="flex h-full min-w-0 items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <button
              type="button"
              className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-gray-600 hover:bg-maroon/10 focus-visible:ring-2 focus-visible:ring-maroon"
              onClick={toggleSidebar}
              aria-controls="logo-sidebar"
              aria-expanded={sidebarExpanded}
            >
              <span className="sr-only">Buka/tutup sidebar</span>
              <FaBars aria-hidden="true" />
            </button>
            <div className="flex min-w-0 items-center gap-2">
              <img
                src={logoSrc || settings.logo_url || img}
                className="h-8 w-8 shrink-0 object-contain"
                alt={`Logo ${settings.school_name}`}
              />
              <span className="truncate text-sm font-bold text-gray-800 sm:text-lg lg:text-xl">
                {settings.school_name}
              </span>
            </div>
          </div>
          <div ref={profileRef} className="relative min-w-0 shrink-0">
            <button
              onClick={() => setShowProfile((value) => !value)}
              type="button"
              className="flex min-h-11 min-w-11 items-center gap-2 rounded-md px-2 py-2 text-sm font-medium text-gray-700 hover:bg-maroon/10 focus-visible:ring-2 focus-visible:ring-maroon sm:px-3"
              data-tour="profile"
              id="user-menu-button"
              aria-expanded={showProfile}
              aria-haspopup="menu"
            >
              <span className="sr-only">Buka menu pengguna </span>
              <span className="max-w-[25vw] truncate sm:max-w-[180px] lg:max-w-[240px]">
                {fullName}
              </span>
              <FaChevronDown className="h-3 w-3 shrink-0" aria-hidden="true" />
            </button>
            {showProfile && (
              <div
                className="absolute right-0 top-full mt-2 w-60 max-w-[calc(100vw-2rem)] rounded-lg bg-white p-1 shadow-lg ring-1 ring-gray-200"
                role="menu"
                aria-labelledby="user-menu-button"
              >
                {onReplayOnboarding && <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setShowProfile(false);
                    onReplayOnboarding();
                  }}
                  className="flex min-h-11 w-full items-center rounded-md px-4 py-2 text-sm text-gray-700 hover:bg-maroon/10 hover:text-maroon focus-visible:ring-2 focus-visible:ring-maroon"
                >Panduan awal</button>}
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    Logout();
                    setShowProfile(false);
                  }}
                  className="flex min-h-11 w-full items-center justify-between rounded-md px-4 py-2 text-sm text-gray-700 hover:bg-maroon/10 hover:text-maroon"
                >
                  <span>Log out</span>
                  <FaArrowRightFromBracket aria-hidden="true" />
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {mobileOpen && !isDesktop && !tour && (
        <button
          type="button"
          tabIndex={-1}
          aria-label="Tutup menu navigasi"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
        />
      )}
      <aside
        ref={sidebarRef}
        id="logo-sidebar"
        role={mobileOpen && !isDesktop && !tour ? 'dialog' : undefined}
        aria-modal={mobileOpen && !isDesktop && !tour ? true : undefined}
        aria-label="Navigasi utama"
        aria-hidden={!sidebarExpanded}
        inert={!sidebarExpanded}
        tabIndex={-1}
        data-dialog-root={mobileOpen && !isDesktop && !tour ? 'true' : undefined}
        className={`fixed inset-y-0 left-0 z-40 w-72 max-w-[calc(100vw-3rem)] border-r border-maroon bg-white pt-[69px] outline-none transition-transform duration-200 motion-reduce:transition-none lg:max-w-none ${sidebarExpanded ? 'translate-x-0 lg:translate-x-0' : '-translate-x-full lg:-translate-x-full'}`}
      >
        <div className="flex h-full min-h-0 flex-col">
          <div className="flex shrink-0 items-center justify-between border-b px-4 py-2 lg:hidden">
            <strong className="text-sm text-maroon">
              {userRole || 'Menu'}
            </strong>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Tutup navigasi"
              className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-2xl text-maroon hover:bg-maroon/10"
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
          <ul data-tour-scroll="sidebar" className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain px-3 py-4 text-sm font-medium custom-scrollbar">
            {data.map((item, index) => {
              if (item.type === 'divider')
                return (
                  <li
                    key={`divider-${index}`}
                    role="separator"
                    className="my-2 border-t border-gray-200"
                  />
                );
              if (!item.to) return null;
              const active = location.pathname === item.to;
              return (
                <li key={item.to}>
                  <Link
                    data-tour-path={item.to}
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                    aria-current={active ? 'page' : undefined}
                    className={`group flex min-h-11 items-center gap-3 rounded-lg p-2 focus-visible:ring-2 focus-visible:ring-maroon ${active ? 'bg-maroon/10 text-maroon' : 'text-gray-700 hover:bg-maroon/5'}`}
                  >
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors ${active ? 'bg-maroon text-white' : 'bg-gray-100 text-gray-700 group-hover:bg-maroon/10 group-hover:text-maroon'}`}
                    >
                      {item.ic}
                    </span>
                    <span className="min-w-0 break-words">{item.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="shrink-0 border-t border-gray-200 px-4 py-3 pb-[max(.75rem,env(safe-area-inset-bottom))]">
            <p className="text-center text-sm font-semibold text-maroon">
              {dateFormatter.format(new Date())}
            </p>
          </div>
        </div>
      </aside>
      <main
        id="dashboard-content"
        aria-label={title}
        tabIndex={-1}
        inert={mobileOpen && !isDesktop && !tour}
        className={`min-h-dvh min-w-0 px-3 pb-6 pt-[85px] outline-none transition-[margin] duration-200 motion-reduce:transition-none sm:px-6 ${desktopExpanded ? 'lg:ml-72' : ''}`}
      >
        <div className="min-w-0"><h1 data-tour="content" className="mb-4 text-xl font-semibold text-gray-900">{title}</h1>{children}</div>
      </main>
    </div>
  );
};

function DashboardContent({ title, children }) {
  const { setTitle } = useContext(DashboardContext);
  useEffect(() => { setTitle(title || 'Dashboard'); }, [title, setTitle]);
  return children;
}

export default function Dashboard(props) {
  const shell = useContext(DashboardContext);
  return shell ? <DashboardContent {...props} /> : <DashboardShell {...props} />;
}
