import React, { useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Dashboard from '../../Layouts/Dashboard'
import Footer from '../../components/Footer'
import useTitle from '../../utils/useTitle'
import moment from "moment";
import { AuthContext } from "../../Context/AuthContext";
import { getGreetingTime } from "../../utils/greetingTime"; 
import {
  FaCheckCircle,
} from "react-icons/fa";
import { FaPen } from "react-icons/fa6";


export default function KepalaLabPage() {
  useTitle("Dashboard Guru - SIM Lab Komputer");
  const navigate = useNavigate();
  const { state: authState } = useContext(AuthContext);
  const userName = authState?.fullName || authState?.user || "Pengguna";

  return (
    <>
    <Dashboard> 
      <div className="min-h-[calc(100vh-80px)] flex flex-col px-4 py-6 md:px-6 lg:px-8 bg-white text-gray-800">
          <div className="flex-grow">
            {/* Ucapan Selamat Datang */}
            <div className="mb-6 p-6 ">
              <h1 className="font-semibold text-xl md:text-2xl text-gray-800">
                Selamat {getGreetingTime(moment())}, {userName}!
              </h1>
              <p className="text-gray-600">
                Semoga harimu menyenangkan dan produktif!
              </p>
            </div>

            <div className="mb-8 md:mb-12 group">
              <div
                className="h-[70px] max-w-full bg-gradient-to-r from-red-500 to-red-600 rounded-xl shadow-lg hover:shadow-xl hover:cursor-pointer transition-all duration-300 ease-in-out transform hover:-translate-y-1 active:translate-y-0"
                onClick={() => navigate("/pengajuan-jadwal-lab")}
              >
                <div className="flex justify-start items-center h-full mx-4 sm:mx-6">
                  <div className="p-3 bg-white/20 rounded-full mr-4">
                    <FaPen size={20} className="text-white" />
                  </div>
                  <h1 className="text-white text-md sm:text-lg font-semibold">
                    Buat Pengajuan Jadwal Lab
                  </h1>
                </div>
              </div>
            </div>
          </div>
          <Footer />
        </div>
    </Dashboard>
    </>
  )
}
