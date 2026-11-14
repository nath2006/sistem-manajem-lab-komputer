import React, { useState, useEffect, useContext } from 'react'
import Dashboard from '../../Layouts/Dashboard';
import Tabel from '../../Layouts/Table';
import { FaEye, FaTrash, FaFilePen } from "react-icons/fa6";
import { get, deleteData } from '../../utils/api'; 
import { useLocation } from 'react-router-dom'; 
import Notification from '../../Components/Notification/Notif';
import useTitle from '../../utils/useTitle';
import { AuthContext } from '../../Context/AuthContext';
import useDeletionDialog from '../../Components/Deletion/useDeletionDialog';
import DetailUser from '../../Components/User/DetailUser';
import EditUser from '../../Components/User/EditUser';
import RowActionButton from '../../Components/RowActionButton';

const User = () => {
    useTitle('Kelola Data User');
    const location = useLocation();
    const [successMsg, setSuccessMsg] = useState(location.state?.successMsg);
    const [errorMsg, setErrorMsg] = useState(location.state?.errorMsg);
    const [data, setData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedId, setSelectedId] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    
    const { state } = useContext(AuthContext);
    const userRole = state?.role;

    const isAdmin = userRole == 'Admin';

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

    const {requestDeletion:handleDelete,dialog:deletionDialog} = useDeletionDialog({
        resource: 'user',
        onDelete: (id) => deleteData(`/user/delete/${id}`),
        itemName: 'data user',
        onSuccess: (id) => {
            setData(previous => previous.filter(item => item.user_id !== id));
            setSuccessMsg('Data user berhasil dihapus');
        },
        onError: (error) => {
            console.error("Error deleting user:", error);
            setErrorMsg('Gagal menghapus data user');
        }
    });

    const headTable = [
      {judul: "Nama Lengkap"},
      {judul: "Username"},
        {judul: "Email"},
        {judul: "Role"},
        {judul: "Status"},
        {judul: "Aksi"}
    ];

    const fetchData = async () => {
        try {
            const response = await get('/user');
            setData(response.data);
        } catch (err) {
            // setErrorMsg('Gagal Mengambil Data');
            console.error("Error fetching user data:", err);
        } finally {
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

    const renderUserRow = (item, index) => (
        <tr className="bg-white border-b" key={item.user_id || index}>
          <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
            {item.nama_lengkap}
          </th>
          <td className="px-6 py-4 text-gray-900">{item.username}</td>
          <td className="px-6 py-4 text-gray-900">{item.email}</td>
          <td className="px-6 py-4 text-gray-900">
            <span
              className={`inline-flex max-w-full items-center justify-center rounded-full px-2 py-1 text-center text-[11px] font-medium leading-4 whitespace-normal break-words ${
                item.role === 'Admin' 
                  ? 'bg-maroon/10 text-maroon' 
                  : item.role === 'Guru'
                  ? 'bg-green-100 text-green-800' 
                  : item.role === 'Teknisi'
                  ? 'bg-blue-100 text-blue-800' 
                  : item.role === 'Kepala Lab'
                  ? 'bg-indigo-100 text-indigo-800' 
                  : item.role === 'Koordinator Lab'
                  ? 'bg-purple-100 text-purple-800' 
                  : 'bg-gray-100 text-gray-800' // Default jika role tidak dikenali
              }`}
            >
              {item.role || 'Unknown'}
            </span>
          </td>
          <td className="px-6 py-4 text-gray-900">
            <span className={`inline-flex max-w-full items-center rounded-full px-2 py-1 text-[11px] font-medium leading-4 ${
                item.is_online ? 'bg-green-100 text-green-800' : 'bg-gray-300 text-gray-800'
            }`}>
                {item.is_online ? 'Online' : 'Offline'}
            </span>
          </td>
          <td className="px-3 py-4">
            <div className="flex items-center justify-center gap-1">
              <RowActionButton variant="view" label={`Lihat detail user ${item.nama_lengkap}`} tooltip="Lihat detail user" onClick={() => handleOpenModal(item.user_id)}>
                <FaEye size={18} aria-hidden="true" />
              </RowActionButton>
              {isAdmin && (
                <>
                  <RowActionButton variant="edit" label={`Edit user ${item.nama_lengkap}`} tooltip="Edit user" onClick={() => handleOpenEditModal(item.user_id)}>
                    <FaFilePen size={18} aria-hidden="true" />
                  </RowActionButton>
    
                  <RowActionButton variant="delete" label={`Hapus user ${item.nama_lengkap}`} tooltip="Hapus user" onClick={() => handleDelete(item.user_id)}>
                    <FaTrash size={18} aria-hidden="true" />
                  </RowActionButton>
                </>
              )}
            </div>
          </td>
        </tr>
    );

    return (
        <Dashboard title="Kelola Data User">
            <div className="flex flex-col justify-between w-full min-h-[700px] xl:min-h-[calc(100vh-130px)]">
                {successMsg && (
                    <Notification type="success" message={successMsg} onClose={() => setSuccessMsg('')} />
                )}

                {errorMsg && (
                    <Notification type="error" message={errorMsg} onClose={() => setErrorMsg('')} />
                )}
                
                <Tabel
          isLoading={isLoading}
                    title="Kelola Data User"
                    breadcrumbContext={userRole}
                    headers={headTable}
                    to="/add-user"
                    data={data}
                    itemsPerPage={5}
                    renderRow={renderUserRow}
                />

                {showModal && <DetailUser id={selectedId} onClose={() => setShowModal(false)} />}
                {showEditModal && <EditUser id={selectedId} onClose={() => setShowEditModal(false)} onUpdate={fetchData} />}
            
            </div>
            {deletionDialog}
        </Dashboard>
    )
}

export default User
