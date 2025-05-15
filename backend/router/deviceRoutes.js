import express from "express";
import {
  createDevice,
  getAllDevice,
  getDeviceById,
  updateDevice,
  deleteDevice,
} from "../controllers/deviceController.js";
import { 
  verifyToken,
  authorizeRoles
} from '../middleware/authMiddleware.js';
import { multerUpload } from '../utils/multer.js';

const router = express.Router();

router.get("/", verifyToken, getAllDevice);
router.get("/:id", verifyToken, getDeviceById);

router.post("/create",
  verifyToken,
  authorizeRoles(["Admin", "Kepala Lab"]),
  multerUpload.single("foto_perangkat"),
  createDevice
);

router.put("/update/:id",
  verifyToken,
  authorizeRoles(["Admin", "Kepala Lab"]),
  multerUpload.single("foto_perangkat"),
  updateDevice
);


router.delete('/delete/:id', 
  verifyToken,
  authorizeRoles(["Admin","Kepala Lab"]),
  deleteDevice
);

export default router;
