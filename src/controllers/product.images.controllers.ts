import type { Response } from "express";
import type { TcreateProductImageInput } from "../schemas/productImagesSchema.js";
import type { ValidatedRequest } from "../types/ValidatedRequest.js";
import { catchAsync } from "../utils/catchAsync.js";
import { productImageService } from "../services/product.images.services.js";
import ApiResponse from "../utils/ApiResponse.js";


export const createProductImage=catchAsync<ValidatedRequest<TcreateProductImageInput>>(async(req,res:Response)=>{
    const data=await productImageService.createProductImage(req.validated.body);

    res.status(200).json(
        new ApiResponse(200,"Product image created successfully",data)
    )
    return;
})