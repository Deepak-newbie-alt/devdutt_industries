import prisma from "../lib/prisma.js";
import { type Request,type Response } from "express";
import { catchAsync } from "../utils/catchAsync.js";

export const createCategory=catchAsync(async(req:Request,res:Response)=>{

    const category=await prisma.category.create({
        data:{
            name:req.body.name,
            slug:req.body.slug,
            description:req.body.description,
            displayOrder:req.body.displayOrder,
            status:req.body.status
        }
    })

    res.status(201).json(category);
    return;
})

export const getCategories=catchAsync(async(req:Request,res:Response)=>{
    const category=await prisma.category.findMany();

    res.status(200).json(category);
    return;
})