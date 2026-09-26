import type { Response } from "express";
import { catchAsync } from "../utils/catchAsync.js";

import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { productService } from "../services/product.services.js";
//types
import type { TcreateProductBody,TgetProductQuery,TgetProductByIdParams, TupdateProductById } from "../schemas/productSchema.js";
import type { ValidatedRequest } from "../types/ValidatedRequest.js";


export const createProduct=catchAsync<ValidatedRequest<TcreateProductBody>>(async(req,res:Response)=>{
    
    const product=await productService.createProduct(req.validated.body);

    res.status(201).json(
        new ApiResponse(201,"Product created successfully",product)
    )
    return;
})

export const getProducts=catchAsync<ValidatedRequest<TgetProductQuery>>(async(req,res:Response)=>{

    const data=await productService.findProducts(req.validated.query);

    res.status(200).json(
        new ApiResponse(200,"Product fetched successfully",data)
    )
    return;
})

export const getProductById=catchAsync<ValidatedRequest<TgetProductByIdParams>>(async(req,res:Response)=>{

    const product=await productService.findProductById(req.validated.params);

    if(!product){
        throw new ApiError(404,"Product not found");
    }

    res.status(200).json(
        new ApiResponse(200,"Product by id fetched successfully",product)
    )
    return;
})

export const updateProduct=catchAsync<ValidatedRequest<TupdateProductById>>(async(req,res:Response)=>{

    const data=await productService.updateProduct(req.validated.params,req.validated.body);

    if(!data){
        throw new ApiError(404,"Product not found");
    }

    res.status(200).json(
        new ApiResponse(200,"Product updated successfully",data)
    )
    return;
})

export const deleteProductById=catchAsync<ValidatedRequest<TgetProductByIdParams>>(async(req,res:Response)=>{
    await productService.deleteProductById(req.validated.params);


    res.status(200).json(
        new ApiResponse(200,'Product deleted successfully',{})
    )
    return;
})