import express from "express";
import { auth, isAdmin } from "../middlewares/authMiddleware.js";
import { validator } from "../middlewares/validationMiddleware.js";
import { createCompanySettingsSchema, updateCompanySettingsSchema } from "../schemas/companySettingsSchema.js";
import { createCompanySettings, getCompanySettings, updateCompanySettings } from "../controllers/company.settings.controllers.js";
const router=express.Router();

router.post("/",auth,isAdmin,validator(createCompanySettingsSchema),createCompanySettings);
router.get("/",auth,getCompanySettings);
router.patch("/",auth,isAdmin,validator(updateCompanySettingsSchema),updateCompanySettings);

export default router;