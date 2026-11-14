import ModalContainer from "../../Components/DetailModal/ModalContainer";
import { displayPrice, displayValue } from "./assetView";
export default function AssetDetail({ asset, onClose }) {
  const fields = [
    ["Nomor inventaris", asset.nomor_inventaris],
    ["Penggunaan", asset.penggunaan],
    ["Kategori", asset.kategori],
    ["Laboratorium", asset.nama_lab],
    ["Lokasi", asset.lokasi],
    ["Kondisi", asset.status],
    ["Tahun pengadaan", asset.tahun_pengadaan],
    ["Sumber dana", asset.sumber_dana],
    ["Harga beli", displayPrice(asset.harga_beli)],
    ["Spesifikasi", asset.spesifikasi],
  ];
  return (
    <ModalContainer
      title={asset.nama_perangkat}
      subtitle="Detail Aset IT Sekolah"
      onClose={onClose}
    >
      <dl className="grid min-w-0 gap-4 sm:grid-cols-2">
        {fields.map(([label, value]) => (
          <div className="min-w-0 rounded-lg bg-gray-50 p-3" key={label}>
            <dt className="text-xs font-semibold text-gray-500">{label}</dt>
            <dd className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-900">
              {displayValue(value)}
            </dd>
          </div>
        ))}
      </dl>
    </ModalContainer>
  );
}
