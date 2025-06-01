import React, { useState, useContext } from "react";
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
  FaCalendarDay
} from "react-icons/fa6";
import img from "../images/logo.png"; // Pastikan path ini benar
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { post } from "../utils/api"; // Pastikan path ini benar
import { AuthContext } from "../Context/AuthContext"; // Pastikan path ini benar

const ModalProfil = ({ modal }) => {
  // Implementasi ModalProfil Anda jika ada, atau biarkan kosong jika belum
  return (
    <div>
      {/* Contoh: {modal.showYourProfile && <div>Konten Modal Profil Anda</div>} */}
    </div>
  );
};

const Dashboard = ({ title, children }) => {
  const navigate = useNavigate();
  const { state, dispatch } = useContext(AuthContext);

  const fullName = state?.fullName || "User";
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
    { name: "Dashboard", ic: <FaHouse />, to: "/dashboard-kepala-lab" },
    { type: "divider" },
    {
      name: "Pengajuan  Jadwal Lab",
      ic: <FaCalendarCheck />,
      to: "/kelola-jadwal-lab",
    },
    { name: "Jadwal Lab", 
      ic: < FaRegCalendarDays/>, 
      to: "/jadwal-lab" 
    },
        { type: "divider" },
    {
      name: "Pemeriksaan Perangkat",
      ic: <FaLaptopMedical />,
      to: "/kelola-pemeriksaan-perangkat",
    },
    {
      name: "Kelola Data Perangkat",
      ic: <FaLaptopFile />,
      to: "/kelola-perangkat",
    },
  ];

  const menuKoordinatorLab = [
    { name: "Dashboard", ic: <FaHouse />, to: "/dashboard-koordinator-lab" },
    { type: "divider" },
    {
      name: "Kelola Data Lab",
      ic: <FaComputer />,
      to: "/kelola/data-lab",
    },
    {
      name: "Kelola Pengumuman",
      ic: <FaRegNewspaper />,
      to: "/kelola-pengumuman",
    },
  ];

  const menuTeknisi = [
    { name: "Dashboard", ic: <FaHouse />, to: "/dashboard-teknisi" },
    { type: "divider" },
    {
      name: "Perbaikan Perangkat",
      ic: <FaLaptopMedical />,
      to: "/kelola-perbaikan",
    },
    {
      name: "Pengecekan Perangkat",
      ic: <FaLaptopMedical />,
      to: "/kelola-pengecekan",
    },
  ];

  const menuGuru = [
    { name: "Dashboard", ic: <FaHouse />, to: "/dashboard-guru" },
    { type: "divider" },
    {
      name: "Pengajuan Pengajuan Jadwal Lab",
      ic: <FaRegCalendarDays />,
      to: "/guru/pengajuan-jadwal",
    },
  ];

  const menuAdmin = [
    { name: "Dashboard", ic: <FaHouse />, to: "/dashboard" },
    { type: "divider" },
    {
      name: "Pemeriksaan Perangkat",
      ic: <FaLaptopMedical />,
      to: "/kelola-pemeriksaan-perangkat",
    },
    {
      name: "Kelola Data Perangkat",
      ic: <FaLaptopFile />,
      to: "/kelola-perangkat",
    },
    { name: "Pengajuan Jadwal Lab", ic: <FaRegCalendarCheck />, to: "/kelola-jadwal-lab" },
    { name: "Jadwal Lab", ic: < FaRegCalendarDays/>, to: "/jadwal-lab" },
    { type: "divider" },
    { name: "Data Lab", ic: <FaComputer />, to: "/kelola/data-lab" },
    {
      name: "Kelola Pengumuman",
      ic: <FaRegNewspaper />,
      to: "/kelola-pengumuman",
    },
    { type: "divider" },
    {
      name: "Perbaikan Perangkat",
      ic: <FaLaptopMedical />,
      to: "/kelola-perbaikan",
    },
    {
      name: "Pengecekan Perangkat",
      ic: <FaLaptopMedical />,
      to: "/kelola-pengecekan",
    },
    { type: "divider" },
    { name: "Kelola User", ic: <FaUserGear />, to: "/user" },
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
    const options = {
      day: "2-digit",
      month: "long",
      year: "numeric",
      timeZone: "Asia/Jakarta",
    };
    // Menggunakan toLocaleDateString untuk format yang lebih baik dan penanganan bulan
    return new Intl.DateTimeFormat("id-ID", options).format(date);
  }

  const [showProfile, setShowProfile] = useState(false);
  const [showYourProfile, setShowYourProfile] = useState(false); // Untuk ModalProfil jika digunakan
  const [showSide, setShowSide] = useState(true);

  function handleSide() {
    setShowSide(!showSide);
  }

  const sidebarWidthClass = "w-72"; // Lebar sidebar yang baru (misal: 18rem atau 288px)
  const mainContentMarginClass = "lg:ml-72"; // Margin konten utama disesuaikan

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
                  aria-controls="logo-sidebar" // Untuk aksesibilitas
                  aria-expanded={showSide} // Untuk aksesibilitas
                >
                  <span className="sr-only">Buka/tutup sidebar</span>
                  <FaBars />
                </button>
                <div className="ml-2 items-center hidden lg:flex">
                  <img
                    src={img}
                    className="w-[32px] me-3" // bg-white dihapus jika logo sudah transparan
                    alt="Logo SMK Letris Indonesia 2"
                  />
                  <span className="self-center text-xl font-bold text-gray-800 sm:text-2xl whitespace-nowrap">
                    SMK LETRIS INDONESIA 2
                  </span>
                </div>
              </div>

              <div className="flex items-center">
                <div className="relative flex items-center ms-3">
                  {" "}
                  {/* Tambahkan 'relative' */}
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
                      <span className="text-md">{fullName}</span>
                      <FaChevronDown
                        className="ml-2 -mr-1 h-4 w-3 text-gray-900"
                        aria-hidden="true"
                      />
                    </button>
                  </div>
                  {showProfile && (
                    <div
                      className="absolute origin-top-right right-0 mt-22 w-60 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50"
                      role="menu"
                      aria-orientation="vertical"
                      aria-labelledby="user-menu-button"
                      tabIndex="-1"
                    >
                      <div
                        className="py-1 hover:cursor-pointer hover:bg-maroon"
                        role="none"
                      >
                        <button
                          onClick={() => {
                            Logout();
                            setShowProfile(false); // Tutup dropdown setelah logout
                          }}
                          className="w-full text-left flex items-center justify-between px-4 py-2 text-sm text-gray-700 hover:text-white "
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
          className={`${
            showSide ? sidebarWidthClass : "w-0"
          } fixed top-0 left-0 z-40 h-screen pt-[69px] transition-transform ${
            showSide ? "translate-x-0" : "-translate-x-full"
          } bg-gray-800 overflow-hidden border-r border-maroon`}
          aria-label="Sidebar"
        >
          {/* Mengubah pt sedikit dan transisi, serta bg-gray-800 untuk area transisi */}
          {/* Tambahkan kelas custom-scrollbar jika Anda menambahkan CSS untuk itu */}
          <div className="h-full px-4 pb-4 pt-4 overflow-y-auto bg-white custom-scrollbar">
            <ul className="pb-4 space-y-2 font-medium text-sm">
              {data.map((item, index) => {
                if (item.type === "divider") {
                  return (
                    <hr
                      key={`divider-${index}`}
                      className="my-2 border-gray-300"
                    />
                  );
                }
                if (item.to) {
                  return (
                    <li key={item.name || index} className="cursor-pointer">
                      <Link to={item.to} className="block">
                        {" "}
                        {/* Link sebagai block untuk area klik penuh */}
                        <div
                          className={`flex hover:shadow-lg hover:bg-gray-50 items-center gap-2 p-2 text-gray-900 rounded-lg group ${
                            item.name === title
                              ? "bg-gray-100 shadow-lg py-2.5"
                              : "hover:bg-gray-100"
                          }`}
                        >
                          {/* Perubahan warna dasar dan hover */}
                          <span
                            className={`${
                              item.name === title
                                ? "bg-maroon text-white"
                                : "bg-gray-100 text-gray-900 group-hover:bg-maroon group-hover:text-white"
                            } flex items-center shadow-md justify-center p-3 transition-colors duration-150 rounded-lg`}
                          >
                            {item.ic}
                          </span>
                          <span
                            className={`${
                              item.name === title
                                ? "text-maroon font-semibold"
                                : "text-gray-700 group-hover:text-gray-900"
                            } font-medium ml-3 whitespace-nowrap`}
                          >
                            {item.name}
                          </span>
                        </div>
                      </Link>
                    </li>
                  );
                }
                return null;
              })}
            </ul>
            <div className="mt-auto px-4 py-2 bg-white rounded-lg border-t border-gray-200">
              {" "}
              {/* mt-auto untuk mendorong ke bawah */}
              <p className="font-bold text-center text-maroon">{tanggal()}</p>
            </div>
          </div>
        </aside>

        <div
          className={`p-4 mt-[69px] bg-gray-50 transition-all duration-300 ${
            showSide ? mainContentMarginClass : "ml-0"
          }`}
        >
          {/* Ganti bg-neutral-100/20 menjadi bg-gray-50 atau warna netral lain */}
          <div className="bg-white ">
            {/* Tambah padding, bg-white, dan shadow untuk area konten jika diinginkan */}
            {children}
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
