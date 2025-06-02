import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { get } from "../../utils/api"; // Sesuaikan path ke utils/api.js jika berbeda
import useTitle from "../../utils/useTitle"; // Asumsi Anda memiliki hook ini, sesuaikan path jika berbeda
import { Card, Spinner, Alert, Button } from "flowbite-react";
import { ArrowLeft, Download, Paperclip } from "lucide-react";

const PengumumanDetailPage = () => {
  const { id } = useParams();
  const [pengumuman, setPengumuman] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const pageTitle = loading
    ? "Memuat Pengumuman..."
    : pengumuman
    ? `Detail: ${pengumuman.judul}`
    : "Pengumuman Tidak Ditemukan";
  useTitle(pageTitle);

  useEffect(() => {
    const fetchPengumumanDetail = async () => {
      setLoading(true);
      setError("");
      try {
        const result = await get(`/pengumuman/${id}`);
        const announcementData = result.data || result;

        if (announcementData && Object.keys(announcementData).length > 0) {
          setPengumuman(announcementData);
        } else {
          setError("Pengumuman tidak ditemukan atau data tidak valid.");
          setPengumuman(null);
        }
      } catch (err) {
        console.error(`Error fetching announcement detail for ID ${id}:`, err);
        const message =
          err?.message ||
          err?.data?.message ||
          "Gagal memuat detail pengumuman.";
        setError(message);
        setPengumuman(null);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchPengumumanDetail();
    } else {
      setError("ID Pengumuman tidak valid.");
      setLoading(false);
      setPengumuman(null);
    }
  }, [id]);

  const formatDate = (dateString) => {
    if (!dateString) return "Tanggal tidak tersedia";
    return new Date(dateString).toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getFileUrl = (filePath) => {
    if (!filePath) return null;

    if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
      return filePath;
    }

    const apiServiceUrl = import.meta.env.VITE_BASE_URL;
    let domainUrl = "";

    try {
      const urlObject = new URL(apiServiceUrl);
      domainUrl = `${urlObject.protocol}//${urlObject.host}`;
    } catch (e) {
      console.error(
        "Invalid API Service URL for constructing file URL:",
        apiServiceUrl
      );
      return "#";
    }
    const publicFileBasePath = "/uploads/pengumuman/";
    return `${domainUrl}${publicFileBasePath}${filePath}`;
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-gray-50 p-4">
        <Spinner
          aria-label="Memuat detail pengumuman"
          size="xl"
          className="text-red-600"
        />
        <span className="ml-3 text-lg text-red-700 mt-3">
          Memuat detail pengumuman...
        </span>
      </div>
    );
  }

  if (error || (!pengumuman && !loading)) {
    return (
      <div className="bg-gray-50 min-h-screen flex flex-col items-center justify-center p-4">
        <div className="container mx-auto max-w-xl text-center">
          <Button
            as={Link}
            to="/login"
            // Tombol kembali dengan tema merah-putih solid
            className="!bg-red-600 mb-6 inline-flex items-center  hover:bg-red-700 text-white focus:ring-4 focus:ring-red-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center"
          >
            <ArrowLeft className="mr-2 h-5 w-5" />
            Kembali ke Login
          </Button>
          {/* Card untuk pesan error */}
          <Card className="bg-white shadow-lg w-full">
            <Alert
              color={error ? "failure" : "warning"}
              className="text-left !bg-transparent border-0"
            >
              <span className="font-medium">
                {error ? "Error!" : "Informasi"}
              </span>{" "}
              {error || "Pengumuman yang Anda cari tidak ditemukan."}
            </Alert>
          </Card>
        </div>
      </div>
    );
  }

  return (
    // Latar belakang halaman utama (abu-abu muda untuk kontras)
    <div className="bg-gray-50 min-h-screen py-8 px-4 md:px-0">
      <div className="container mx-auto max-w-3xl">
        <div className="mb-6">
          <Button
            as={Link}
            to="/login"
            pill={false}
            size="sm"
            // Tombol kembali dengan tema merah-putih solid
            className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg inline-flex items-center focus:ring-4 focus:ring-red-300"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali ke Halaman Login
          </Button>
        </div>

        {/* Card utama dengan background putih, shadow tipis, dan border merah muda */}
        <Card className="!bg-white shadow-md border border-red-100 rounded-lg overflow-hidden flex ">
          <div className="flex justify-center items-center w-full">
            <img
              src="/assets/images/pengumuman.png"
              alt="Pengumuman"
              className="w-80 h-70 object-cover rounded-t-lg"
            />
          </div>
          <article className="p-4 sm:p-6 md:p-8">
            {" "}
            {/* Padding di dalam artikel */}
            <header className="mb-6 border-b-2 border-red-100 pb-6">
              {" "}
              {/* Jarak dan padding bawah lebih besar */}
              <h1 className="text-3xl sm:text-4xl font-bold text-red-700 mb-3 break-words">
                {" "}
                {/* Ukuran font judul lebih besar */}
                {pengumuman.judul}
              </h1>
              <div className="text-sm text-gray-600 flex flex-wrap items-center gap-x-3 gap-y-1">
                {" "}
                {/* Warna teks meta diubah */}
                <span>Dipublikasikan oleh:</span>
                <span className="font-semibold text-red-600">
                  {pengumuman.created_by?.nama_lengkap || "Administrator"}
                </span>{" "}
                {/* Warna nama user lebih tegas */}
                <span className="hidden sm:inline text-gray-400">|</span>
                <span className="text-gray-500">
                  {formatDate(pengumuman.created_at)}
                </span>
              </div>
            </header>
            <div
              className="prose prose-sm sm:prose-base lg:prose-lg max-w-none text-gray-800 whitespace-pre-wrap break-words"
              // Jika kontennya HTML, gunakan: dangerouslySetInnerHTML={{ __html: pengumuman.content }}
            >
              {pengumuman.content}
            </div>
            {pengumuman.file_path && (
              <div className="mt-8 pt-6 sm:mt-10 sm:pt-8 border-t border-red-100">
                {" "}
                {/* Jarak atas lebih besar */}
                <h3 className="text-lg sm:text-xl font-semibold text-red-700 mb-4 flex items-center">
                  {" "}
                  {/* Warna judul lampiran dan ukuran */}
                  <Paperclip className="w-5 h-5 mr-2 text-red-600" />
                  Lampiran
                </h3>
                <Button
                  href={getFileUrl(pengumuman.file_path)}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  size="md" // Ukuran tombol sedikit lebih besar
                  // Tombol unduh dengan tema merah-putih solid
                  className="inline-flex items-center bg-red-600 hover:bg-red-700 text-white text-xs md:teks-md  font-medium py-2.5 px-5 rounded-lg focus:ring-4 focus:ring-red-300"
                >
                  <Download className="mr-2 h-5 w-5" />
                  Unduh File (
                  {pengumuman.file_path.split(/[/\\]+/).pop() ||
                    pengumuman.file_path}
                  )
                </Button>
              </div>
            )}
          </article>
        </Card>
      </div>
    </div>
  );
};

export default PengumumanDetailPage;
