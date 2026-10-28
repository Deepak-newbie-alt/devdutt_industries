import express from "express";
import { auth, isAdmin } from "../middlewares/authMiddleware.js";
import { validator } from "../middlewares/validationMiddleware.js";
import { createCompanySettingsSchema, updateCompanySettingsSchema } from "../schemas/companySettingsSchema.js";
import { createCompanySettings, getCompanySettings, getPublicCompanyInfo, updateCompanySettings } from "../controllers/company.settings.controllers.js";
const router=express.Router();

router.post("/",auth,isAdmin,validator(createCompanySettingsSchema),createCompanySettings);
router.get("/",auth,getCompanySettings);
// Public website: an allowlisted subset only (see publicCompanyInfoSelect).
router.get("/public",getPublicCompanyInfo);
router.patch("/",auth,isAdmin,validator(updateCompanySettingsSchema),updateCompanySettings);

export default router;