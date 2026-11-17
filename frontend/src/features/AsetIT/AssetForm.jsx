import { useRef, useState } from "react";
import FormContainer from "../../Components/FormContainer";
import {
  assetCategories,
  assetConditions,
  assetFields,
  assetPayload,
} from "./assetView";
const control =
  "block min-h-11 w-full min-w-0 rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 focus:border-maroon focus:ring-maroon disabled:bg-gray-100";
export default function AssetForm({ asset, onSave, onCancel }) {
  const [form, setForm] = useState(() => ({
    ...Object.fromEntries(assetFields.map((k) => [k, asset?.[k] ?? ""])),
    penggunaan: "Operasional",
    status: asset ? (asset.status ?? "") : "Baik",
    kategori: asset?.kategori || "Lainnya",
    lab_id: null,
  }));
  const [jumlah, setJumlah] = useState(1);
  const batch = !asset && Number(jumlah) > 1;
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const lock = useRef(false);

  const change = (e) => {
    const { name, value } = e.target;
    setForm((old) => ({
      ...old,
      [name]: value,

    }));
  };
  const submit = async (e) => {
    e.preventDefault();
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const count = Number(jumlah);
      if (!asset && (!/^\d+$/.test(String(jumlah)) || !Number.isInteger(count) || count < 1 || count > 100)) {
        throw Error("Jumlah unit harus bilangan bulat 1–100.");
      }
      const body = assetPayload(form);
      if (batch) {
        const prefix = form.nomor_inventaris;
        if (!prefix || prefix !== prefix.trim() || [...prefix].length > 46) throw Error("Awalan nomor inventaris wajib diisi, maksimal 46 karakter, tanpa spasi di awal atau akhir.");
        delete body.nomor_inventaris;
        await onSave({ jumlah: count, awalan_nomor_inventaris: prefix, aset: body });
      } else {
        await onSave(body);
      }
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
      description="Tahun pengadaan, sumber dana, dan harga beli boleh dikosongkan jika tidak diketahui. Kondisi dapat diedit jika tidak ada temuan aktif. Temuan aktif diselesaikan melalui Troubleshoot / Perbaikan."
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
        {!asset && <label className="block space-y-1 text-sm font-medium">
          <span>Jumlah unit</span>
          <input className={control} name="jumlah" type="number" min={1} max={100} step={1}
            required value={jumlah} disabled={busy} onChange={(e) => setJumlah(e.target.value)} />
        </label>}
        {field("nomor_inventaris", batch ? "Awalan nomor inventaris" : "Nomor inventaris", {
          maxLength: batch ? 46 : 50, required: batch,
        })}
        {batch && <p className="text-sm text-gray-600 sm:col-span-2" role="status">
          Pratinjau: {form.nomor_inventaris || "AWALAN"}-001 sampai {form.nomor_inventaris || "AWALAN"}-{String(Number(jumlah)).padStart(3, "0")}.
          Setiap unit dicatat terpisah agar kondisi dan riwayatnya dapat dilacak. QR diterbitkan untuk masing-masing unit melalui detail aset.
        </p>}
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
        <label className="block space-y-1 text-sm font-medium">
          <span>Kondisi</span>
          <select className={control} name="status" value={form.status}
            onChange={change} disabled={busy || asset?.condition_editable === false}
            aria-describedby="asset-condition-help">
            {form.status === "" && <option value="">Belum tercatat (pertahankan)</option>}
            {assetConditions.map((value) => <option key={value}>{value}</option>)}
          </select>
          <p id="asset-condition-help" className="text-sm font-normal text-gray-600">
            {asset?.condition_edit_reason || "Ubah kondisi manual hanya jika tidak ada temuan pemeriksaan / troubleshoot aktif. Kondisi temuan aktif mengikuti hasil perbaikan teknisi."}
          </p>
        </label>
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
        {field("harga_beli", "Harga beli PER UNIT (Rp, opsional)", {
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
