import express from 'express';
import { 
  createUser, 
  getAllUser,
  getUserById, 
  updateUser, 
  deleteUser 
} from '../controllers/userController.js';

const router = express.Router();

router.get("/", getAllUser);
router.get("/detail/:id", getUserById);
router.delete("/delete/:id", deleteUser);
router.post('/create', createUser);
router.put('/update/:id', updateUser);

export default router;
