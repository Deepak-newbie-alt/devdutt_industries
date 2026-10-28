import type { Response } from "express";
import type { TcreateProductImageInput, TproductImageIdParams } from "../schemas/productImagesSchema.js";
import type { ValidatedRequest } from "../types/ValidatedRequest.js";
import { catchAsync } from "../utils/catchAsync.js";
import { productImageService } from "../services/product.images.services.js";
import ApiResponse from "../utils/ApiResponse.js";


export const createProductImage=catchAsync<ValidatedRequest<TcreateProductImageInput>>(async(req,res:Response)=>{
    const data=await productImageService.createProductImage(req.validated.body);

    res.status(201).json(
        new ApiResponse(201,"Product image created successfully",data)
    )
    return;
})

export const deleteProductImage=catchAsync<ValidatedRequest<TproductImageIdParams>>(async(req,res:Response)=>{
    await productImageService.deleteProductImage(req.validated.params);

    res.status(200).json(
        new ApiResponse(200,"Product image deleted successfully",{})
    )
    return;
})
