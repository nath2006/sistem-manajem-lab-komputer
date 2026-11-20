import DashboardInsights from '../../Components/DashboardInsights';
import { usePresence } from '../../Context/PresenceContext';
import DashboardTheme from '../../Components/DashboardTheme';
import LoadingSkeleton, { SkeletonRows } from '../../Components/Loading/Skeleton';
import React, { useState, useEffect} from "react";
import { User as FaUser, Monitor as FaComputer, Newspaper as FaRegNewspaper } from 'lucide-react';
import DashboardTablePanel from '../../Components/DashboardTablePanel';
import Dashboard from "../../Layouts/Dashboard";
import Footer from "../../Components/Footer";
import useTitle from "../../utils/useTitle";
import CardStatAdmin from "../../Components/cardDashboard/CardStatAdmin";
import { get } from "../../utils/api"; 

const DasboardAdmin = () => {
  const presence = usePresence();
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
      <Dashboard title="Dashboard Admin">
      <DashboardTheme>
        <DashboardInsights />
        <div className="dashboard-admin-details flex w-full min-w-0 flex-col">
          <div className="grid w-full min-w-0 grid-cols-12 gap-4">
            <section className="col-span-12 grid grid-cols-2 lg:grid-cols-4 gap-4" aria-label="Administrasi">
              <CardStatAdmin icon={FaUser} count={presence.connected && presence.ready ? presence.onlineUserIds.length : <span className="text-sm font-medium" title="Status online belum tersedia">Belum terhubung</span>} label="Pengguna online" />
              <CardStatAdmin icon={FaComputer} count={isLoading && !dashboardStats ? <LoadingSkeleton variant="text" rows={1} /> : dashboardStats?.totalLab || 0} label="Laboratorium" />
              <CardStatAdmin icon={FaUser} count={isLoading && !dashboardStats ? <LoadingSkeleton variant="text" rows={1} /> : dashboardStats?.totalUser || 0} label="Pengguna" />
              <CardStatAdmin icon={FaRegNewspaper} count={isLoading && !dashboardStats ? <LoadingSkeleton variant="text" rows={1} /> : dashboardStats?.totalPengumuman || 0} label="Pengumuman" />
            </section>

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
      </DashboardTheme>
    </Dashboard>
    </div>
  );
};

export default DasboardAdmin;
