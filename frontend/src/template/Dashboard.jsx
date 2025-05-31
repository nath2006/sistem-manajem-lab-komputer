import React, { useState, useContext } from 'react';
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
    FaChevronDown
} from 'react-icons/fa6';
import img from '../images/logo.png'; // Pastikan path ini benar
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { post } from '../utils/api'; // Pastikan path ini benar
import { AuthContext } from '../Context/AuthContext'; // Pastikan path ini benar

const ModalProfil = ({ modal }) => {
    return (
        <div>
            {/* Contoh: {modal.showYourProfile && <div>Konten Modal Profil Anda</div>} */}
        </div>
    );
};

const Dashboard = ({ title, children }) => {
    const navigate = useNavigate();
    const { state, dispatch } = useContext(AuthContext);

    const fullName = state?.fullName || state?.user || "User"; // Fallback ke state.user jika fullName tidak ada
    const userRole = state?.role;

    const Logout = async () => {
        try {
            await post("/auth/logout");
            dispatch({ type: "LOGOUT" });
            localStorage.removeItem("token");
            // Hapus item spesifik yang Anda set saat login dari localStorage
            localStorage.removeItem("fullName"); // Jika Anda menyimpannya
            localStorage.removeItem("user"); // Jika Anda menyimpannya
            localStorage.removeItem("role");
            navigate("/");
        } catch (error) {
            console.error("Logout Error:", error);
        }
    };

    // ... (definisi menuKepalaLab, menuKoordinatorLab, dst. tetap sama)
    const menuKepalaLab = [
        { name: 'Dashboard', ic: <FaHouse />, to: '/dashboard-kepala-lab' },
        { name: 'Pengajuan Jadwal Lab', ic: <FaRegCalendarCheck />, to: '/kepala-lab/pengajuan-jadwal' },
        { name: 'Kelola Data Perangkat', ic: <FaLaptopFile />, to: '/kepala-lab/kelola-perangkat' },
    ];

    const menuKoordinatorLab = [
        { name: 'Dashboard', ic: <FaHouse />, to: '/dashboard-koordinator-lab' },
        { name: 'Kelola Data Lab', ic: <FaComputer />, to: '/koordinator-lab/kelola-lab' },
        { name: 'Kelola Pengumuman', ic: <FaRegNewspaper />, to: '/koordinator-lab/kelola-pengumuman' },
    ];

    const menuTeknisi = [
        { name: 'Dashboard', ic: <FaHouse />, to: '/dashboard-teknisi' },
        { name: 'Perbaikan Perangkat', ic: <FaLaptopMedical />, to: '/teknisi/perbaikan' },
        { name: 'Pengecekan Perangkat', ic: <FaLaptopMedical />, to: '/teknisi/pengecekan' },
    ];

    const menuGuru = [
        { name: 'Dashboard', ic: <FaHouse />, to: '/dashboard-guru' },
        { name: 'Pengajuan Jadwal Lab', ic: <FaRegCalendarDays />, to: '/guru/pengajuan-jadwal' },
    ];

    const menuAdmin = [
        { name: 'Dashboard', ic: <FaHouse />, to: '/dashboard' },
        { type: 'divider' },
        { name: 'Pemeriksaan Perangkat', ic: <FaLaptopMedical />, to: '/admin/pemeriksaan-perangkat' },
        { name: 'Kelola Data Perangkat', ic: <FaLaptopFile />, to: '/admin/kelola-perangkat' },
        { type: 'divider' },
        { name: 'Data Lab', ic: <FaComputer />, to: '/admin/data-lab' },
        { name: 'Jadwal Lab', ic: <FaRegCalendarDays />, to: '/admin/jadwal-lab' },
        { type: 'divider' },
        { name: 'Perbaikan Perangkat', ic: <FaLaptopMedical />, to: '/admin/perbaikan-perangkat' },
        { name: 'Pengecekan Perangkat', ic: <FaLaptopMedical />, to: '/admin/pengecekan-perangkat' },
        { type: 'divider' },
        { name: 'Kelola User', ic: <FaUserGear />, to: '/admin/kelola-user' },
        { name: 'Kelola Pengumuman', ic: <FaRegNewspaper />, to: '/admin/kelola-pengumuman' },
        { type: 'divider' },
    ];

    let data = [];

    if (userRole === "Admin") {
        data = menuAdmin;
    } else if (userRole === "Guru") {
        data = menuGuru;
    } else if (userRole === "Kepala Lab") {
        data = menuKepalaLab;
    } else if (userRole === "Koordinator Lab") {
        data = menuKoordinatorLab;
    } else if (userRole === "Teknisi") {
        data = menuTeknisi;
    }


    function tanggal() {
        const date = new Date();
        const options = { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' };
        return new Intl.DateTimeFormat('id-ID', options).format(date);
    }

    const [showProfile, setShowProfile] = useState(false);
    const [showYourProfile, setShowYourProfile] = useState(false);
    const [showSide, setShowSide] = useState(true);

    function handleSide() {
        setShowSide(!showSide);
    }

    const sidebarWidthClass = 'w-72';
    const mainContentMarginClass = 'lg:ml-72';

    return (
        <>
            <ModalProfil modal={{ showYourProfile, setShowYourProfile }} />
            <div>
                <nav className="fixed top-0 z-50 w-full h-[69px] bg-white border-b border-maroon">
                    <div className="h-full px-3 py-4 lg:px-5 lg:pl-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center justify-start lg:ps-1 rtl:justify-end">
                                <button
                                    className="inline-flex items-center p-2 text-sm rounded-lg text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200"
                                    onClick={handleSide}
                                    aria-controls="logo-sidebar"
                                    aria-expanded={showSide}
                                >
                                    <span className="sr-only">Buka/tutup sidebar</span>
                                    <FaBars />
                                </button>
                                <div className="ml-2 items-center hidden lg:flex">
                                    <img
                                        src={img}
                                        className="w-[32px] me-3"
                                        alt="Logo SMK Letris Indonesia 2"
                                    />
                                    <span className="self-center text-xl font-bold text-gray-800 sm:text-2xl whitespace-nowrap">
                                        SMK LETRIS INDONESIA 2
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center">
                                <div className="relative flex items-center ms-3">
                                    <div>
                                        <button
                                            onClick={() => setShowProfile(!showProfile)}
                                            type="button"
                                            className="flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-maroon"
                                            id="user-menu-button"
                                            aria-expanded={showProfile}
                                            aria-haspopup="true"
                                        >
                                            <span className="sr-only">Buka menu pengguna</span>
                                            <span className='text-md'>{fullName}</span>
                                            <FaChevronDown className="ml-2 -mr-1 h-4 w-3 text-gray-900" aria-hidden="true" />
                                        </button>
                                    </div>
                                    {showProfile && (
                                        <div
                                            className="absolute origin-top-right right-0 mt-18 w-60 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50 hover:bg-maroon hover:text-white " // bg-white untuk dropdown, ring-black untuk border, hover:bg-maroon untuk efek hover
                                            // mt-18 diubah menjadi mt-2 agar lebih dekat dengan tombol
                                            role="menu"
                                            aria-orientation="vertical"
                                            aria-labelledby="user-menu-button"
                                            tabIndex="-1"
                                        >
                                             {/* Menghapus info user & role dari dropdown, bisa ditambahkan jika perlu */}
                                            <div className="py-1" role="none">
                                                <button
                                                    onClick={() => {
                                                        Logout();
                                                        setShowProfile(false);
                                                    }}
                                                    className="w-full text-left flex items-center justify-between px-4 py-2 text-sm text-gray-700 hover:text-white " // Tambahkan rounded-md jika ini satu-satunya item
                                                    role="menuitem"
                                                    tabIndex="-1"
                                                    id="user-menu-item-0"
                                                >
                                                    <span>Log out</span>
                                                    <FaArrowRightFromBracket className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </nav>

                
                <aside 
                    id="logo-sidebar" 
                    className={`${showSide ? sidebarWidthClass : 'w-0'} fixed top-0 left-0 z-40 h-screen pt-[69px] transition-transform ${showSide ? 'translate-x-0' : '-translate-x-full'} border-r border-maroon flex flex-col bg-white`} 
                    // bg-gray-800 diubah ke bg-white atau warna dasar sidebar jika semua child bg-white
                    aria-label="Sidebar"
                >
                    {/* Area untuk menu yang bisa di-scroll */}
                    <div className="flex-grow px-4 pt-4 overflow-y-auto custom-scrollbar"> {/* bg-white dihapus karena parent sudah bg-white, flex-grow agar mengambil sisa ruang */}
                        <ul className="pb-4 space-y-2 font-medium text-sm">
                            {data.map((item, index) => {
                                if (item.type === 'divider' && userRole === "Admin") {
                                    return <hr key={`divider-${index}`} className="my-2 border-gray-300" />;
                                }
                                if (item.to) {
                                    return (
                                        <li key={item.name || index} className='cursor-pointer'>
                                            <Link to={item.to} className="block">
                                                <div className={`flex hover:shadow-lg hover:bg-gray-50 items-center gap-2 p-2 text-gray-900 rounded-lg group ${item.name === title ? 'bg-gray-100 shadow-lg py-2.5' : 'hover:bg-gray-100'}`}>
                                                    <span className={`${item.name === title ? 'bg-maroon text-white' : 'bg-gray-100 text-gray-900 group-hover:bg-maroon group-hover:text-white'} flex items-center shadow-md justify-center p-3 transition-colors duration-150 rounded-lg`}>
                                                        {item.ic}
                                                    </span>
                                                    <span className={`${item.name === title ? 'text-maroon font-semibold' : 'text-gray-700 group-hover:text-gray-900'} font-medium ml-3 whitespace-nowrap`}>{item.name}</span>
                                                </div>
                                            </Link>
                                        </li>
                                    );
                                }
                                return null;
                            })}
                        </ul>
                    </div>

                    {/* Area untuk tanggal (selalu di bawah) */}
                    <div className="px-4 py-3 border-t border-gray-200"> 
                        {/* bg-white dihapus, rounded-lg dihapus jika tidak perlu */}
                        <p className="font-bold text-center text-maroon">{tanggal()}</p>
                    </div>
                </aside>

                <div className={`p-4 mt-[69px] bg-gray-50 transition-all duration-300 ${showSide ? mainContentMarginClass : 'ml-0'}`}>
                    <div className="bg-white p-4 rounded-lg shadow-sm min-h-[calc(100vh-69px-2rem)]"> {/* 2rem adalah p-4 atas & bawah pada parent */}
                        {children}
                    </div>
                </div>
            </div>
        </>
    );
};

export default Dashboard;
