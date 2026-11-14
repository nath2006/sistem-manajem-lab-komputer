import { useRef, useState } from "react";
import FormContainer from "../../Components/FormContainer";
import {
  assetCategories,
  assetUses,
  assetFields,
  assetPayload,
} from "./assetView";
const control =
  "block min-h-11 w-full min-w-0 rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 focus:border-maroon focus:ring-maroon disabled:bg-gray-100";
export default function AssetForm({ asset, user, labs, onSave, onCancel }) {
  const [form, setForm] = useState(() => ({
    ...Object.fromEntries(assetFields.map((k) => [k, asset?.[k] ?? ""])),
    penggunaan: asset?.penggunaan || "Pembelajaran",
    kategori: asset?.kategori || "Lainnya",
    lab_id: asset?.lab_id ?? user?.lab_id_kepala ?? "",
  }));
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const lock = useRef(false);
  const head = user?.role === "Kepala Lab";
  const change = (e) => {
    const { name, value } = e.target;
    setForm((old) => ({
      ...old,
      [name]: value,
      ...(name === "penggunaan"
        ? { lab_id: value === "Operasional" ? "" : (user?.lab_id_kepala ?? "") }
        : {}),
    }));
  };
  const submit = async (e) => {
    e.preventDefault();
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await onSave(assetPayload(form));
    } catch (e) {
      setError(e.message || "Gagal menyimpan aset.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const field = (name, label, props = {}) => (
    <label
      className="block min-w-0 space-y-1 text-sm font-medium text-gray-700"
      key={name}
    >
      <span>{label}</span>
      <input
        className={control}
        name={name}
        value={form[name]}
        onChange={change}
        disabled={busy}
        {...props}
      />
    </label>
  );
  return (
    <FormContainer
      title={asset ? "Edit aset" : "Tambah aset"}
      description="Tahun pengadaan, sumber dana, dan harga beli boleh dikosongkan jika tidak diketahui. Status kondisi mengikuti pemeriksaan/perbaikan."
      onSubmit={submit}
      onCancel={onCancel}
      error={error}
      isSubmitting={busy}
    >
      <div className="grid min-w-0 gap-4 sm:grid-cols-2">
        {field("nama_perangkat", "Nama aset", {
          required: true,
          maxLength: 100,
        })}
        {field("nomor_inventaris", "Nomor inventaris", { maxLength: 50 })}
        <label className="block space-y-1 text-sm font-medium">
          <span>Penggunaan</span>
          <select
            className={control}
            name="penggunaan"
            value={form.penggunaan}
            onChange={change}
            disabled={busy || head}
          >
            {assetUses
              .filter((v) => !head || v === "Pembelajaran")
              .map((v) => (
                <option key={v}>{v}</option>
              ))}
          </select>
        </label>
        <label className="block space-y-1 text-sm font-medium">
          <span>Kategori</span>
          <select
            className={control}
            name="kategori"
            value={form.kategori}
            onChange={change}
            disabled={busy}
          >
            {assetCategories.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        {form.penggunaan === "Pembelajaran" && (
          <label className="block space-y-1 text-sm font-medium">
            <span>Laboratorium</span>
            <select
              className={control}
              name="lab_id"
              value={form.lab_id}
              onChange={change}
              required
              disabled={busy || head}
            >
              <option value="">Pilih laboratorium</option>
              {labs
                .filter(
                  (l) =>
                    !head || String(l.lab_id) === String(user.lab_id_kepala),
                )
                .map((l) => (
                  <option key={l.lab_id} value={l.lab_id}>
                    {l.nama_lab}
                  </option>
                ))}
            </select>
          </label>
        )}
        {field("lokasi", "Lokasi / ruangan", { maxLength: 150 })}
        {field("tahun_pengadaan", "Tahun pengadaan (opsional)", {
          inputMode: "numeric",
          pattern: "[0-9]{4}",
          minLength: 4,
          maxLength: 4,
          placeholder: "Tidak diketahui",
        })}
        {field("sumber_dana", "Sumber dana (opsional)", {
          maxLength: 150,
          placeholder: "Tidak diketahui",
        })}
        {field("harga_beli", "Harga beli (Rp, opsional)", {
          inputMode: "decimal",
          pattern: "[0-9]{1,13}(\\.[0-9]{1,2})?",
          placeholder: "Contoh: 2500000.00",
        })}
        <label className="block min-w-0 space-y-1 text-sm font-medium sm:col-span-2">
          <span>Spesifikasi</span>
          <textarea
            className={control}
            name="spesifikasi"
            rows={4}
            maxLength={16000}
            value={form.spesifikasi}
            onChange={change}
            disabled={busy}
          />
        </label>
      </div>
    </FormContainer>
  );
}
