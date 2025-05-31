import React, { useState, useEffect, useContext } from 'react'
import Dashboard from '../../Layouts/Dashboard';
import Tabel from '../../Layouts/Table';
import { FaEye, FaTrash, FaFilePen } from "react-icons/fa6";
import { get, deleteData } from '../../utils/api'; 
import { useLocation, useNavigate } from 'react-router-dom'; 
import Notification from '../../Components/Notification/Notif';
import useTitle from '../../utils/useTitle';
import { AuthContext } from '../../Context/AuthContext';
import DeleteConfirmation from '../../components/Notification/DeleteConfirmation';
import DetailUser from '../../Components/User/DetailUser';
import EditUser from '../../Components/User/EditUser';
import truncateText from '../../utils/truncateText';
import formatDate from '../../utils/formatDateView';


const User = () => {
    useTitle('Kelola Data Pengumuman');
    const location = useLocation();
    const navigate = useNavigate();
    const [successMsg, setSuccessMsg] = useState(location.state?.successMsg);
    const [errorMsg, setErrorMsg] = useState(location.state?.errorMsg);
    const [data, setData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedId, setSelectedId] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    
    const { state } = useContext(AuthContext);
    const userRole = state?.role;

    const isAuth = userRole == 'Admin' ||  userRole == 'Koordinator Lab';

    useEffect(() => {
        const timer = setTimeout(() => {
          setSuccessMsg('');
          setErrorMsg('');
        }, 2000);
        return () => clearTimeout(timer);
    }, [successMsg, errorMsg]);

    const handleOpenModal = (id) => {
        setSelectedId(id);
        setShowModal(true);
    };

    const handleOpenEditModal = (id) => {
        setSelectedId(id);
        setShowEditModal(true);
    };

    const handleDelete = DeleteConfirmation({
        onDelete: (id) => deleteData(`/user/delete/${id}`),
        itemName: 'data user',
        onSuccess: (id) => {
            setData(data.filter(item => item.user_id !== id));
            setSuccessMsg('Data user berhasil dihapus');
        },
        onError: (error) => {
            console.error("Error deleting user:", error);
            setErrorMsg('Gagal menghapus data user');
        }
    });

    const headTable = [
        {judul: "Judul"},
        {judul: "Konten"},
        {judul: "file_path"},
        {judul: "Dibuat Pada"},
        {judul: "Dibuat Oleh"},
        {judul: "Aktif"},
        {judul: "Aksi"}
    ];

    const fetchData = async () => {
        try {
            const response = await get('/pengumuman');
            setData(response.data);
            setIsLoading(false);
        } catch (err) {
            // setErrorMsg('Gagal Mengambil Data');
            console.error("Error fetching user data:", err);
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const refreshInterval = import.meta.env.VITE_REFRESH_INTERVAL || 10000;

        const refreshData = setInterval(() => {
            fetchData();
        }, refreshInterval);  

        return () => clearInterval(refreshData);
    }, []);

    const renderUserRow = (item, index) => {
    // Asumsi base URL untuk file Anda, sesuaikan jika perlu
    const ASSET_BASE_URL = import.meta.env.VITE_ASSET_BASE_URL || 'http://localhost:5500/Uploads/Pengumuman/'; 

    return (
      <tr className="bg-white border-b" key={item.pengumuman_id || index}> 
        <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
          {item.judul}
        </th>
        <td className="px-6 py-4 text-gray-900">{truncateText(item.content, 50)}</td> {/* Batasi konten jadi 50 karakter */}
        <td className="px-6 py-4 text-gray-900">
          {item.file_path ? (
            <a
              href={`${ASSET_BASE_URL}${item.file_path}`} // Gabungkan base URL dengan file_path
              target="_blank" // Buka di tab baru
              rel="noopener noreferrer" // Keamanan untuk target="_blank"
              className="text-red-900 hover:text-red-700 cursor-pointer"
            >
              Lihat File {/* Atau tampilkan nama file jika tersedia: item.file_path.split('/').pop() */}
            </a>
          ) : (
            'Tidak ada file'
          )}
        </td>
        <td className="px-6 py-4 text-gray-900">{formatDate(item.created_at)}</td> {/* Format tanggal */}
        <td className="px-6 py-4 text-gray-900">
          {item.created_by?.nama_lengkap || 'Tidak Diketahui'}
        </td>
        <td className="px-6 py-4 text-gray-900">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            item.is_active === 1 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
          }`}>
            {item.is_active === 1 ? 'Aktif' : 'Tidak Aktif'}
          </span>
        </td>
        <td className='flex justify-center items-center py-6 px-5'>
          <div className='flex items-center justify-between gap-x-5'>
            {/* Ganti item.user_id menjadi item.pengumuman_id atau ID unik pengumuman */}
            <button onClick={() => handleOpenModal(item.pengumuman_id)} className="text-blue-700 hover:text-blue-500 cursor-pointer">
              <FaEye size={18} />
            </button>
            {isAuth && (
              <>
                <button onClick={() => handleOpenEditModal(item.pengumuman_id)} className="text-yellow-600 hover:text-yellow-400 cursor-pointer">
                  <FaFilePen size={18} />
                </button>
                <button
                  onClick={() => handleDelete(item.pengumuman_id)} // Pastikan handleDelete dikonfigurasi untuk pengumuman
                  className="text-red-700 hover:text-red-500 cursor-pointer"
                >
                  <FaTrash size={18}/>
                </button>
              </>
            )}
          </div>
        </td>
      </tr>
    );
  }

    return (
        <Dashboard title="Kelola Data Pengumuman">
            <div className="flex flex-col justify-between w-full min-h-[700px] xl:min-h-[calc(100vh-130px)]">
                {successMsg && (
                    <Notification type="success" message={successMsg} onClose={() => setSuccessMsg('')} />
                )}

                {errorMsg && (
                    <Notification type="error" message={errorMsg} onClose={() => setErrorMsg('')} />
                )}
                
                <Tabel
                    title="Kelola Data Pengumuman"
                    breadcrumbContext={userRole}
                    headers={headTable}
                    to="/add-pengumuman"
                    data={isLoading ? [] : data}
                    itemsPerPage={5}
                    renderRow={renderUserRow}
                >
                    {isLoading && (
                        <tr>
                        <td colSpan={headTable.length} className="text-center py-4">
                            Loading...
                        </td>
                        </tr>
                    )}
                </Tabel>

                {showModal && <DetailUser id={selectedId} onClose={() => setShowModal(false)} />}
                {showEditModal && <EditUser id={selectedId} onClose={() => setShowEditModal(false)} onUpdate={fetchData} />}
            
            </div>
        </Dashboard>
    )
}

export default User
