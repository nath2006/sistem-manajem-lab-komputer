import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ModalContainer from '../DetailModal/ModalContainer';
import LoadingSkeleton from '../Loading/Skeleton';
import api from '../../utils/api';
import {
  safeRelatedPath,
  validDeletionPreview,
} from '../../utils/deletionContext';

const button =
  'min-h-11 rounded-md border border-maroon px-4 py-2 font-semibold text-maroon transition hover:bg-maroon/10 focus-visible:ring-2 focus-visible:ring-maroon disabled:opacity-50';
const fetchDefault = async (resource, id, options) =>
  (await api.get(`/deletion/${resource}/${encodeURIComponent(id)}`, options))
    .data.data;
const publicMessage = (error, fallback) => {
  const body = error?.response?.data || error;
  return !(body instanceof Error) && typeof body?.message === 'string'
    ? body.message
    : fallback;
};

export default function DeletionDialog({
  resource,
  id,
  itemName = 'data',
  onDelete,
  onSuccess,
  onError,
  onClose,
  fetchPreview = fetchDefault,
}) {
  const navigate = useNavigate();
  const [request, setRequest] = useState(0);
  const [state, setState] = useState({
    loading: true,
    preview: null,
    error: '',
  });
  const [saving, setSaving] = useState(false);
  const lock = useRef(false);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setState({ loading: true, preview: null, error: '' });
    Promise.resolve()
      .then(() => fetchPreview(resource, id, { signal: controller.signal }))
      .then((preview) => {
        if (!validDeletionPreview(preview, resource, id))
          throw new Error('Invalid deletion preview');
        if (active) setState({ loading: false, preview, error: '' });
      })
      .catch((failure) => {
        if (active)
          setState({
            loading: false,
            preview: null,
            error: publicMessage(
              failure,
              'Belum dapat memeriksa keterkaitan data. Coba lagi sebelum menghapus.'
            ),
          });
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [resource, id, request, fetchPreview]);

  const remove = async () => {
    if (lock.current || state.loading || !state.preview?.can_delete) return;
    lock.current = true;
    setSaving(true);
    setState((previous) => ({ ...previous, error: '' }));
    try {
      await onDelete(id);
    } catch (failure) {
      const preview = (failure?.response?.data || failure)?.data;
      const message = publicMessage(
        failure,
        'Penghapusan belum berhasil. Periksa kembali keterkaitannya.'
      );
      setState((previous) => ({
        ...previous,
        loading: false,
        preview: validDeletionPreview(preview, resource, id)
          ? preview
          : previous.preview,
        error: message,
      }));
      onError?.(new Error(message));
      return;
    } finally {
      lock.current = false;
      setSaving(false);
    }
    onClose();
    onSuccess?.(id);
  };
  const preview = state.preview;
  const blocked = preview && !preview.can_delete;
  return (
    <ModalContainer
      title={blocked ? 'Data masih terhubung' : 'Periksa sebelum menghapus'}
      onClose={onClose}
      isBusy={saving}
      secondaryButton={
        <button
          type="button"
          disabled={saving}
          className={button}
          onClick={onClose}
        >
          Batal
        </button>
      }
      primaryButton={
        preview?.can_delete ? (
          <button
            type="button"
            disabled={saving}
            className={`${button} bg-maroon text-white hover:bg-maroon/90`}
            onClick={remove}
          >
            {saving ? 'Menghapus...' : 'Ya, hapus data ini'}
          </button>
        ) : null
      }
    >
      <div className="space-y-4">
        <p className="break-words font-semibold text-maroon">
          {preview?.label || itemName}
        </p>
        {state.loading && (
          <LoadingSkeleton
            variant="detail"
            label="Memeriksa data yang saling terhubung..."
          />
        )}
        {state.error && (
          <p
            role="alert"
            className="rounded-md border border-maroon bg-maroon/10 p-3 text-gray-800"
          >
            {state.error}
          </p>
        )}
        {!state.loading && !preview && (
          <button
            type="button"
            className={button}
            onClick={() => setRequest((value) => value + 1)}
          >
            Coba periksa lagi
          </button>
        )}
        {preview && (
          <>
            <p className="rounded-md bg-maroon/10 p-3 text-gray-800">
              {preview.message ||
                (blocked
                  ? 'Selesaikan keterkaitan di bawah sebelum menghapus data induk.'
                  : 'Tidak ada keterkaitan yang menghalangi penghapusan.')}
            </p>
            {preview.retained &&
              ['pengecekan', 'perbaikan'].includes(resource) && (
                <p className="text-sm text-gray-700">
                  Data ini merupakan riwayat yang dipertahankan. Gunakan edit
                  untuk koreksi, bukan menghapus riwayat.
                </p>
              )}
            {preview.blockers.length > 0 && (
              <ul
                className="space-y-3"
                aria-label="Data terkait yang menghalangi penghapusan"
              >
                {preview.blockers.map((blocker, index) => (
                  <li
                    key={`${blocker.key}-${index}`}
                    className="space-y-2 rounded-lg border border-gray-200 p-3"
                  >
                    <p className="font-semibold">
                      {blocker.label}: {blocker.count}
                    </p>
                    <p className="break-words text-sm text-gray-700">
                      {blocker.message}
                    </p>
                    {safeRelatedPath(blocker.path) && (
                      <button
                        type="button"
                        disabled={saving}
                        className={button}
                        onClick={() => {
                          onClose();
                          navigate(blocker.path, {
                            state: {
                              deletionContext: {
                                resource,
                                id: Number(id),
                                label: preview.label || itemName,
                              },
                            },
                          });
                        }}
                      >
                        {blocker.action || 'Lihat data terkait'}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {!blocked && (
              <p className="text-sm text-gray-600">
                Penghapusan bersifat permanen. Tidak ada data lain yang dihapus
                otomatis. Keterkaitan diperiksa lagi oleh server saat menghapus.
              </p>
            )}
          </>
        )}
      </div>
    </ModalContainer>
  );
}
