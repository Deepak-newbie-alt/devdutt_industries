import prisma from "../lib/prisma.js";
import { type Request,type Response } from "express";
import { catchAsync } from "../utils/catchAsync.js";

export const createCategory=catchAsync(async(req:Request,res:Response)=>{
    const categoryData=req.body;

    const category=await prisma.category.create({
        data:categoryData
    })

    res.status(201).json(category);
    return;
})

export const getCategories=catchAsync(async(req:Request,res:Response)=>{
    const category=await prisma.category.findMany();

    res.status(200).json(category);
    return;
})