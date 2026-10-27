import type { Response } from "express";
import type { TrequestOtpChallenge } from "../schemas/customerOtpSchema.js";
import type { ValidatedRequest } from "../types/ValidatedRequest.js";
import { catchAsync } from "../utils/catchAsync.js";
import { CustomerOtpService } from "../services/customer.otp.services.js";
import ApiResponse from "../utils/ApiResponse.js";


export const requestOtpChallenge=catchAsync<ValidatedRequest<TrequestOtpChallenge>>(async(req,res:Response)=>{
    const data=await CustomerOtpService.requestChallenge(req.validated.body,req.ip ?? "");

    // Same response whether or not a code was actually sent.
    res.status(202).json(
        new ApiResponse(202,"If the request is eligible, a verification code has been sent",data)
    )
    return;
})
