import express from "express";
import { auth, isAdmin } from "../middlewares/authMiddleware.js";
import { getSummary } from "../controllers/analytics.controllers.js";
const router=express.Router();

router.get("/summary",auth,isAdmin,getSummary);

export default router;
