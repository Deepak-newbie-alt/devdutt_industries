import express from "express";
import { validator } from "../middlewares/validationMiddleware.js";
import { createUserSchema } from "../schemas/userSchema.js";
import { createSalesman } from "../controllers/users.controllers.js";
const router=express.Router();

router.post("/",validator(createUserSchema),createSalesman);

export default router;