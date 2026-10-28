import type { Response } from "express";
import type { TcreateProductBrochureInput, TproductBrochureIdParams } from "../schemas/productBrochureSchema.js";
import type { ValidatedRequest } from "../types/ValidatedRequest.js";
import { catchAsync } from "../utils/catchAsync.js";
import { productBrochureService } from "../services/product.brochures.services.js";
import ApiResponse from "../utils/ApiResponse.js";


export const createProductBrochure=catchAsync<ValidatedRequest<TcreateProductBrochureInput>>(async(req,res:Response)=>{
    const data=await productBrochureService.createProductBrochure(req.validated.body);

    res.status(201).json(
        new ApiResponse(201,"Product brochure created successfully",data)
    )
    return;
})

export const deleteProductBrochure=catchAsync<ValidatedRequest<TproductBrochureIdParams>>(async(req,res:Response)=>{
    await productBrochureService.deleteProductBrochure(req.validated.params);

    res.status(200).json(
        new ApiResponse(200,"Product brochure deleted successfully",{})
    )
    return;
})
