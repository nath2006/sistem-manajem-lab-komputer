import LoadingSkeleton, { SkeletonRows } from '../../Components/Loading/Skeleton';
import React, { useState, useEffect} from "react";
import { 
  FaUser,
  FaLaptopFile,
  FaComputer,
  FaRegNewspaper 
} from "react-icons/fa6"; 
import DashboardTablePanel from '../../Components/DashboardTablePanel';
import Dashboard from "../../Layouts/Dashboard";
import Footer from "../../components/Footer";
import useTitle from "../../utils/useTitle";
import CardStatAdmin from "../../components/cardDashboard/CardStatAdmin";
import { get } from "../../utils/api"; 

const DasboardAdmin = () => {
  useTitle("Dashboard Admin - SIM Lab Komputer");

  // State untuk menyimpan data dari API baru
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [labsData, setLabsData] = useState([]);
  const [usersData, setUsersData] = useState([]);

  // Fungsi untuk mengambil semua data dashboard admin
  const fetchAdminDashboardData = async () => {
    try {
      const [statsResponse, labsResponse, usersResponse] = await Promise.all([
        get("/dashboard/admin/stats"),
        get("/dashboard/admin/labs-with-heads"),
        get("/dashboard/admin/users-with-roles"),
      ]);
      setDashboardStats(statsResponse.data || {});
      setLabsData(labsResponse.data || []);
      setUsersData(usersResponse.data || []); 

    } catch (error) {
      console.error("Error fetching admin dashboard data:", error);
      // Set state ke nilai default jika ada error agar UI tidak crash
      setDashboardStats({});
      setLabsData([]);
      setUsersData([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminDashboardData(); 

    const refreshInterval = parseInt(import.meta.env.VITE_REFRESH_INTERVAL || "15000", 10); // Interval refresh
    const intervalId = setInterval(fetchAdminDashboardData, refreshInterval);

    
    return () => clearInterval(intervalId);
  }, []);

  const headTableLabs = ["No", "Nama Lab", "Kepala Lab"];
  const headTableUsers = ["No", "Nama User", "Role"]; 

  return (
    <div className="min-h-screen flex flex-col">
      <Dashboard title="Dasboard">
        <div className="flex flex-col mx-auto max-w-7xl xl:flex-row lg:w-full flex-1">
          <div className="w-full h-full xl:w-full xl:px-5 grid grid-cols-12 gap-4 flex-1">
            {/* Card Total Online User */}
            <div className="col-span-12 md:col-span-3 overflow-hidden group cursor-pointer hover:shadow-lg active:shadow-md rounded-lg bg-white shadow-md relative transition-all duration-300 ease-in-out transform hover:-translate-y-1">
              <span className="absolute -right-2 -top-2 flex h-6 w-6">
                <span className="group-hover:animate-ping absolute inline-flex h-full w-full rounded-full bg-maroon opacity-75"></span>
                <span className="relative inline-flex rounded-full h-6 w-6 bg-maroon"></span>
              </span>
              <div className="p-4">
                <h1 className="text-xl font-semibold text-maroon">
                  Total Online User
                </h1>
                <div className="flex justify-center items-center p-4">
                  <h2 className="mt-4 text-5xl font-extrabold text-gray-600">
                    {isLoading && !dashboardStats ? <LoadingSkeleton variant="text" rows={1} /> : dashboardStats?.totalOnlineUsers || 0}
                  </h2>
                </div>
              </div>
            </div>

            {/* Card Statistik Data */}
            <div className="col-span-12 md:col-span-9 overflow-hidden group rounded-lg bg-white shadow-md relative transition-all duration-300 ease-in-out">
              <div className="p-4">
                <div className="flex justify-between items-center pb-2">
                  <h1 className="text-xl font-semibold text-maroon">
                    Statistik Data
                  </h1>
                  <p className="text-sm text-gray-500">
                    Data Terupdate Otomatis
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-5">
                  <CardStatAdmin
                    icon={FaLaptopFile} // Ganti ikon sesuai kebutuhan
                    count={isLoading && !dashboardStats ? <LoadingSkeleton variant="text" rows={1} /> : dashboardStats?.totalPerangkat || 0}
                    label="Perangkat"
                  />
                  <CardStatAdmin
                    icon={FaComputer} // Ganti ikon sesuai kebutuhan
                    count={isLoading && !dashboardStats ? <LoadingSkeleton variant="text" rows={1} /> : dashboardStats?.totalLab || 0}
                    label="Lab Kom"
                  />
                  <CardStatAdmin
                    icon={FaUser}
                    count={isLoading && !dashboardStats ? <LoadingSkeleton variant="text" rows={1} /> : dashboardStats?.totalUser || 0}
                    label="User"
                  />
                  <CardStatAdmin
                    icon={FaRegNewspaper} // Ganti ikon sesuai kebutuhan
                    count={isLoading && !dashboardStats ? <LoadingSkeleton variant="text" rows={1} /> : dashboardStats?.totalPengumuman || 0}
                    label="Pengumuman"
                  />
                </div>
              </div>
            </div>

            {/* Tabel Data Lab */}
            <DashboardTablePanel className="mt-4 col-span-12 md:col-span-6"> 
                  <table className="min-w-full">
                    <thead className="bg-maroon sticky top-0 z-10">
                      <tr className="rounded-t-lg">
                        {headTableLabs.map((head, index) => (
                          <th
                            key={index}
                            className={`py-3 px-4 text-white border-b text-left ${
                              index === 0
                                ? "rounded-tl-lg"
                                : index === headTableLabs.length - 1
                                ? "rounded-tr-lg"
                                : ""
                            }`}
                          >
                            {head}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {isLoading && labsData.length === 0 ? <SkeletonRows columns={headTableLabs.length} label="Memuat laboratorium..." /> : labsData.length > 0 ? (
                        labsData.map((lab, index) => (
                          <tr key={lab.lab_id || index} className="hover:bg-gray-50">
                            <td className="py-3 px-4 text-sm text-gray-700">{index + 1}</td>
                            <td className="py-3 px-4 text-sm text-gray-700">{lab.nama_lab}</td>
                            <td className="py-3 px-4 text-sm text-gray-700">{lab.nama_kepala_lab}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={headTableLabs.length} className="text-center py-4 text-gray-500">
                            Tidak ada data lab.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
            </DashboardTablePanel>

            {/* Tabel Data User */}
            <DashboardTablePanel className="mt-4 col-span-12 md:col-span-6">
                  <table className="min-w-full">
                    <thead className="bg-maroon sticky top-0 z-10">
                      <tr className="rounded-t-lg">
                        {headTableUsers.map((head, index) => (
                          <th
                            key={index}
                            className={`py-3 px-4 text-white border-b text-left ${
                              index === 0
                                ? "rounded-tl-lg"
                                : index === headTableUsers.length - 1
                                ? "rounded-tr-lg"
                                : ""
                            }`}
                          >
                            {head}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {isLoading && usersData.length === 0 ? <SkeletonRows columns={headTableUsers.length} label="Memuat pengguna..." /> : usersData.length > 0 ? (
                        usersData.map((user, index) => (
                          <tr key={user.user_id || index} className="hover:bg-gray-50">
                            <td className="py-3 px-4 text-sm text-gray-700">{index + 1}</td>
                            <td className="py-3 px-4 text-sm text-gray-700">{user.nama_lengkap}</td>
                            <td className="py-3 px-4 text-sm text-gray-700">{user.role}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={headTableUsers.length} className="text-center py-4 text-gray-500">
                            Tidak ada data pengguna.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
            </DashboardTablePanel>

          </div>
        </div>
        <div className="mt-8">
          <Footer />
        </div>
      </Dashboard>
    </div>
  );
};

export default DasboardAdmin;
