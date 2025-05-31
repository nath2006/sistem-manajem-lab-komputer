import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { post } from '../../utils/api';
import Dashboard from '../../template/Dashboard';
import useTitle from '../../utils/useTitle';
import { FaEye, FaEyeSlash } from "react-icons/fa6";

const AddUser = () => {
  useTitle('Tambah User - Dashboard');
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    full_name: '',
    username: '',
    password: '',
    confirmPassword: '',
    role: '',
    is_active: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({
      ...formData,
      [e.target.name]: value,
    });
  };

  const togglePassword = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPassword = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Password dan konfirmasi password tidak cocok');
      setIsSubmitting(false);
      return;
    }

    try {
      await post('/user/create', {
        full_name: formData.full_name,
        username: formData.username,
        password: formData.password,
        role: formData.role,
        is_active: 0,
      });
      
      navigate('/user', {
        state: { successMsg: 'User berhasil ditambahkan' }
      });
    } catch (err) {
      setError('Gagal menambahkan user. Silakan coba lagi.');
      setIsSubmitting(false);
    }
  };

  return (
    <Dashboard title="Tambah User">
      <div className="w-full bg-white rounded-lg shadow-md">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">Form Tambah User</h2>
          <p className="text-sm text-gray-600 mt-1">Tambahkan informasi lengkap untuk user baru</p>
        </div>
        
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6 text-gray-600">
          <div className="border-b pb-6">
            <h3 className="text-lg font-semibold mb-4">Informasi User</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="mb-4">
                <label htmlFor="full_name" className="block mb-2 font-medium text-md">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  id="full_name"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  className="shadow-sm bg-white border-[2px] border-gray-300 outline-none text-sm rounded-md focus:ring-red-500 focus:border-red-500 block w-full p-2.5 h-12"
                  placeholder="Masukkan nama lengkap"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="username" className="block mb-2 font-medium text-md">
                  Username
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className="shadow-sm bg-white border-[2px] border-gray-300 outline-none text-sm rounded-md focus:ring-red-500 focus:border-red-500 block w-full p-2.5 h-12"
                  placeholder="Masukkan username"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="password" className="block mb-2 font-medium text-md">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="shadow-sm bg-white border-[2px] border-gray-300 outline-none text-sm rounded-md focus:ring-red-500 focus:border-red-500 block w-full p-2.5 h-12 pr-10"
                    placeholder="Masukkan password"
                    required
                  />
                  <button
                    type="button"
                    onClick={togglePassword}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5"
                  >
                  {showPassword ? (
                      <FaEye className="h-5 w-5 text-gray-500" />
                    ) : (
                      <FaEyeSlash className="h-5 w-5 text-gray-500" />
                    )}
                  </button>
                </div>
              </div>
              
              <div className="mb-4">
                <label htmlFor="confirmPassword" className="block mb-2 font-medium text-md">
                  Konfirmasi Password
                </label>
                <div className="relative">
                  <input
                    type={ showPassword ? "text" : "password"}
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="shadow-sm bg-white border-[2px] border-gray-300 outline-none text-sm rounded-md focus:ring-red-500 focus:border-red-500 block w-full p-2.5 h-12 pr-10"
                    placeholder="Konfirmasi password"
                    required
                  />
                  <button
                    type="button"
                    onClick={togglePassword}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5"
                  >
                  {showPassword ? (
                    <FaEye className="h-5 w-5 text-gray-500" />
                  ) : (
                    <FaEyeSlash className="h-5 w-5 text-gray-500" />
                  )}
                  </button>
                </div>
              </div>
              
              <div className="mb-4">
                <label htmlFor="role" className="block mb-2 font-medium text-md">
                  Role
                </label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className={`select-option border-[2px] border-gray-300 h-12 ${formData.role ? 'text-black' : 'text-gray-400'} text-sm rounded-md focus:ring-red-500 outline-none focus:border-red-500 block w-full p-2.5`}
                  required
                >
                  <option value="" disabled className="text-gray-400">Pilih Role</option>
                  <option value="admin" className="text-gray-500">Admin</option>
                  <option value="panitia" className="text-gray-500">Panitia</option>
                  <option value="registrator" className="text-gray-500">Registrator</option>
                </select>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end mt-6 pt-4 space-x-4">
            <button
              type="button"
              onClick={() => navigate('/user')}
              className="px-5 py-2 text-sm font-semibold text-center bg-white border-2 rounded-md text-red-500 border-red-500 active:scale-95 focus:outline-none"
              disabled={isSubmitting}
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-semibold text-center rounded-md bg-red-500 text-white active:scale-95 focus:outline-none"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </Dashboard>
  );
};

export default AddUser;
