import express from "express";
import { validator } from "../middlewares/validationMiddleware.js";
import {
    changeUserRoleSchema,
    createUserSchema,
    idParamsSchema,
    listUsersQuerySchema,
    updateProfileSchema,
    updateUserStatusSchema,
} from "../schemas/userSchema.js";

import {
    createSalesman,
    getCurrentUser,
    getUserById,
    listUsers,
    updateProfile,
    changeUserRole,
    updateUserStatus,
} from "../controllers/users.controllers.js";
import { auth, isAdmin } from "../middlewares/authMiddleware.js";
const router=express.Router();

router.post("/",auth,isAdmin,validator(createUserSchema),createSalesman);
router.get("/me", getCurrentUser);
router.get("/",auth,isAdmin,validator(listUsersQuerySchema), listUsers);
router.get("/:id",auth,isAdmin,validator(idParamsSchema), getUserById);
router.patch("/:id/profile",auth,validator(updateProfileSchema), updateProfile);
router.patch("/:id/role",auth,isAdmin,validator(changeUserRoleSchema), changeUserRole);
router.patch("/:id/status",auth,isAdmin,validator(updateUserStatusSchema), updateUserStatus);

export default router;