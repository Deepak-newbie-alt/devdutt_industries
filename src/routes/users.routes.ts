import express from "express";
import { validator } from "../middlewares/validationMiddleware.js";
import { createUserSchema } from "../schemas/userSchema.js";

import {
    createSalesman,
    getCurrentUser,
    getUserById,
    listUsers,
    updateProfile,
    changeUserRole,
    updateUserStatus,
} from "../controllers/users.controllers.js";
const router=express.Router();

router.post("/",validator(createUserSchema),createSalesman);
router.get("/me", getCurrentUser);
router.get("/", listUsers);
router.get("/:id", getUserById);
router.patch("/:id/profile", updateProfile);
router.patch("/:id/role", changeUserRole);
router.patch("/:id/status", updateUserStatus);

export default router;