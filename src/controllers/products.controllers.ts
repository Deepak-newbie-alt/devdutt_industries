import prisma from "../lib/prisma.js";
import {type Request,type Response } from "express";
import { catchAsync } from "../utils/catchAsync.js";
import { Prisma } from "../generated/prisma/client.js";

export const createProduct=catchAsync(async(req:Request,res:Response)=>{
    
    const product=await prisma.product.create({
        data:{
            name:req.body.name,
            slug:req.body.slug,
            description:req.body.description,
            price:req.body.price,
            unit:req.body.unit,
            minimumOrderQuantity:req.body.minimumOrderQuantity,
            specifications:req.body.specifications,
            status:req.body.status,
            categoryId:req.body.categoryId
        }
    })

    res.status(201).json(product);
    return;
})

export const getProducts=catchAsync(async(req:Request,res:Response)=>{
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    const {categoryId,search,maxPrice,minPrice}=req.query;

    const where:Prisma.ProductWhereInput={
        status:"ACTIVE"
    };

    if(categoryId){
        where.categoryId=Number(categoryId);
    }

    if(search){
        where.name={
            contains:String(search),
            mode:"insensitive"
        }
    }

    if(minPrice || maxPrice){
        where.price={
            ...(minPrice && {gte:Number(minPrice)}),
            ...(maxPrice && {lte:Number(maxPrice)})
        }
    }

    const skip=(page-1)*limit;
    const prismaQuery:Prisma.ProductFindManyArgs = {
        take: limit,
        skip,
        where,
        orderBy: {
            createdAt: "desc"
        },
        include: {
            category: {
                select: {
                    id: true,
                    name: true,
                    slug: true
                }
            }
        }
    };

    const [products,totalProducts]=await Promise.all([
            prisma.product.findMany(prismaQuery),
            prisma.product.count({where})
    ])
    
    const totalPages=Math.ceil(totalProducts/limit);

    const meta={
        page,
        limit,
        totalPages,
        totalProducts
    }

    const data={
        products,
        meta
    }
    
    res.status(200).json(data);
    return;
})
