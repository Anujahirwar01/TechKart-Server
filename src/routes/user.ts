import express from 'express';
import { deleteUser, newUser, getAllUsers, getUser } from '../controllers/user.js';
import { adminOnly } from '../middlewares/auth.js';

const router = express.Router();

router.post('/new', newUser);
router.get("/all",adminOnly, getAllUsers);
router.get("/:id", getUser);
router.delete("/:id", deleteUser);

export default router;