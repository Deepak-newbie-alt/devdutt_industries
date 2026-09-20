import prisma from "../lib/prisma.js";
import type { Response } from "express";
import { catchAsync } from "../utils/catchAsync.js";
import { Prisma } from "../generated/prisma/client.js";

//types
import type { TcreateProductBody,TgetProductQuery,TgetProductByIdParams } from "../schemas/productSchema.js";
import type { ValidatedRequest } from "../types/VatidatedRequest.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";

export const createProduct=catchAsync<ValidatedRequest<TcreateProductBody>>(async(req,res:Response)=>{
    
    const product=await prisma.product.create({
        data:{
            name:req.validated.body.name,
            slug:req.validated.body.slug,
            description:req.validated.body.description,
            price:req.validated.body.price,
            unit:req.validated.body.unit,
            minimumOrderQuantity:req.validated.body.minimumOrderQuantity,
            specifications:req.validated.body.specifications,
            status:req.validated.body.status,
            categoryId:req.validated.body.categoryId
        }
    })

    res.status(201).json(
        new ApiResponse(201,"Product created successfully",product)
    )
    return;
})

export const getProducts=catchAsync<ValidatedRequest<TgetProductQuery>>(async(req,res:Response)=>{
    const page = Number(req.validated.query.page) || 1;
    const limit = Number(req.validated.query.limit) || 10;

    const {categoryId,search,maxPrice,minPrice}=req.validated.query;

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

    res.status(200).json(
        new ApiResponse(200,"Product fetched successfully",data)
    )
    return;
})

export const getProductById=catchAsync<ValidatedRequest<TgetProductByIdParams>>(async(req,res:Response)=>{
    const {productId}=req.validated.params;

    const product=await prisma.product.findUnique({
        where:{
            id:productId
        },
        include:{
            category:{
                select:{
                    id:true,
                    name:true,
                    slug:true
                }
            }
        }
    })

    if(!product){
        throw new ApiError(404,"Product not found");
    }

    res.status(200).json(
        new ApiResponse(200,"Product by id fetched successfully",product)
    )
    return;
})