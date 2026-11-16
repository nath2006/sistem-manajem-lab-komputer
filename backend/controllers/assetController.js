import { createAssetService } from "../services/assetService.js";
import { existsSync, unlinkSync } from "node:fs";
import { basename, resolve } from "node:path";
export function createAssetController(
  db,
  {
    removeImage = (filename) => {
      const path = resolve("uploads/perangkat", basename(filename));
      if (existsSync(path)) unlinkSync(path);
    },
  } = {},
) {
  const service = createAssetService(db);
  const handle = (fn) => async (req, res) => {
    try {
      await fn(req, res);
    } catch (error) {
      const duplicate = error.code === "ER_DUP_ENTRY";
      const deadlock = ["ER_LOCK_DEADLOCK", "ER_LOCK_WAIT_TIMEOUT"].includes(
        error.code,
      );
      const status = duplicate || deadlock ? 409 : error.status || 500;
      res
        .status(status)
        .json({
          message: duplicate
            ? "Nomor inventaris sudah digunakan."
            : deadlock
              ? "Data sedang diubah. Muat ulang dan coba kembali."
              : error.status
                ? error.message
                : "Gagal memproses aset.",
          ...(error.data ? { data: error.data } : {}),
        });
    }
  };
  return {
    list: handle(async (req, res) =>
      res.json({
        data: await service.list(),
        message: "Daftar aset berhasil dimuat.",
      }),
    ),
    get: handle(async (req, res) =>
      res.json({
        data: await service.get(req.params.id),
        message: "Aset berhasil dimuat.",
      }),
    ),
    create: handle(async (req, res) =>
      res
        .status(201)
        .json({
          data: await service.create(req.user, req.body),
          message: "Aset berhasil ditambahkan.",
        }),
    ),
    update: handle(async (req, res) =>
      res.json({
        data: await service.update(req.user, req.params.id, req.body),
        message: "Aset berhasil diperbarui.",
      }),
    ),
    remove: handle(async (req, res) => {
      const row = await service.remove(req.user, req.params.id);
      if (row.foto_perangkat) {
        try {
          removeImage(row.foto_perangkat);
        } catch {
          /* deletion committed, cleanup best effort */
        }
      }
      res.json({ message: "Aset berhasil dihapus." });
    }),
  };
}
