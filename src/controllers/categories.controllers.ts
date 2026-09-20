import prisma from "../lib/prisma.js";
import { type Request,type Response } from "express";
import { catchAsync } from "../utils/catchAsync.js";
import ApiResponse from "../utils/ApiResponse.js";

//types
import type { ValidatedRequest } from "../types/VatidatedRequest.js";
import type { TcreateCategoryInput } from "../schemas/categorySchema.js";

export const createCategory=catchAsync<ValidatedRequest<TcreateCategoryInput>>(async(req,res:Response)=>{

    const category=await prisma.category.create({
        data:{
            name:req.validated.body.name,
            slug:req.validated.body.slug,
            description:req.validated.body.description ?? null,
            displayOrder:req.validated.body.displayOrder,
            status:req.validated.body.status
        }
    })

    res.status(201).json(
        new ApiResponse(201,"Category created successfully",category)
    );
    return;
})

export const getCategories=catchAsync(async(req:Request,res:Response)=>{
    const category=await prisma.category.findMany({
        include:{
            products:{
                select:{
                    id:true,
                    name:true,
                    price:true,
                    unit:true
                }
            }
        }
    });

    res.status(200).json(
        new ApiResponse(200,"category fetched successfully",category)
    );
    return;
})