import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Dashboard from "../../Layouts/Dashboard";
import { AuthContext } from "../../Context/AuthContext";
import { get, post, put, deleteData } from "../../utils/api";
import ModalContainer from "../../Components/DetailModal/ModalContainer";
import useDeletionDialog from "../../Components/Deletion/useDeletionDialog";
import useTitle from "../../utils/useTitle";
import AssetTable from "./AssetTable";
import AssetForm from "./AssetForm";
import AssetDetail from "./AssetDetail";
import { assetCategories } from "./assetView";
const filterControl =
  "min-h-11 w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:ring-maroon";
export default function AsetIT() {
  useTitle("Aset IT Operasional");
  const { state: user } = useContext(AuthContext);
  const [searchParams, setSearchParams] = useSearchParams();
  const assetId = searchParams.get("asset");
  const validAssetId = searchParams.getAll("asset").length === 1 &&
    /^[1-9]\d*$/.test(assetId || "") && Number.isSafeInteger(Number(assetId));
  const [selection, setSelection] = useState(null);
  const [detailAttempt, setDetailAttempt] = useState(0);
  // The auth reducer replaces state for each session, including same-user login.
  // Keep ownership opaque and hide obsolete details during render, before effects.
  const detailOwner = useMemo(() => ({ assetId, auth: user, attempt: detailAttempt }), [assetId, user, detailAttempt]);
  const currentSelection = selection?.owner === detailOwner ? selection : null;
  const closeDetail = () => {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      next.delete("asset");
      return next;
    });
  };
  useEffect(() => {
    setSelection(null);
    if (!validAssetId) return;
    let active = true;
    get(`/assets/${encodeURIComponent(assetId)}`)
      .then((response) => {
        if (active) setSelection({ owner: detailOwner, asset: response.data });
      })
      .catch((e) => {
        if (active) setSelection({ owner: detailOwner, error: e.message || "Gagal memuat detail aset." });
      });
    return () => { active = false; };
  }, [assetId, validAssetId, detailOwner]);
  const [data, setData] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [category, setCategory] = useState(""),
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
    } catch (e) {
      setError(e.message || "Gagal memuat aset.");
    } finally {
      setLoading(false);
    }
  }, []);
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
  const canAdd = user?.role === "Admin";
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
      a.penggunaan === "Operasional" && (!category || a.kategori === category),
  );
  return (
    <Dashboard title="Aset IT Operasional">
      <div className="min-w-0 space-y-4">
        <p className="text-sm text-gray-600">
          Inventaris IT operasional sekolah (administrasi, printer, dan jaringan).
          Perangkat pembelajaran tetap dikelola melalui Kelola Data Perangkat (Lab).
          Data pengadaan yang belum diketahui ditampilkan sebagai “-”.
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
          onDetail={(asset) => setSearchParams((previous) => {
            const next = new URLSearchParams(previous);
            next.set("asset", asset.perangkat_id);
            return next;
          })}
          onEdit={(asset) => setModal({ mode: "form", asset })}
          onDelete={requestDeletion}
        />
        {assetId !== null && (
          validAssetId && currentSelection?.asset ? (
            <AssetDetail asset={currentSelection.asset} onClose={closeDetail} />
          ) : (
            <ModalContainer title="Detail Aset IT" onClose={closeDetail}>
              {!validAssetId || currentSelection?.error ? (
                <div role="alert" className="space-y-3 text-sm text-red-800">
                  <p>{!validAssetId ? "Identitas aset tidak valid." : currentSelection.error}</p>
                  {validAssetId && (
                    <button type="button" className="min-h-11 rounded-lg border px-4" onClick={() => setDetailAttempt((previous) => previous + 1)}>
                      Muat ulang detail
                    </button>
                  )}
                </div>
              ) : (
                <p role="status">Memuat detail aset...</p>
              )}
            </ModalContainer>
          )
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
