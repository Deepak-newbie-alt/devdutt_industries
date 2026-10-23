import express from "express";
import { auth, isAdmin } from "../middlewares/authMiddleware.js";
import { validator } from "../middlewares/validationMiddleware.js";
import { createCompanySettingsSchema } from "../schemas/companySettingsSchema.js";
import { createCompanySettings, deleteCompanySettings, getCompanySettings, updateCompanySettings } from "../controllers/company.settings.controllers.js";
const router=express.Router();

router.post("/",auth,isAdmin,validator(createCompanySettingsSchema),createCompanySettings);
router.get("/",auth,getCompanySettings);
router.patch("/",auth,isAdmin,updateCompanySettings);
router.delete("/",auth,isAdmin,deleteCompanySettings);

export default router;