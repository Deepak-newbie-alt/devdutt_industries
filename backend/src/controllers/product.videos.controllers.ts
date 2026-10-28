import type { Response } from "express";
import type { TcreateProductVideoInput, TproductVideoIdParams } from "../schemas/productVideosSchema.js";
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

export const deleteProductVideo=catchAsync<ValidatedRequest<TproductVideoIdParams>>(async(req,res:Response)=>{
    await productVideoService.deleteProductVideo(req.validated.params);

    res.status(200).json(
        new ApiResponse(200,"Product video deleted successfully",{})
    )
    return;
})
