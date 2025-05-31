import React, {useState, useEffect} from 'react';
import { FaUser, FaGraduationCap } from 'react-icons/fa6';
import Dashboard from '../../template/Dashboard';
import { Bar } from 'react-chartjs-2';
import Footer from '../../components/Footer';
import useTitle from '../../utils/useTitle';
import CardStatAdmin from '../../components/cardDashboard/CardStatAdmin';
import { get } from '../../utils/api';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

// Registrasi komponen Chart.js yang diperlukan
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const DasboardAdmin = () => {
  const [chartData, setChartData] = useState(null);
  const [counts, setCounts] = useState({medical: 0, students: 0, parents: 0});
  const [countOnlineUser, setCountOnlineUser] = useState({online_users: 0});
  const [countUser, setCountUser] = useState({count_users: 0})
  const [logData, setLogData] = useState([]);


  const fetchLogData = async () => {
    try {
      const data = await get('/logging/get-all-log');
      setLogData(data);
    } catch (error) {
      console.error('Error fetching count data:', error);
    }
  }

   const fetchCounts = async () => {
      try {
        const data = await get('/dashboard/count');
        setCounts(data);
      } catch (error) {
        console.error('Error fetching count data:', error);
      }
    };

    const fetchCountUser = async () => {
      try {
        const data = await get('/dashboard/count-users');
        setCountUser(data);
      } catch (error) {
        console.error('Error fetching count data:', error);
      }
    };

  const fetchChartData = async () => {
    try {
      const data = await get('/dashboard/count-data-week-permonth');
      setChartData(data);
    } catch (error) {
      console.error('Error fetching chart data:', error);
    }
  };

  const fetchOnlineUsers = async () => {
    try {
      const data = await get('/dashboard/count-online-user');
      setCountOnlineUser(data);
    } catch (error) {
      console.error("Failed load data:", error);
    }
  }

   useEffect(() => {
      fetchCounts();
      fetchChartData();
      fetchOnlineUsers();
      fetchCountUser();
      fetchLogData();
      const refreshInterval = import.meta.env.VITE_REFRESH_INTERVAL || 10000;

      const interval = setInterval(() => {
        fetchOnlineUsers();
        fetchChartData();
        fetchCounts();
        fetchCountUser();
        fetchLogData();
      }, refreshInterval); 
  
      // Bersihkan interval saat komponen di-unmount
      return () => clearInterval(interval);
    }, []);
    const prepareChartData = () => {
      if (!chartData) return null;
  
      const labels = chartData.map(item => `Minggu ke-${item.week}, ${item.month}/${item.year}`);
      const medicalData = chartData.map(item => item.medical || 0);
      const studentData = chartData.map(item => item.students || 0);
      const parentData = chartData.map(item => item.parents || 0);
  
      return {
        labels,
        datasets: [
          {
            label: 'Medical',
            data: medicalData,
            backgroundColor: 'rgba(255, 99, 132, 0.5)',
          },
          {
            label: 'Students',
            data: studentData,
            backgroundColor: 'rgba(54, 162, 235, 0.5)',
          },
          {
            label: 'Parents',
            data: parentData,
            backgroundColor: 'rgba(255, 206, 86, 0.5)',
          },
        ],
      };
    };

    
  useTitle('Admin - Sistem Manajemen Lab Letris 2');
  const headTable = ['User', 'Action', 'Timestamp'];
  // Sort logData by id in descending order to show newest entries first
  const dataTable = [...logData].sort((a, b) => b.id - a.id);
  
  return (
    <div className="min-h-screen flex flex-col">
      <Dashboard title="Dasboard">
        <div className="flex flex-col mx-auto max-w-7xl xl:flex-row lg:w-full flex-1">
          <div className="w-full h-full xl:w-full xl:px-5 grid grid-cols-12 gap-4 flex-1">
            <div className="col-span-12 md:col-span-3 overflow-hidden group cursor-pointer hover:shadow-lg active:shadow-md rounded-lg bg-white shadow-md relative transition-all duration-300 ease-in-out transform hover:-translate-y-1">
              <span className="absolute -right-2 -top-2 flex h-6 w-6">
                <span className="group-hover:animate-ping absolute inline-flex h-full w-full rounded-full bg-maroon opacity-75"></span>
                <span className="relative inline-flex rounded-full h-6 w-6 bg-maroon"></span>
              </span>
              <div className="p-4">
                <h1 className="text-xl font-semibold text-red-900">Total Online User</h1>
                <div className="flex justify-center items-center p-4">
                  <h2 className="mt-4 text-5xl font-extrabold text-gray-600">{countOnlineUser.online_users}</h2>
                </div>
              </div>
            </div>
            <div className="col-span-12 md:col-span-9 overflow-hidden group cursor-pointer hover:shadow-lg active:shadow-md rounded-lg bg-white shadow-md relative transition-all duration-300 ease-in-out transform hover:-translate-y-1">
              <div className="p-4">
                <div className="flex justify-between items-center pb-2">
                  <h1 className="text-xl font-semibold text-red-900">Statistik Data</h1>
                  <p className="text-sm text-gray-500">Data Terupdate Otomatis</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-5">
                  <CardStatAdmin icon={FaUser} count={counts.parents} label="Perangkat" />
                  <CardStatAdmin icon={FaGraduationCap} count={counts.students} label="Lab Kom" />
                  <CardStatAdmin icon={FaUser} count={counts.medical} label="User" />
                  <CardStatAdmin icon={FaUser} count={countUser.count_users} label="Pengumuman" />
                </div>
              </div>
            </div>
            <div className='mt-4 col-span-12 md:col-span-6 h-[500px] overflow-hidden group hover:shadow-lg active:shadow-md rounded-lg bg-white shadow-md relative transition-all duration-300 ease-in-out transform hover:-translate-y-1'>
              <div className="">
               
                <div className="LogData">
                <table className="min-w-full">
                    <thead className="bg-red-900">
                      <tr className="rounded-t-lg">
                        {headTable.map((head, index) => (
                          <th
                            key={index}
                            className={`py-2 px-4 text-white border-b text-left ${
                              index === 0 ? "rounded-tl-lg" : index === headTable.length - 1 ? "rounded-tr-lg" : ""
                            }`}
                          >
                            {head}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className=' max-h-full border-red-900'>
                      {dataTable.map((row, index) => (
                        <tr key={index}>
                          <td className="py-2 px-4">{row.full_name}</td>
                          <td className="py-2 px-4">{row.action}</td>
                          <td className="py-2 px-4">
                            {new Date(row.timestamp).toLocaleString('id-ID')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className='mt-4 col-span-12 md:col-span-6 overflow-hidden group hover:shadow-lg active:shadow-md rounded-lg bg-white shadow-md relative transition-all duration-300 ease-in-out transform hover:-translate-y-1'>
              <div className="p-4 h-full flex flex-col">
                <div className="flex justify-between items-center pb-2">
                  <h1 className="text-xl font-semibold text-red-900">Statistik Data Perminggu</h1>
                </div>
                <div className="flex-grow flex items-center justify-center">
                  {chartData ? <Bar 
                    data={prepareChartData()} 
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                    }}
                  /> : <p>Loading chart...</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className='mt-8'>
          <Footer/>
        </div>
      </Dashboard>
    </div>
  );
};

export default DasboardAdmin;
