// pages/LoginPage.js
import React from "react";

const LoginPage = () => {
  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <div className="flex flex-col md:flex-row flex-1 justify-center mx-4 md:mx-0">
        <div className="hidden md:flex md:w-2/3 bg-red-900 items-center justify-center">
          <img
            className="max-w-lg"
            src="/assets/images/login/login-illustration.svg" 
            alt="Login Illustration"
          />
        </div>

        <div className="flex flex-col w-full md:w-1/2 lg:w-1/3 bg-white p-8 md:p-16 justify-center rounded-xl shadow-lg md:rounded-none md:shadow-none">
          <div className="mb-8 text-left">
            <h2 className="text-base md:text-2xl font-bold text-red-900">
              Sistem Informasi Manajemen Laboratorium Komputer
            </h2>
            <p className="mt-2 text-gray-600">
              Silakan masukan username dan password anda
            </p>
          </div>

          <form className="space-y-4">
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
      </div>
    </div>
  );
};

export default LoginPage;
