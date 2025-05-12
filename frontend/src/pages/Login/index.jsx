import React,{useState,useEffect} from "react";
import { Card } from "flowbite-react";

import { Newspaper, ChevronLeft, ChevronRight } from "lucide-react";


const LoginPage = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const announcements = [
    {
      id: 1,
      title: "Jadwal Blok Penggunaan Lab 1,2,3 dan 4",
      date: "21 Juni 2025",
      content: "Berikut jadwal blok penggunaan lab untuk minggu depan. Harap diperhatikan.",
      image: "/assets/images/pengumuman.png"
    },
    {
      id: 2,
      title: "Pemeliharaan Rutin Lab Komputer",
      date: "15 Juni 2025",
      content: "Akan dilakukan pemeliharaan rutin pada semua lab komputer setiap hari Sabtu.",
      image: "/assets/images/pengumuman.png"
    },
    {
      id: 3,
      title: "Pelatihan Software Baru",
      date: "10 Juni 2025",
      content: "Pelatihan software terbaru akan dilaksanakan untuk semua pengguna lab.",
      image: "/assets/images/pengumuman.png"
    }
  ];
const nextSlide = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === announcements.length - 1 ? 0 : prevIndex + 1
    );
  };

  const prevSlide = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === 0 ? announcements.length - 1 : prevIndex - 1
    );
  };

  // Auto slide setiap 5 detik
  useEffect(() => {
    const interval = setInterval(() => {
      nextSlide();
    }, 5000);
    return () => clearInterval(interval);
  }, [currentIndex]);

  // Fungsi untuk menentukan posisi card pada desktop
  const getCardPosition = (index) => {
    const position = (index - currentIndex + announcements.length) % announcements.length;
    
    switch(position) {
      case 0: return 'z-30 top-0 left-0 right-0 opacity-100';
      case 1: return 'z-20 top-4 left-4 right-4 opacity-80';
      case 2: return 'z-10 top-8 left-8 right-8 opacity-60';
      default: return 'hidden';
    }
  };
  return (
    <div className="relative flex flex-col min-h-screen bg-gray-100">
     
      <div className="flex flex-col md:flex-row flex-1 mx-0">
        <div className="flex flex-col w-full  md:w-1/2 lg:w-2/3 bg-white p-8 md:p-16 justifyrounded-xl shadow-lg md:rounded-none md:shadow-none">
          <div className="mb-8 text-left">
            <div className="headerWrapper align-start">
              <div className="h-24 w-24 mb-4">
                <img src="/assets/images/login/logo.png" alt="" />
              </div>
              <h2 className="text-base md:text-xl font-bold text-red-900 max-w-lg">
                Selamat Datang di Sistem Informasi Manajemen Laboratorium
                Komputer
              </h2>
            </div>
            <div className="mt-12">
              <p className="mt-2 text-gray-900 font-bold text-2xl">Login</p>
              <p className="mt-2 text-gray-600">Lengkapi data berikut ini !</p>
            </div>
          </div>

          <form className="space-y-4 max-w-lg">
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
                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="jhondeo123"
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
                placeholder="············"
              />
            </div>

            <button
              type="button"
              className="w-full px-4 py-2 text-white bg-red-800 hover:bg-red-700 rounded-lg shadow focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
            >
              Masuk
            </button>
          </form>
        </div>

        <div className="flex md:w-1/2 bg-red-900 items-center p-6 md:p-12">
          <div className="flex flex-col gap-8 w-full">
              <div>
                <h1 className="text-3xl font-bold text-white">Pengumuman Terbaru</h1>
                <p className="text-white/90 mt-1">Update terbaru penggunaan laboratorium komputer</p>
              </div>
              
              <div className="relative h-[600px] w-full md:w-lg">
                {announcements.map((item, index) => (
                  <div 
                    key={item.id}
                    className={`absolute transition-all duration-500 ease-in-out ${getCardPosition(index)}`}
                    onClick={() => setCurrentIndex(index)}
                  >
                    <Card className="flex md:w-md cursor-pointer hover:shadow-xl transition-shadow !bg-white">
                      <img 
                        src={item.image} 
                        alt="Pengumuman" 
                        className="w-md h-58 md:h-70 object-left- rounded-t-lg"
                      />
                      <div className="p-4">
                        <h5 className="text-xl font-bold text-gray-">{item.title}</h5>
                        <p className="text-sm text-gray-600 mt-1">{item.date}</p>
                        <p className="text-gray-700 mt-2 line-clamp-3">
                          {item.content}
                        </p>
                      </div>
                    </Card>
                  </div>
                ))}

                {/* Navigation Buttons */}
                <div className="absolute bottom-4 left-0 right-0 flex justify-between px-4 z-40">
                  <button 
                    onClick={prevSlide}
                    className="p-2 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors"
                  >
                    <ChevronLeft className="h-6 w-6 text-red-900" />
                  </button>
                  <button 
                    onClick={nextSlide}
                    className="p-2 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors"
                  >
                    <ChevronRight className="h-6 w-6 text-red-900" />
                  </button>
                </div>

                {/* Indicators */}
                <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-2 z-30">
                  {announcements.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentIndex(index)}
                      className={`w-2.5 h-2.5 rounded-full transition-colors ${
                        index === currentIndex ? 'bg-white' : 'bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
