import express from 'express';
import { 
  createUser, 
  getAllUser,
  getUserById, 
  updateUser, 
  deleteUser 
} from '../controllers/userController.js';
import { 
  verifyToken,
  authorizeRoles
} from '../middleware/authMiddleware.js';
const router = express.Router();

router.get("/", verifyToken, getAllUser);
router.get("/detail/:id",verifyToken, getUserById);

router.post('/create', 
  verifyToken,
  authorizeRoles(["Admin"]),
  createUser);

router.put('/update/:id',
  verifyToken,
  authorizeRoles(["Admin"]),
  updateUser);

router.delete("/delete/:id",
  verifyToken,
  authorizeRoles(["Admin"]),
  deleteUser
);

export default router;
