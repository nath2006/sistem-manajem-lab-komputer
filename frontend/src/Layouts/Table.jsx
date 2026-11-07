import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaSearch } from 'react-icons/fa';
import { FaAngleRight, FaAngleLeft } from 'react-icons/fa6';
import { filterTableData, getPaginationItems } from '../utils/tableData';
import { SkeletonRows } from '../Components/Loading/Skeleton';
import { deletionContext, deletionRelation } from '../utils/deletionContext';

const pageButton =
  'min-h-11 min-w-11 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-maroon/10 focus-visible:ring-2 focus-visible:ring-maroon disabled:opacity-50 disabled:pointer-events-none';

function labelRow(row, headers) {
  if (!React.isValidElement(row) || row.type !== 'tr') return row;
  const cells = React.Children.map(row.props.children, (cell, index) => {
    if (
      !React.isValidElement(cell) ||
      !['td', 'th'].includes(cell.type) ||
      Number(cell.props.colSpan) > 1
    )
      return cell;
    const heading = headers[index]?.judul || `Kolom ${index + 1}`;
    const label = typeof heading === 'string' ? heading : `Kolom ${index + 1}`;
    return React.cloneElement(
      cell,
      { 'data-label': label, role: cell.props.role || 'cell' },
      <>
        <span
          aria-hidden="true"
          className="mobile-cell-label text-xs font-semibold text-gray-500 sm:hidden"
        >
          {heading}
        </span>
        <div className="min-w-0 break-words sm:contents">
          {cell.props.children}
        </div>
      </>
    );
  });
  return React.cloneElement(row, { role: row.props.role || 'row' }, cells);
}

const Tabel = ({
  title = 'Data',
  breadcrumbContext,
  headers = [],
  children,
  to,
  data,
  itemsPerPage = 5,
  renderRow,
  buttonText = 'Tambah Data',
  isLoading = false,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const relatedContext = useMemo(() => deletionContext(location.state?.deletionContext), [location.state?.deletionContext]);
  const relation = useMemo(() => deletionRelation(location.pathname, relatedContext), [location.pathname, relatedContext]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(itemsPerPage);
  const filteredData = useMemo(
    () => filterTableData(data, searchTerm, relation),
    [data, searchTerm, relation]
  );
  const totalItems = filteredData.length;
  const size =
    pageSize === 'all'
      ? Math.max(1, totalItems)
      : Math.max(1, Number(pageSize) || 5);
  const totalPages = Math.max(1, Math.ceil(totalItems / size));
  const page = Math.min(currentPage, totalPages);
  const first = (page - 1) * size;
  const currentItems = filteredData.slice(first, first + size);

  useEffect(() => {
    setPageSize(itemsPerPage);
    setCurrentPage(1);
  }, [itemsPerPage]);
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const renderChildren = () => {
    if (isLoading && (!Array.isArray(data) || data.length === 0)) return <SkeletonRows columns={Math.max(1, headers.length)} rows={Math.min(size, 5)} label={`Memuat data ${title}...`} />;
    if (totalItems === 0)
      return (
        <tr role="row">
          <td
            role="cell"
            colSpan={Math.max(1, headers.length)}
            className="px-4 py-10 text-center text-gray-500"
          >
            {searchTerm.trim()
              ? `Data tidak ditemukan untuk pencarian "${searchTerm}".`
              : 'Tidak ada data yang tersedia.'}
          </td>
        </tr>
      );
    if (typeof renderRow === 'function')
      return currentItems.map((item, index) =>
        labelRow(renderRow(item, first + index), headers)
      );
    return React.Children.map(children, (row) => labelRow(row, headers));
  };

  return (
    <section aria-busy={isLoading} className="min-w-0 rounded-lg bg-white shadow-md">
      {relatedContext && <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-t-lg border-b border-maroon bg-maroon/10 p-4 text-sm text-gray-800">
        <p>Data terkait <strong>{relatedContext.label}</strong> (#{relatedContext.id}). {relation ? 'Daftar difilter berdasarkan keterkaitan, bukan pencarian nama.' : 'Tinjau keterkaitan yang disebutkan pada dialog sebelumnya.'}</p>
        <button type="button" className="min-h-11 rounded-md border border-maroon px-3 py-2 font-semibold text-maroon hover:bg-maroon/10" onClick={()=>{
          const {deletionContext: _removed, ...state} = location.state || {};
          setSearchTerm('');
          setCurrentPage(1);
          navigate({pathname:location.pathname,search:location.search},{replace:true,state});
        }}>Tampilkan semua</button>
      </div>}
      <header className="flex flex-col items-start justify-between gap-4 border-b border-gray-200 p-4 sm:p-5 lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1">
          <h1 className="break-words text-xl font-semibold text-gray-900">
            {title}
          </h1>
          <p className="mt-1 break-words text-sm text-gray-500">
            {breadcrumbContext ? `${breadcrumbContext} / ${title}` : title}
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
          <div className="relative min-w-0 flex-1">
            <FaSearch
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            />
            <input
              type="search"
              aria-label={`Cari data ${title}`}
              className="block min-h-11 w-full rounded-lg border border-gray-300 bg-gray-50 py-2.5 pl-10 pr-3 text-sm text-gray-900 focus:border-maroon focus:ring-maroon"
              placeholder="Cari data..."
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          {to && (
            <Link
              to={to}
              className="min-h-11 w-full rounded-lg bg-maroon px-4 py-2.5 text-center text-sm font-medium text-white transition-all hover:bg-maroon/90 hover:shadow-md active:scale-95 focus-visible:ring-2 focus-visible:ring-maroon sm:w-auto"
            >
              {buttonText}
            </Link>
          )}
        </div>
      </header>
      <div className="min-w-0 overflow-x-auto custom-scrollbar">
        <table
          role="table"
          aria-label={title}
          className="mobile-data-table w-full text-left text-sm text-gray-600"
        >
          <thead
            role="rowgroup"
            className="text-xs uppercase text-white bg-maroon"
          >
            <tr role="row">
              {headers.map((header, index) => (
                <th
                  role="columnheader"
                  key={index}
                  scope="col"
                  className="whitespace-nowrap px-6 py-3"
                >
                  {header.judul}
                </th>
              ))}
            </tr>
          </thead>
          <tbody role="rowgroup">{renderChildren()}</tbody>
        </table>
      </div>
      {totalItems > 0 && (
        <footer className="flex flex-col gap-3 border-t border-gray-200 p-4 lg:flex-row lg:items-center lg:justify-between">
          <label className="flex min-h-11 items-center gap-2 text-sm text-gray-700">
            Per halaman
            <select
              aria-label={`Jumlah data per halaman ${title}`}
              className="min-h-11 rounded-lg border border-gray-300 bg-white px-3 focus:ring-maroon"
              value={pageSize}
              onChange={(event) => {
                setPageSize(
                  event.target.value === 'all'
                    ? 'all'
                    : Number(event.target.value)
                );
                setCurrentPage(1);
              }}
            >
              {[5, 10, 25, 50].map((value) => (
                <option value={value} key={value}>
                  {value}
                </option>
              ))}
              <option value="all">Semua ({totalItems})</option>
            </select>
          </label>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-600" aria-live="polite">
              Menampilkan {first + 1} - {Math.min(first + size, totalItems)}{' '}
              dari {totalItems} data
            </p>
            {totalPages > 1 && (
              <nav
                aria-label="Pagination"
                className="flex items-center justify-between gap-2 sm:justify-end"
              >
                <button
                  type="button"
                  className={pageButton}
                  onClick={() => setCurrentPage(page - 1)}
                  disabled={page === 1}
                  aria-label="Halaman sebelumnya"
                >
                  <FaAngleLeft aria-hidden="true" />
                </button>
                <span className="text-sm text-gray-600 sm:hidden">
                  {page} / {totalPages}
                </span>
                <div className="hidden items-center gap-1 sm:flex">
                  {getPaginationItems(totalPages, page).map((item) =>
                    typeof item === 'number' ? (
                      <button
                        type="button"
                        key={item}
                        aria-current={page === item ? 'page' : undefined}
                        className={`${pageButton} ${page === item ? '!border-maroon !bg-maroon !text-white' : ''}`}
                        onClick={() => setCurrentPage(item)}
                      >
                        {item}
                      </button>
                    ) : (
                      <span key={item} aria-hidden="true" className="px-1">
                        …
                      </span>
                    )
                  )}
                </div>
                <button
                  type="button"
                  className={pageButton}
                  onClick={() => setCurrentPage(page + 1)}
                  disabled={page === totalPages}
                  aria-label="Halaman berikutnya"
                >
                  <FaAngleRight aria-hidden="true" />
                </button>
              </nav>
            )}
          </div>
        </footer>
      )}
    </section>
  );
};

export default Tabel;
