import prisma from "../lib/prisma.js";
import {type Request,type Response } from "express";
import { catchAsync } from "../utils/catchAsync.js";

export const createProduct=catchAsync(async(req:Request,res:Response)=>{
    const productData=req.body;
    
    const product=await prisma.product.create({
        data:productData
    })

    res.status(201).json(product);
    return;
})

export const getProducts=catchAsync(async(req:Request,res:Response)=>{
    const products=await prisma.product.findMany();
    
    res.status(200).json(products);
    return;
})
