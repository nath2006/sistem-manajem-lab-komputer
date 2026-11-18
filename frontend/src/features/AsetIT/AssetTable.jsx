import Tabel from "../../Layouts/Table";
import RowActionButton from "../../Components/RowActionButton";
import { FaEye, FaFilePen, FaTrash } from "react-icons/fa6";
import { canWriteAsset, displayPrice, displayValue } from "./assetView";
import { conditionTone } from "../../utils/dashboardTheme";
const conditionClasses = {
  success: "bg-emerald-50 text-emerald-700",
  info: "bg-blue-50 text-blue-700",
  warning: "bg-amber-50 text-amber-700",
  danger: "bg-red-50 text-red-700",
};
const headers = [
  "Nama aset",
  "No. inventaris",
  "Penggunaan",
  "Kategori",
  "Lab / lokasi",
  "Kondisi",
  "Tahun pengadaan",
  "Sumber dana",
  "Harga beli",
  "Aksi",
].map((judul) => ({ judul }));
export default function AssetTable({
  data,
  user,
  isLoading,
  renderActions,
  onDetail,
  onEdit,
  onDelete,
}) {
  return (
    <Tabel
      title="Inventaris Aset IT Operasional"
      breadcrumbContext={user?.role}
      data={data}
      headers={headers}
      isLoading={isLoading}
      renderActions={renderActions}
      itemsPerPage={10}
      renderRow={(asset) => (
        <tr
          key={asset.perangkat_id}
          className="border-b bg-white hover:bg-gray-50"
        >
          <th scope="row" className="px-6 py-4 font-semibold text-gray-900">
            {asset.nama_perangkat}
          </th>
          {[
            asset.nomor_inventaris,
            asset.penggunaan,
            asset.kategori,
            [asset.nama_lab, asset.lokasi].filter(Boolean).join(" / "),
            asset.status,
            asset.tahun_pengadaan,
            asset.sumber_dana,
            displayPrice(asset.harga_beli),
          ].map((value, i) => (
            <td className="px-6 py-4" key={i}>
              {i === 4 ? (
                <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${conditionClasses[conditionTone(value)]}`}>
                  {displayValue(value)}
                </span>
              ) : displayValue(value)}
            </td>
          ))}
          <td className="px-6 py-4">
            <div className="flex items-center gap-1">
              <RowActionButton
                label={`Lihat ${asset.nama_perangkat}`}
                onClick={() => onDetail(asset)}
              >
                <FaEye />
              </RowActionButton>
              {canWriteAsset(user, asset) && (
                <>
                  <RowActionButton
                    variant="edit"
                    label={`Edit ${asset.nama_perangkat}`}
                    onClick={() => onEdit(asset)}
                  >
                    <FaFilePen />
                  </RowActionButton>
                  <RowActionButton
                    variant="delete"
                    label={`Hapus ${asset.nama_perangkat}`}
                    onClick={() => onDelete(asset.perangkat_id)}
                  >
                    <FaTrash />
                  </RowActionButton>
                </>
              )}
            </div>
          </td>
        </tr>
      )}
    />
  );
}
