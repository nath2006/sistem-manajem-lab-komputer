import React, { useState, useEffect } from "react";
import { get, put } from "../../utils/api";
import ModalContainer from "../../components/DetailModal/ModalContainer";
import LoadingSpinner from "../../components/DetailModal/LoadingSpinner";

const EditUser = ({ id, onClose, onUpdate }) => {
    const [formData, setFormData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [password, setPassword] = useState(""); // Tambahan untuk password

    useEffect(() => {
        const fetchDetail = async () => {
            try {
                const response = await get(`/user/detail/${id}`);
                setFormData({
                    nama_lengkap: response.data.nama_lengkap,
                    username: response.data.username,
                    email: response.data.email,
                    role: response.data.role,
                    is_online: Boolean(response.data.is_online),
                });
            } catch (error) {
                console.error("Gagal mengambil data:", error);
                setError("Gagal mengambil data user");
            } finally {
                setLoading(false);
            }
        };
        fetchDetail();
    }, [id]);

    const handleChange = (e) => {
        const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
        setFormData((prev) => ({ ...prev, [e.target.name]: value }));
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        setSaving(true);
        setError("");

        try {
            // Data yang akan dikirim ke backend
            const dataToSubmit = { 
                ...formData,
                is_active: formData.is_active ? 1 : 0 
            };

            // Jika user mengisi password, tambahkan ke data yang dikirim
            if (password.trim()) {
                dataToSubmit.password = password;
            }

            await put(`/user/update/${id}`, dataToSubmit);
            onUpdate();
            onClose();
        } catch (error) {
            console.error("Gagal menyimpan data:", error);
            setError("Gagal mengubah data user");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <ModalContainer title="Edit User" onClose={onClose}>
                <LoadingSpinner />
            </ModalContainer>
        );
    }

    const primaryButton = (
        <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full px-5 py-2 text-sm font-semibold text-center rounded-md bg-red-500 text-white active:scale-95 focus:outline-none"
        >
            {saving ? "Menyimpan..." : "Simpan"}
        </button>
    );

    const secondaryButton = (
        <button
            onClick={onClose}
            className="w-full px-5 py-2 text-sm font-semibold text-center bg-white border-2 rounded-md text-red-500 border-red-500 active:scale-95 focus:outline-none"
        >
            Batal
        </button>
    );

    return (
        <ModalContainer 
            title="Edit User" 
            subtitle="Edit informasi user"
            onClose={onClose}
            primaryButton={primaryButton}
            secondaryButton={secondaryButton}
        >
            <form onSubmit={handleSubmit} className="space-y-6 text-gray-600">
                {error && (
                    <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
                        {error}
                    </div>
                )}
                
                <div className="border-b pb-4">
                    <h3 className="text-lg font-semibold mb-4">Informasi User</h3>
                    <div className="grid grid-cols-1 gap-4">
                        <div className="mb-4">
                            <label htmlFor="nama_lengkap" className="block mb-2 font-medium text-md">Nama Lengkap</label>
                            <input
                                type="text"
                                id="nama_lengkap"
                                name="nama_lengkap"
                                value={formData.nama_lengkap || ""}
                                onChange={handleChange}
                                className="shadow-sm bg-white border-[2px] border-gray-300 outline-none text-sm rounded-md focus:ring-maroon focus:border-maroon block w-full p-2.5 h-12"
                                placeholder="Masukan Nama Lengkap"
                                required
                            />
                        </div>
                        <div className="mb-4">
                            <label htmlFor="username" className="block mb-2 font-medium text-md">Username</label>
                            <input
                                type="text"
                                id="username"
                                name="username"
                                value={formData.username || ""}
                                onChange={handleChange}
                                className="shadow-sm bg-white border-[2px] border-gray-300 outline-none text-sm rounded-md focus:ring-maroon focus:border-maroon block w-full p-2.5 h-12"
                                placeholder="Masukan Username"
                                required
                            />
                        </div>
                        <div className="mb-4">
                            <label htmlFor="email" className="block mb-2 font-medium text-md">Email</label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email || ""}
                                onChange={handleChange}
                                className="shadow-sm bg-white border-[2px] border-gray-300 outline-none text-sm rounded-md focus:ring-maroon focus:border-maroon block w-full p-2.5 h-12"
                                placeholder="Masukan Email"
                                required
                            />
                        </div>
                        <div className="mb-4">
                            <label htmlFor="role" className="block mb-2 font-medium text-md">Role</label>
                            <select
                                id="role"
                                name="role"
                                value={formData.role || ""}
                                onChange={handleChange}
                                className={`select-option border-[2px] border-gray-300 h-12 ${formData.role ? 'text-black' : 'text-gray-400'} text-sm rounded-md focus:ring-maroon outline-none focus:border-maroon block w-full p-2.5`}
                                required
                            >
                                <option value="" disabled className="text-gray-400">Pilih Role</option>
                                <option value="Admin" className="text-gray-500">Admin</option>
                                <option value="Guru" className="text-gray-500">Guru</option>
                                <option value="Teknisi" className="text-gray-500">Teknisi</option>
                                <option value="Kepala Lab" className="text-gray-500">Kepala Lab</option>
                                <option value="Koordinator Lab" className="text-gray-500">Koordinator Lab</option>
                            </select>
                        </div>
                        <div className="mb-4">
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    name="is_active"
                                    checked={formData.is_online}
                                    onChange={handleChange}
                                    className="mr-2 h-5 w-5 text-red-500 focus:ring-red-400"
                                />
                                <span className="text-gray-700 font-medium">Status Onlines</span>
                            </label>
                        </div>
                        {/* Input Password */}
                        <div className="mb-4">
                            <label htmlFor="password" className="block mb-2 font-medium text-md">Password Baru (Opsional)</label>
                            <input
                                type="password"
                                id="password"
                                name="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="shadow-sm bg-white border-[2px] border-gray-300 outline-none text-sm rounded-md focus:ring-maroon focus:border-maroon block w-full p-2.5 h-12"
                                placeholder="Masukan Password Baru"
                            />
                            <p className="text-xs text-gray-500 mt-1">Kosongkan jika tidak ingin mengubah password</p>
                        </div>
                    </div>
                </div>
            </form>
        </ModalContainer>
    );
};

export default EditUser;
