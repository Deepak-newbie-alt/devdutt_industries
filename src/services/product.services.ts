import prisma from "../lib/prisma.js";
import { Prisma } from "../generated/prisma/client.js";

//types
import type { TgetProductQuery,TgetProductByIdParams, TcreateProductBody } from "../schemas/productSchema.js";


export const productService={
    createProduct:async(body:TcreateProductBody["body"])=>{
    const product=await prisma.product.create({
        data:{
            name:body.name,
            slug:body.slug,
            description:body.description,
            price:body.price,
            unit:body.unit,
            minimumOrderQuantity:body.minimumOrderQuantity,
            specifications:body.specifications,
            status:body.status,
            categoryId:body.categoryId
        }
    })

    return product;
    },

    findProducts:async(query:TgetProductQuery["query"])=>{

    const {page,limit,categoryId,search,maxPrice,minPrice}=query;

    const where:Prisma.ProductWhereInput={
        status:"ACTIVE"
    };

    if(categoryId){
        where.categoryId=categoryId;
    }

    if(search){
        where.name={
            contains:search,
            mode:"insensitive"
        }
    }

    if(minPrice || maxPrice){
        where.price={
            ...(minPrice && {gte:minPrice}),
            ...(maxPrice && {lte:maxPrice})
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

    return data;
    },

    findProductById:async(params:TgetProductByIdParams["params"])=>{
    const {productId}=params;

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

    return product;
    }
}