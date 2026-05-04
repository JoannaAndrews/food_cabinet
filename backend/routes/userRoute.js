import express from 'express';
import { getCurrentUser, loginUser, registerUser, updatePassword, updateProfile, switchFillSub, switchEmptySub, notifyUser } from '../controllers/UserController.js';
import authMiddleware from '../middleware/auth.js';

const userRouter = express.Router();

userRouter.post("/register", registerUser);
userRouter.post("/login", loginUser);

//protected routes *user must be logged in
userRouter.get("/me", authMiddleware, getCurrentUser);
userRouter.put("/profile", authMiddleware, updateProfile);
userRouter.put("/password", authMiddleware, updatePassword);
userRouter.patch("/subscription/fill", authMiddleware, switchFillSub);
userRouter.patch("/subscription/empty", authMiddleware, switchEmptySub);
userRouter.post("/notify", authMiddleware, notifyUser);

export default userRouter;