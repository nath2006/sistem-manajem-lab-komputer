// pages/LoginPage.js
import React from "react";
import {Newspaper} from "lucide-react";

const LoginPage = () => {
  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <div className="flex flex-col md:flex-row flex-1  mx-4 md:mx-0">
        <div className="flex flex-col w-full md:w-1/2 lg:w-2/3 bg-white p-8 md:p-16 justifyrounded-xl shadow-lg md:rounded-none md:shadow-none">
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
              <p className="mt-2  text-gray-900 font-bold text-2xl">Login</p>
              <p className="mt-2  text-gray-600">Lengkapi data berikut ini !</p>
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

        <div className="hidden md:flex md:w-1/2 bg-red-900 items-center p-12">
          {/* <img
            className="max-w-lg"
            src="/assets/images/login/login-illustration.svg" 
            alt="Login Illustration"
          /> */}
          <div className="flex flex-col gap-8">
            <div className="">
              {/* <div className="bg-white">
                <Newspaper color="red" size={34}/>
              </div> */}
            <h1 className="text-base md:text-3xl font-bold text-white">
              Pengumuman Terbaru
            </h1>
            <p className="text-based md:text-md text-white pt-1">Update terbaru penggunaan laboratorium komputer</p>
            </div>
            <div className="CardWrapper pl-8">
              <div className="h-[550px] w-[400px] bg-white rounded-lg">
              <div className="ImageWrapper bg-gray-900 w-full h-[300px] rounded-t-lg">
                {/* Isi gambar atau konten lain di sini */}
              </div>
            </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
