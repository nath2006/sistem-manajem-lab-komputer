import { useCallback, useContext, useEffect, useState } from "react";
import Dashboard from "../../Layouts/Dashboard";
import { AuthContext } from "../../Context/AuthContext";
import { get, post, put, deleteData } from "../../utils/api";
import ModalContainer from "../../Components/DetailModal/ModalContainer";
import useDeletionDialog from "../../Components/Deletion/useDeletionDialog";
import useTitle from "../../utils/useTitle";
import AssetTable from "./AssetTable";
import AssetForm from "./AssetForm";
import AssetDetail from "./AssetDetail";
import { assetUses, assetCategories } from "./assetView";
const filterControl =
  "min-h-11 w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:ring-maroon";
export default function AsetIT() {
  useTitle("Aset IT Sekolah");
  const { state: user } = useContext(AuthContext);
  const [data, setData] = useState([]),
    [labs, setLabs] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [use, setUse] = useState(""),
    [category, setCategory] = useState(""),
    [modal, setModal] = useState(null),
    [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await get("/assets");
      if (!Array.isArray(response.data))
        throw Error("Format daftar aset tidak valid.");
      setData(response.data);
      if (["Admin", "Kepala Lab"].includes(user?.role)) {
        const labsResponse = await get("/lab");
        if (!Array.isArray(labsResponse.data))
          throw Error("Format daftar laboratorium tidak valid.");
        setLabs(labsResponse.data);
      }
    } catch (e) {
      setError(e.message || "Gagal memuat aset.");
    } finally {
      setLoading(false);
    }
  }, [user?.role]);
  useEffect(() => {
    load();
  }, [load]);
  const { requestDeletion, dialog } = useDeletionDialog({
    resource: "perangkat",
    itemName: "aset IT",
    onDelete: (id) => deleteData(`/assets/${id}`),
    onSuccess: (id) => {
      setData((old) => old.filter((p) => p.perangkat_id !== id));
      setNotice("Aset berhasil dihapus.");
    },
    onError: (e) => setError(e.message || "Gagal menghapus aset."),
  });
  const canAdd =
    user?.role === "Admin" ||
    (user?.role === "Kepala Lab" && !!user.lab_id_kepala);
  const save = async (body) => {
    setSaving(true);
    try {
      const response = modal.asset
        ? await put(`/assets/${modal.asset.perangkat_id}`, body)
        : await post("/assets", body);
      const saved = response.data.data;
      setData((old) =>
        [
          ...old.filter((p) => p.perangkat_id !== saved.perangkat_id),
          saved,
        ].sort((a, b) => a.nama_perangkat.localeCompare(b.nama_perangkat)),
      );
      setModal(null);
      setNotice(response.data.message);
    } finally {
      setSaving(false);
    }
  };
  const visible = data.filter(
    (a) =>
      (!use || a.penggunaan === use) && (!category || a.kategori === category),
  );
  return (
    <Dashboard title="Aset IT Sekolah">
      <div className="min-w-0 space-y-4">
        <p className="text-sm text-gray-600">
          Inventaris perangkat pembelajaran dan operasional sekolah. Data
          pengadaan yang belum diketahui ditampilkan sebagai “-”.
        </p>
        {error && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            <p>{error}</p>
            <button
              type="button"
              className="mt-2 min-h-11 rounded-lg border border-red-300 px-4 hover:bg-red-100"
              onClick={load}
            >
              Muat ulang
            </button>
          </div>
        )}
        {notice && (
          <p
            role="status"
            className="rounded-lg bg-green-50 p-3 text-sm text-green-800"
          >
            {notice}
          </p>
        )}
        <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:flex lg:items-end">
          <label className="min-w-0 flex-1 space-y-1 text-sm font-medium text-gray-700">
            <span>Penggunaan aset</span>
            <select
              aria-label="Filter penggunaan"
              className={filterControl}
              value={use}
              onChange={(e) => setUse(e.target.value)}
            >
              <option value="">Semua penggunaan</option>
              {assetUses.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <label className="min-w-0 flex-1 space-y-1 text-sm font-medium text-gray-700">
            <span>Kategori aset</span>
            <select
              aria-label="Filter kategori"
              className={filterControl}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">Semua kategori</option>
              {assetCategories.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          {canAdd && (
            <button
              type="button"
              disabled={loading || !!error}
              className="min-h-11 rounded-lg bg-maroon px-4 py-2.5 text-sm font-semibold text-white hover:bg-maroon/90 focus-visible:ring-2 focus-visible:ring-maroon disabled:opacity-50"
              onClick={() => setModal({ mode: "form" })}
            >
              Tambah aset
            </button>
          )}
        </div>
        <AssetTable
          data={visible}
          user={user}
          isLoading={loading}
          onDetail={(asset) => setModal({ mode: "detail", asset })}
          onEdit={(asset) => setModal({ mode: "form", asset })}
          onDelete={requestDeletion}
        />
        {modal?.mode === "detail" && (
          <AssetDetail asset={modal.asset} onClose={() => setModal(null)} />
        )}
        {modal?.mode === "form" && (
          <ModalContainer
            title={modal.asset ? "Edit Aset IT" : "Tambah Aset IT"}
            onClose={() => setModal(null)}
            isBusy={saving}
          >
            <AssetForm
              asset={modal.asset}
              user={user}
              labs={labs}
              onSave={save}
              onCancel={() => setModal(null)}
            />
          </ModalContainer>
        )}
        {dialog}
      </div>
    </Dashboard>
  );
}
