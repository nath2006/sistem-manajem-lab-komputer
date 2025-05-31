import React, { useState, useContext } from 'react';
import { 
  FaHouse,
  FaBars, 
  FaUser, 
  FaArrowRightFromBracket, 
  FaUserGear,
  FaRegNewspaper,
  FaRegCalendarDays, 
  FaRegCalendarCheck,
  FaLaptopFile,
  FaLaptopMedical,
  FaComputer  
} from 'react-icons/fa6';
import img from '../images/logo.png';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { post } from '../utils/api';
import { AuthContext } from '../Context/AuthContext';

// ... (ModalProfil dan definisi menu lainnya tetap sama) ...
const ModalProfil = ({ modal }) => {
    return (
        <div>
            {/* Modal profil content */}
        </div>
    );
};

const Dashboard = ({ title, children }) => {
    const navigate = useNavigate();
    const { state, dispatch } = useContext(AuthContext);

    const userName = state?.user || "User";
    const userRole = state?.role;

    const Logout = async () => {
        try {
            await post("/auth/logout");
            dispatch({ type: "LOGOUT" });
            localStorage.removeItem("token");
            localStorage.removeItem("userName");
            localStorage.removeItem("role");
            navigate("/");
        } catch (error) {
            console.error("Logout Error:", error);
        }
    };

    const menuKepalaLab = [
        { name: 'Dashboard', ic: <FaHouse />, to: '/home' },
        { name: 'Pengajuan Jadwal Lab', ic: <FaRegCalendarCheck />, to: '/ortu' },
        { name: 'Kelola Data Perangkat', ic: <FaLaptopFile />, to: '/siswa' },
    ];

    const menuKoordinatorLab = [
        { name: 'Dashboard', ic: <FaHouse />, to: '/home' },
        { name: 'Kelola Data Lab', ic: <FaComputer />, to: '/ortu' },
        { name: 'Kelola Pengumuman', ic: <FaRegNewspaper  />, to: '/siswa' },
    ];

    const menuTeknisi = [
        { name: 'Dashboard', ic: <FaHouse />, to: '/home' },
        { name: 'Perbaikan Perangkat', ic:  <FaLaptopMedical />, to: '/home' },
        { name: 'Pengecekan Perangkat', ic:  <FaLaptopMedical />, to: '/home' },
    ];

    const menuGuru = [
        { name: 'Dashboard', ic: <FaHouse />, to: '/registrator' },
        { name: 'Pengajuan Jadwal Lab', ic: <FaRegCalendarDays />, to: '/daftar-ulang' },
    ];

    const menuAdmin = [
        { name: 'Dashboard', ic: <FaHouse />, to: '/dashboard' },
        { type: 'divider' },
        { name: 'Pemeriksaan Perangkat', ic: <FaLaptopMedical />, to: '/ortu' },
        { name: 'Kelola Data Perangkat', ic: <FaLaptopFile />, to: '/siswa' },
        { type: 'divider' },
        { name: 'Data Lab', ic: <FaComputer />, to: '/medical' },
        { name: 'Jadwal lab', ic: <FaRegCalendarDays />, to: '/user' },
        { type: 'divider' },
        { name: 'Perbaikan Perangkat', ic:  <FaLaptopMedical />, to: '/logging' },
        { name: 'Pengecekan Perangkat', ic:  <FaLaptopMedical />, to: '/landing-page' },
        { type: 'divider' },
        { name: 'Kelola User', ic: <FaUserGear />, to: '/daftar-ulang' },
        { name: 'Kelola Pengumuman', ic: <FaRegNewspaper  />, to: '/daftar-ulang' },
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
        let day = date.getDate();
        let month = date.getMonth() + 1;
        let year = date.getFullYear();
        return `${day}-${month}-${year}`;
    }

    const [showProfile, setShowProfile] = useState(false);
    const [showYourProfile, setShowYourProfile] = useState(false);
    const [showSide, setShowSide] = useState(true);

    function handleSide() {
        setShowSide(!showSide);
    }

    // Tentukan lebar sidebar yang baru, misalnya w-72 atau w-80
    const sidebarWidthClass = 'w-72'; // atau 'w-80' jika perlu lebih lebar
    const mainContentMarginClass = 'lg:ml-72'; // sesuaikan dengan sidebarWidthClass

    return (
        <>
            <ModalProfil modal={{ showYourProfile, setShowYourProfile }} />
            <div>
                {/* ... (Navbar tetap sama) ... */}
                <nav className="fixed top-0 z-50 w-full h-[69px] bg-white border-b border-maroon">
                    <div className="h-full px-3 py-4 lg:px-5 lg:pl-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center justify-start lg:ps-1 rtl:justify-end">
                                <button
                                    className="inline-flex items-center p-2 text-sm rounded-lg text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200"
                                    onClick={handleSide}
                                >
                                    <FaBars />
                                </button>
                                <div className="ml-2 items-center hidden lg:flex">
                                    <img
                                        src={img}
                                        className="w-[32px] bg-white me-3"
                                        alt="Logo"
                                    />
                                    <span className="self-center text-xl font-bold text-gray-800 sm:text-2xl whitespace-nowrap">
                                        SMK LETRIS INDONESIA 2
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center">
                                <div className="flex items-center ms-3">
                                    <div>
                                        <button
                                            onClick={() => setShowProfile(!showProfile)}
                                            type="button"
                                            className="flex text-sm bg-gray-800 rounded-full focus:ring-4 focus:ring-gray-300"
                                        >
                                            <FaUser className="pt-2 w-8 h-8 rounded-full bg-white text-gray-400" />
                                        </button>
                                    </div>
                                    <div className={`${showProfile ? 'absolute block' : 'hidden'} w-[240px] z-50 my-4 text-base list-none bg-white divide-y divide-gray-800 rounded shadow right-4 top-12 border-[0.6px] border-gray-900`}>
                                        <div className="px-4 py-3">
                                            <p className="text-sm text-gray-900">{userName}</p>
                                            <p className="text-sm text-gray-600">{userRole || 'User'}</p>
                                        </div>
                                        <ul>
                                            <li
                                                className="flex items-center justify-between px-4 py-2 text-gray-700 cursor-pointer hover:text-white hover:bg-maroon"
                                                onClick={Logout}
                                            >
                                                <span className="block text-sm">Log out</span>
                                                <FaArrowRightFromBracket />
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </nav>


                <aside className={`${showSide ? sidebarWidthClass : 'w-0'} fixed top-0 left-0 z-40 h-screen transition-all duration-300 bg-gray-800 overflow-hidden border-r border-maroon`}>
                    <div className="min-h-full mt-1 px-4 pt-20 flex flex-col justify-between pb-4 overflow-y-auto bg-white ">
                        <ul className="pb-4 space-y-2 font-medium text-sm">
                            {data.map((item, index) => {
                                if (item.type === 'divider' && userRole === "Admin") {
                                    return <hr key={`divider-${index}`} className="my-2 border-gray-300" />;
                                }
                                if (item.to) {
                                    return (
                                        <li key={item.name || index} className='cursor-pointer'>
                                            <Link to={item.to}>
                                                <div className={`flex hover:shadow-lg hover:bg-white items-center gap-2 p-2 text-white rounded-lg group ${item.name === title ? 'shadow-lg py-2.5' : ''}`}>
                                                    <span className={`${item.name === title ? 'bg-maroon text-white' : 'bg-white text-gray-900'} flex items-center shadow-md justify-center p-3 transition group-hover:bg-maroon group-hover:text-white duration-75 rounded-lg`}>
                                                        {item.ic}
                                                    </span>
                                                    {/* Pastikan typo 'm7-3' menjadi 'ml-3' jika itu yang dimaksud */}
                                                    <span className={`${item.name === title ? 'text-black' : 'text-gray-600 group-hover:text-black'} font-medium ml-3`}>{item.name}</span>
                                                </div>
                                            </Link>
                                        </li>
                                    );
                                }
                                return null;
                            })}
                        </ul>
                        <div className="px-4 py-1 text-white bg-white rounded-lg">
                            <p className="font-bold text-center text-maroon">{tanggal()}</p>
                        </div>
                    </div>
                </aside>

                <div className={`p-4 mt-[69px] bg-neutral-100/20 transition-all duration-300 ${showSide ? mainContentMarginClass : 'ml-0'}`}>
                    <div className="border-gray-200 min-h-[620px]">
                        {children}
                    </div>
                </div>
            </div>
        </>
    );
};

export default Dashboard;
