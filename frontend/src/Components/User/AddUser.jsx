import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { post } from "../../utils/api";
import Dashboard from "../../Layouts/Dashboard";
import useTitle from "../../utils/useTitle";
import FormContainer from "../FormContainer";
import { FaEye, FaEyeSlash } from "react-icons/fa6";

const AddUser = () => {
  useTitle("Tambah User - Dashboard");
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    nama_lengkap: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e) => {
    const { name, type, value, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Password dan konfirmasi password tidak cocok");
      setIsSubmitting(false);
      return;
    }

    try {
      await post("/user/create", {
        nama_lengkap: formData.nama_lengkap,
        username: formData.username,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        is_active: 0,
      });

      navigate("/user", {
        state: { successMsg: "User berhasil ditambahkan" },
      });
    } catch {
      setError("Gagal menambahkan user. Silakan coba lagi.");
      setIsSubmitting(false);
    }
  };

  return (
    <Dashboard title="Tambah User">
      <FormContainer
        title="Form Tambah User"
        description="Tambahkan informasi lengkap untuk user baru"
        error={error}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
        onCancel={() => navigate("/user")}
      >
          <div className="mb-4">
            <label className="block mb-2 font-medium text-md">Nama Lengkap</label>
            <input
              type="text"
              name="nama_lengkap"
              value={formData.nama_lengkap}
              onChange={handleChange}
              className="shadow-sm bg-white border-[2px] border-gray-300 outline-none text-sm rounded-md focus:ring-red-500 focus:border-red-500 block w-full p-2.5 h-12"
              required
            />
          </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          <div className="mb-4">
            <label className="block mb-2 font-medium text-md">Username</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="shadow-sm bg-white border-[2px] border-gray-300 outline-none text-sm rounded-md focus:ring-red-500 focus:border-red-500 block w-full p-2.5 h-12"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block mb-2 font-medium text-md">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="shadow-sm bg-white border-[2px] border-gray-300 outline-none text-sm rounded-md focus:ring-red-500 focus:border-red-500 block w-full p-2.5 h-12"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block mb-2 font-medium text-md">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="shadow-sm bg-white border-[2px] border-gray-300 outline-none text-sm rounded-md focus:ring-red-500 focus:border-red-500 block w-full p-2.5 h-12 pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5"
              >
                {showPassword ? <FaEye className="h-5 w-5 text-gray-500" /> : <FaEyeSlash className="h-5 w-5 text-gray-500" />}
              </button>
            </div>
          </div>

          <div className="mb-4">
            <label className="block mb-2 font-medium text-md">Konfirmasi Password</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="shadow-sm bg-white border-[2px] border-gray-300 outline-none text-sm rounded-md focus:ring-red-500 focus:border-red-500 block w-full p-2.5 h-12 pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5"
              >
                {showConfirmPassword ? <FaEye className="h-5 w-5 text-gray-500" /> : <FaEyeSlash className="h-5 w-5 text-gray-500" />}
              </button>
            </div>
          </div>

          <div className="mb-4">
            <label className="block mb-2 font-medium text-md">Role</label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="shadow-sm bg-white border-[2px] border-gray-300 outline-none text-sm rounded-md focus:ring-red-500 focus:border-red-500 block w-full p-2.5 h-12"
              required
            >
              <option value="" disabled>Pilih Role</option>
              <option value="Admin">Admin</option>
              <option value="Guru">Guru</option>
              <option value="Teknisi">Teknisi</option>
              <option value="Kepala Lab">Kepala Lab</option>
              <option value="Koordinator Lab">Koordinator Lab</option>
            </select>
          </div>
        </div>
      </FormContainer>
    </Dashboard>
  );
};

export default AddUser;
