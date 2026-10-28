import express from "express";
import { requestOtpChallengeSchema } from "../schemas/customerOtpSchema.js";
import { requestOtpChallenge } from "../controllers/customer.otp.controllers.js";
import { validator } from "../middlewares/validationMiddleware.js";
const router=express.Router();

router.post("/challenges",validator(requestOtpChallengeSchema),requestOtpChallenge);

export default router;
