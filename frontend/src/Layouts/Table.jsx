/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaSearch } from 'react-icons/fa';
import { FaAngleRight, FaAngleLeft } from 'react-icons/fa6';

const Tabel = ({
  title,
  breadcrumbContext, // Prop baru untuk konteks breadcrumb (misalnya, role)
  headers,
  children,
  to,
  // handle, // Prop 'handle' tidak digunakan, bisa dipertimbangkan untuk dihapus jika tidak ada rencana penggunaan
  data,
  itemsPerPage = 5,
  renderRow,
  buttonText = "Tambah Data" // Prop baru untuk teks tombol tambah, dengan nilai default
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [filteredData, setFilteredData] = useState([]);
  const [currentItemsPerPage, setCurrentItemsPerPage] = useState(itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, currentItemsPerPage]);

  useEffect(() => {
    setCurrentItemsPerPage(itemsPerPage);
  }, [itemsPerPage]);

  useEffect(() => {
    if (Array.isArray(data)) {
      if (!searchTerm.trim()) {
        setFilteredData(data);
      } else {
        const filtered = data.filter(item => {
          return Object.values(item).some(value => {
            const strValue = String(value).toLowerCase();
            return strValue.includes(searchTerm.toLowerCase());
          });
        });
        setFilteredData(filtered);
      }
    } else {
      setFilteredData([]);
    }
  }, [data, searchTerm]);

  const totalItems = filteredData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / currentItemsPerPage));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(Math.max(1, totalPages));
    }
  }, [currentPage, totalPages]);

  const indexOfLastItem = currentPage * currentItemsPerPage;
  const indexOfFirstItem = indexOfLastItem - currentItemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  const nextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const prevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));

  const handleItemsPerPageChange = (e) => {
    const value = e.target.value === 'all' ? filteredData.length || 1 : Number(e.target.value); // Pastikan tidak 0 jika all
    setCurrentItemsPerPage(value);
  };

  const renderChildren = () => {
    if (!Array.isArray(data) || data.length === 0 && searchTerm.trim() === '' ) { // Jika data bukan array atau data memang kosong (bukan hasil filter)
      return (
        <tr>
          <td colSpan={headers.length} className="text-center py-10 text-gray-500">
            Tidak ada data yang tersedia.
          </td>
        </tr>
      );
    }

    if (totalItems === 0 && searchTerm.trim() !== '') { // Jika hasil filter kosong
        return (
            <tr>
                <td colSpan={headers.length} className="text-center py-10 text-gray-500">
                    Data tidak ditemukan untuk pencarian "{searchTerm}".
                </td>
            </tr>
        );
    }


    if (renderRow && typeof renderRow === 'function') {
      return currentItems.map((item, index) => renderRow(item, indexOfFirstItem + index)); // Mengirimkan index global jika dibutuhkan
    }

    // Fallback jika children disediakan secara eksplisit dan bukan renderRow
    // Namun, pola yang lebih umum adalah menggunakan renderRow untuk data array
    if (children) {
        return children;
    }

    return null; // Seharusnya tidak sampai sini jika renderRow atau children valid
  };

  return (
    <div className="bg-white shadow-md rounded-lg">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 border-b border-gray-200">
        <div className='flex-grow'> {/* Memastikan bagian kiri mengambil ruang yang tersedia */}
          <h1 className='text-xl font-semibold text-gray-900'>
            {title} {/* Menampilkan title utama, misal: "Kelola Data User" */}
          </h1>
          <p className="mt-1 text-sm font-normal text-gray-500">
            {/* Menampilkan breadcrumb: [role] / title */}
            {breadcrumbContext ? `${breadcrumbContext} / ${title}` : title}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center w-full sm:w-auto"> {/* Penyesuaian untuk mobile */}
          <div className="relative w-full sm:w-auto">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <FaSearch className="text-gray-400 w-4 h-4" />
            </div>
            <input
              type="text"
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm font-normal rounded-lg focus:ring-maroon focus:border-maroon block w-full pl-10 p-2.5" // p-2.5 untuk tinggi yang konsisten
              placeholder="Cari data..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {to && (
            <Link
              className='px-4 py-2.5 text-sm font-medium text-white rounded-lg bg-maroon hover:bg-red-800 active:scale-95 transition-all whitespace-nowrap w-full sm:w-auto text-center' // text-center untuk mobile
              to={to}
            >
              {buttonText} {/* Menggunakan prop buttonText */}
            </Link>
          )}
        </div>
      </div>

      <div className="relative overflow-x-auto custom-scrollbar">
        <table className="w-full text-sm text-left text-gray-500 rtl:text-right">
          <thead className="text-xs text-white uppercase bg-maroon">
            <tr>
              {headers.map((item, i) => (
                <th key={i} scope="col" className="px-6 py-3 whitespace-nowrap"> {/* whitespace-nowrap menjadi text-nowrap */}
                  {item.judul}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Jika Anda ingin menampilkan children dari parent saat loading, bisa diatur di sini */}
            {/* Contoh: isLoading ? childrenLoadingState : renderChildren() */}
            {renderChildren()}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      {Array.isArray(data) && filteredData.length > 0 && totalPages > 0 && ( // Hanya tampilkan jika ada data dan lebih dari 0 halaman
        <div className="flex flex-col sm:flex-row items-center justify-between mt-4 p-4 border-t border-gray-200 gap-y-4">
          <div className="flex items-center gap-2 border p-2 border-gray-300 rounded-lg relative shadow-sm">
            <span className="text-sm font-medium text-gray-700 pr-2">Per halaman</span>
            <div className="h-full absolute left-1/2 transform -translate-x-1/2 top-0 w-px bg-gray-300" style={{left: "calc(50% - 8px)"}}></div> {/* Penyesuaian posisi garis */}
            <select
              value={currentItemsPerPage >= filteredData.length && filteredData.length > 0 ? 'all' : currentItemsPerPage} // Handle 'all' jika jumlah item cukup
              onChange={handleItemsPerPageChange}
              className="border-none focus:ring-0 text-sm p-0 pl-2 bg-transparent text-gray-700 font-medium"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              {filteredData.length > 0 && <option value="all">Semua ({filteredData.length})</option>}
            </select>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-end gap-x-4 gap-y-2 w-full sm:w-auto">
            <div className="text-sm text-gray-700">
              Menampilkan {totalItems === 0 ? 0 : indexOfFirstItem + 1} - {Math.min(indexOfLastItem, totalItems)} dari {totalItems} data
            </div>

            {totalPages > 1 && (
              <nav className="flex items-center gap-x-1" aria-label="Pagination">
                <button
                  type="button"
                  className="min-h-[38px] min-w-[38px] py-2 px-2.5 inline-flex items-center gap-x-1.5 text-sm text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-maroon disabled:opacity-50 disabled:pointer-events-none shadow-sm"
                  onClick={prevPage}
                  disabled={currentPage === 1}
                  aria-label="Previous"
                >
                  <FaAngleLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Prev</span>
                </button>

                <div className="flex items-center gap-x-1">
                  {/* Logika untuk menampilkan nomor halaman bisa lebih kompleks jika banyak halaman */}
                  {Array.from({ length: totalPages }, (_, i) => {
                     // Logika untuk menampilkan elipsis jika halaman terlalu banyak
                    const pageNumber = i + 1;
                    if (totalPages <= 5 || // Tampilkan semua jika <= 5 halaman
                        (pageNumber <= 2) || // Tampilkan 2 halaman pertama
                        (pageNumber >= totalPages - 1) || // Tampilkan 2 halaman terakhir
                        (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1) // Tampilkan halaman sekitar halaman aktif
                    ) {
                        return (
                            <button
                                key={i}
                                onClick={() => paginate(pageNumber)}
                                className={`min-h-[38px] min-w-[38px] py-2 px-3.5 inline-flex items-center justify-center text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-maroon shadow-sm ${
                                currentPage === pageNumber
                                    ? 'bg-maroon text-white font-semibold border border-maroon'
                                    : 'text-gray-700 bg-white hover:bg-gray-100 border border-gray-300'
                                }`}
                            >
                                {pageNumber}
                            </button>
                        );
                    } else if (
                        (pageNumber === currentPage - 2 && pageNumber > 2) ||
                        (pageNumber === currentPage + 2 && pageNumber < totalPages - 1)
                    ) {
                        // Tampilkan elipsis
                        return <span key={`ellipsis-${i}`} className="px-2 py-2 text-gray-500">...</span>;
                    }
                    return null;
                  })}
                </div>

                <button
                  type="button"
                  className="min-h-[38px] min-w-[38px] py-2 px-2.5 inline-flex items-center gap-x-1.5 text-sm text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-maroon disabled:opacity-50 disabled:pointer-events-none shadow-sm"
                  onClick={nextPage}
                  disabled={currentPage === totalPages}
                  aria-label="Next"
                >
                  <span className="hidden sm:inline">Next</span>
                  <FaAngleRight className="w-4 h-4" />
                </button>
              </nav>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Tabel;
