import type { Response } from "express";
import { catchAsync } from "../utils/catchAsync.js";
import ApiResponse from "../utils/ApiResponse.js";
import { analyticsService } from "../services/analytics.services.js";

export const getSummary=catchAsync(async(req,res:Response)=>{
    const data=await analyticsService.getSummary();

    res.status(200).json(
        new ApiResponse(200,"Summary fetched successfully",data)
    )
    return;
})
