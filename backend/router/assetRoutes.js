import express from "express";
import { requireAssetSchema } from "../services/assetSchemaService.js";
import { createAssetController } from "../controllers/assetController.js";
export function createAssetRouter(db, authenticate) {
  const router = express.Router();
  router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  router.use(authenticate);
  router.use(async (req, res, next) => {
    try {
      await requireAssetSchema(db);
      next();
    } catch (e) {
      res
        .status(e.status || 500)
        .json({
          message: e.status ? e.message : "Gagal memeriksa skema aset.",
          ...(e.code === "ASSET_SCHEMA_REQUIRED" ? { code: e.code } : {}),
        });
    }
  });
  const c = createAssetController(db);
  const write = (req, res, next) =>
    ["Admin", "Kepala Lab"].includes(req.user?.role)
      ? next()
      : res
          .status(403)
          .json({ message: "Anda hanya memiliki akses baca aset." });
  router.get("/", c.list);
  router.get("/:id", c.get);
  router.post("/", write, c.create);
  router.put("/:id", write, c.update);
  router.delete("/:id", write, c.remove);
  return router;
}
