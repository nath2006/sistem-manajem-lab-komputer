import React, { useContext, useState, useEffect } from "react";
import { Card } from "flowbite-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
// Menggunakan fungsi get dan post dari utils/api.js Anda
import { get, post } from "../../utils/api";
import Notification from "../../Components/Notification/Notif";
import { useNavigate } from "react-router-dom"; // useNavigate sudah diimpor
import { AuthContext } from "../../Context/AuthContext";
import useTitle from "../../utils/useTitle";

const LoginPage = () => {
  useTitle("Login - SIM Lab Komputer");

  const { state, dispatch } = useContext(AuthContext);
  const [form, setForm] = useState({ username: "", password: "" });
  const [errorMsg, setErrorMsg] = useState("");
  const navigate = useNavigate(); // useNavigate sudah diinisialisasi

  // State untuk pengumuman dinamis
  const [apiAnnouncements, setApiAnnouncements] = useState([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true);
  const [announcementError, setAnnouncementError] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  // Redirect if already authenticated
  useEffect(() => {
    if (state.isAuthenticated) {
      // Logika redirect berdasarkan role
      const rolePaths = {
        Admin: "/dashboard",
        Guru: "/dashboard-guru",
        "Kepala Lab": "/dashboard-kepala-lab",
        "Koordinator Lab": "/dashboard-koordinator-lab",
        Teknisi: "/dashboard-teknisi",
      };
      const path = rolePaths[state.role] || "/login"; // Default ke login jika role tidak cocok
      navigate(path);
    }
  }, [state.isAuthenticated, state.role, navigate]);

  // Fetch data pengumuman dari API menggunakan fungsi get dari utils/api.js
  useEffect(() => {
    const fetchAnnouncements = async () => {
      setLoadingAnnouncements(true);
      setAnnouncementError("");
      try {
        const result = await get("/pengumuman/"); 

        if (result && result.data && result.data.length > 0) {
          const formattedAnnouncements = result.data
            .filter(item => item.is_active === 1)
            .map(item => ({
              id: item.id,
              title: item.judul,
              date: new Date(item.created_at).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              }),
              content: item.content,
              filePath: item.file_path,
              image: "/assets/images/pengumuman.png",
            }));
          setApiAnnouncements(formattedAnnouncements);
        } else {
          setApiAnnouncements([]);
        }
      } catch (error) {
        console.error("Failed to fetch announcements:", error);
        const message = error?.message || error?.data?.message || "Gagal memuat pengumuman. Silakan coba lagi nanti.";
        setAnnouncementError(message);
        setApiAnnouncements([]);
      } finally {
        setLoadingAnnouncements(false);
      }
    };

    fetchAnnouncements();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    try {
      const response = await post("/auth/login", {
        username: form.username,
        password: form.password
      });

      if (response && response.data) {
        dispatch({
          type: "LOGIN_SUCCESS",
          payload: {
            userId: response.data.userId,
            username: response.data.username,
            fullName: response.data.fullName,
            role: response.data.role,
            lab_id_kepala: response.data.lab_id_kepala || null,
            token: response.data.token,
          },
        });
      } else {
        setErrorMsg("Format respons login tidak sesuai atau tidak ada data.");
      }
    } catch (err) {
        const message = err?.message || err?.data?.message || "Terjadi kesalahan saat login, Silakan coba lagi!";
        setErrorMsg(message);
        console.error("Login error:", err);
    }
  };

  const handleCloseError = () => {
    setErrorMsg("");
  };

  const announcementsToDisplay = apiAnnouncements;

  const nextSlide = () => {
    if (announcementsToDisplay.length === 0) return;
    setCurrentIndex((prevIndex) =>
      prevIndex === announcementsToDisplay.length - 1 ? 0 : prevIndex + 1
    );
  };

  const prevSlide = () => {
    if (announcementsToDisplay.length === 0) return;
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? announcementsToDisplay.length - 1 : prevIndex - 1
    );
  };

  useEffect(() => {
    if (announcementsToDisplay.length > 1) {
      const interval = setInterval(nextSlide, 5000);
      return () => clearInterval(interval);
    }
  }, [currentIndex, announcementsToDisplay.length]);

  const getCardPosition = (index) => {
    if (announcementsToDisplay.length === 0) return "hidden";
    const totalAnnouncements = announcementsToDisplay.length;
    const position = (index - currentIndex + totalAnnouncements) % totalAnnouncements;
    const maxVisibleCards = 3;

    if (position < maxVisibleCards) {
      switch (position) {
        case 0:
          return "z-30 top-0 opacity-100";
        case 1:
          return "z-20 top-4 transform scale-95 opacity-80";
        case 2:
          return "z-10 top-8 transform scale-90 opacity-60";
        default:
          return "hidden";
      }
    }
    return "hidden";
  };

  // Diubah untuk menggunakan navigate() untuk navigasi SPA
  const handleAnnouncementClick = (id) => {
    navigate(`/pengumuman/${id}`);
  };

  return (
    <div className="relative flex flex-col min-h-screen bg-gray-100">
      <div className="flex flex-col md:flex-row flex-1 mx-0">
        {/* Kolom Login */}
        {/* Dihapus 'justify-center' untuk alignment atas */}
        <div className="flex flex-col w-full md:w-1/2 lg:w-2/3 bg-white p-8 md:p-16 rounded-xl shadow-lg md:rounded-none md:shadow-none">
            {/* Wrapper untuk logo dan judul selamat datang agar bisa dikontrol padding/marginnya jika perlu */}
            <div> 
                <div className="headerWrapper flex flex-col items-start mb-4">
                    <div className="h-20 w-20 mr-4">
                    <img src="/assets/images/login/logo.png" alt="Logo SIM Lab Komputer" className="object-contain h-full w-full"/>
                    </div>
                    <h2 className="mt-4 text-lg md:text-2xl font-bold text-red-900 ">
                    Selamat Datang di Sistem Informasi Manajemen <br/>Laboratorium Komputer
                    </h2>
                </div>
                {/* Bagian teks Login di bawah header */}
                <div className="mb-8 text-left"> {/* mb-8 dari div sebelumnya dipindahkan kesini */}
                    <div className="mt-10">
                        <p className="text-gray-900 font-bold text-2xl">Login</p>
                        <p className="mt-1 text-gray-600">Lengkapi data berikut ini untuk masuk.</p>
                    </div>
                </div>
            </div>


          <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
            {errorMsg && (
              <Notification type="error" message={errorMsg} onClose={handleCloseError} />
            )}
            <div>
              <label
                htmlFor="login-username"
                className="block text-sm font-medium text-gray-700"
              >
                Username
              </label>
              <input
                id="login-username"
                type="text"
                name="username"
                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-red-500 focus:border-red-500"
                placeholder="Masukkan username Anda"
                value={form.username}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <label
                htmlFor="login-password"
                className="block text-sm font-medium text-gray-700"
              >
                Password
              </label>
              <input
                id="login-password"
                type="password"
                name="password"
                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-red-500 focus:border-red-500"
                placeholder="Masukkan password Anda"
                value={form.password}
                onChange={handleChange}
                required
              />
            </div>
            <button
              type="submit"
              className="w-full px-4 py-2 text-white bg-red-800 hover:bg-red-700 rounded-lg shadow focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
            >
              Masuk
            </button>
          </form>
        </div>

        {/* Kolom Pengumuman */}
        {/* Diubah 'items-center' menjadi 'items-start' untuk alignment atas */}
        <div className="flex md:w-1/2 bg-red-900 items-start p-6 md:p-12">
          <div className="flex flex-col gap-8 w-full">
            <div>
              <h1 className="text-3xl font-bold text-white">
                Pengumuman Terbaru
              </h1>
              <p className="text-white/90 mt-1">
                Update terbaru seputar penggunaan laboratorium komputer.
              </p>
            </div>

            <div className="relative h-[550px] md:h-[600px] w-full max-w-md mx-auto">
              {loadingAnnouncements && (
                <div className="absolute inset-0 flex items-center justify-center z-50">
                  <p className="text-white text-xl p-4 bg-black bg-opacity-50 rounded-lg">Memuat pengumuman...</p>
                </div>
              )}
              {!loadingAnnouncements && announcementError && (
                   <div className="absolute inset-0 flex items-center justify-center z-20 text-center p-4">
                    <Card className="!bg-white p-6 shadow-xl w-full">
                      <img src="/assets/images/pengumuman.png" alt="Error Memuat Pengumuman" className="w-24 h-24 mx-auto mb-3 opacity-70"/>
                      <h5 className="text-xl font-semibold text-red-700 mb-1">Oops! Terjadi Kesalahan</h5>
                      <p className="text-gray-600">{announcementError}</p>
                    </Card>
                  </div>
              )}
              {!loadingAnnouncements && !announcementError && announcementsToDisplay.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center z-20 text-center p-4">
                    <Card className="!bg-white p-6 shadow-xl w-full">
                        <img src="/assets/images/pengumuman.png" alt="Tidak ada pengumuman" className="w-24 h-24 mx-auto mb-3 opacity-70"/>
                        <h5 className="text-xl font-semibold text-gray-700">Belum Ada Pengumuman</h5>
                        <p className="text-gray-600 mt-1">Saat ini belum ada pengumuman terbaru yang aktif.</p>
                    </Card>
                </div>
              )}

              {announcementsToDisplay.length > 0 && announcementsToDisplay.map((item, index) => (
                <div
                  key={item.id}
                  className={`absolute w-full transition-all duration-500 ease-in-out ${getCardPosition(index)}`}
                >
                  <Card
                    className="flex flex-col h-[500px] md:h-[500px] cursor-pointer hover:shadow-2xl transition-shadow !bg-white mx-auto overflow-hidden" // Tinggi kartu tetap
                    onClick={() => handleAnnouncementClick(item.id)}
                  >
                    <img
                      src={item.image}
                      alt={`Pengumuman: ${item.title}`}
                      // Spasi ganda diperbaiki, styling lain tetap
                      className="w-full object-cover rounded-t-lg" 
                    />
                    <div className="p-4 flex flex-col flex-grow">
                      <h5 className="text-lg md:text-xl font-bold text-gray-800 line-clamp-2">
                        {item.title}
                      </h5>
                      <p className="text-xs md:text-sm text-gray-500 mt-1 mb-2">{item.date}</p>
                      <p className="text-sm text-gray-700 mt-1 line-clamp-5 md:line-clamp-6 flex-grow">
                        {item.content}
                      </p>
                    </div>
                  </Card>
                </div>
              ))}

              {announcementsToDisplay.length > 1 && (
                <>
                  <div className="absolute -bottom-2 md:bottom-0 left-0 right-0 flex justify-center px-4 z-40 space-x-20">
                    <button
                      onClick={prevSlide}
                      aria-label="Pengumuman Sebelumnya"
                      className="p-2 bg-white rounded-full shadow-md hover:bg-gray-200 transition-colors"
                    >
                      <ChevronLeft className="h-5 w-5 md:h-6 md:w-6 text-red-900" />
                    </button>
                    <button
                      onClick={nextSlide}
                      aria-label="Pengumuman Berikutnya"
                      className="p-2 bg-white rounded-full shadow-md hover:bg-gray-200 transition-colors"
                    >
                      <ChevronRight className="h-5 w-5 md:h-6 md:w-6 text-red-900" />
                    </button>
                  </div>
                  <div className="absolute bottom-10 md:bottom-12 left-0 right-0 flex justify-center gap-2 z-30">
                    {announcementsToDisplay.map((_, index) => (
                      <button
                        key={index}
                        aria-label={`Ke pengumuman ${index + 1}`}
                        onClick={() => setCurrentIndex(index)}
                        className={`w-2 h-2 md:w-2.5 md:h-2.5 rounded-full transition-all duration-300 ${
                          index === currentIndex ? "bg-white scale-125" : "bg-white/60 hover:bg-white/80"
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
