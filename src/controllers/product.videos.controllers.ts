import type { Response } from "express";
import type { TcreateProductVideoInput } from "../schemas/productVideosSchema.js";
import { productVideoService } from "../services/product.videos.services.js";
import type { ValidatedRequest } from "../types/ValidatedRequest.js";
import { catchAsync } from "../utils/catchAsync.js";
import ApiResponse from "../utils/ApiResponse.js";


export const createProductVideo=catchAsync<ValidatedRequest<TcreateProductVideoInput>>(async(req,res:Response)=>{
    const data=await productVideoService.createProductVideo(req.validated.body);

    res.status(201).json(
        new ApiResponse(201,"Product video created successfully",data)
    )
    return;
})