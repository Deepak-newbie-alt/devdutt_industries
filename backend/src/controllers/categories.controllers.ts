import { type Response } from "express";
import { catchAsync } from "../utils/catchAsync.js";
import ApiResponse from "../utils/ApiResponse.js";

//types
import type { ValidatedRequest } from "../types/ValidatedRequest.js";
import type { TcreateCategoryInput, TgetCategoryByIdParams, TgetCategoryQuery, TupdateCategory } from "../schemas/categorySchema.js";
import { categoryService } from "../services/category.services.js";
import ApiError from "../utils/ApiError.js";

export const createCategory=catchAsync<ValidatedRequest<TcreateCategoryInput>>(async(req,res:Response)=>{

    const data=await categoryService.createCategory(req.validated.body);

    res.status(201).json(
        new ApiResponse(201,"Category created successfully",data)
    );
    return;
})

export const getCategories=catchAsync<ValidatedRequest<TgetCategoryQuery>>(async(req,res:Response)=>{
    
    const data=await categoryService.getCategories(req.validated.query);

    res.status(200).json(
        new ApiResponse(200,"Category fetched successfully",data)
    );
    return;
})

export const getCategoryById=catchAsync<ValidatedRequest<TgetCategoryByIdParams>>(async(req,res:Response)=>{

    const data=await categoryService.getCategoryById(req.validated.params);

    if(!data){
        throw new ApiError(404,"Category not found");
    }

    res.status(200).json(
        new ApiResponse(200,"Category by id fetched successfully",data)
    )
    return;
})

export const updateCategory=catchAsync<ValidatedRequest<TupdateCategory>>(async(req,res:Response)=>{

    const category=await categoryService.updateCategory(req.validated.params,req.validated.body);

    res.status(200).json(
        new ApiResponse(200,"Category updated successfully",category)
    )

    return;
})