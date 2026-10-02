import prisma from "../lib/prisma.js";
import { Prisma } from "../generated/prisma/client.js";

//types
import type { TgetProductQuery,TgetProductByIdParams, TcreateProductBody, TupdateProductById } from "../schemas/productSchema.js";


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
            },
            images:{
                select:{
                    id:true,
                    imageUrl:true
                }
            },
            videos:{
                select:{
                    id:true,
                    youtubeUrl:true
                }
            },
            brochure:{
                select:{
                    id:true,
                    fileName:true
                }
            },
            inquiries:{
                select:{
                    id:true,
                    salespersonId:true,
                    requirement:true,
                    phoneNumber:true
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
        include: {
            category: {
                select: {
                    id: true,
                    name: true,
                    slug: true
                }
            },
            images:{
                select:{
                    id:true,
                    imageUrl:true
                }
            },
            videos:{
                select:{
                    id:true,
                    youtubeUrl:true
                }
            },
            brochure:{
                select:{
                    id:true,
                    fileName:true
                }
            },
            inquiries:{
                select:{
                    id:true,
                    salespersonId:true,
                    requirement:true,
                    phoneNumber:true
                }
            }
        }
    })

    return product;
    },

    updateProduct:async(params:TupdateProductById["params"],body:TupdateProductById["body"])=>{
        const {productId}=params;

        const {name,slug,description,price,unit,minimumOrderQuantity,specifications,status,categoryId}=body;

        const prismaQuery:Prisma.ProductUpdateArgs={
            where:{
                id:productId,
            },
            data:{
                ...(name !== undefined ? {name} : {}),
                ...(slug !== undefined ? {slug} : {}),
                ...(description !== undefined ? {description} : {}),
                ...(price !== undefined ? {price} : {}),
                ...(unit !== undefined ? {unit} : {}),
                ...(minimumOrderQuantity !== undefined ? {minimumOrderQuantity} : {}),
                ...(specifications !== undefined ? {specifications} : {}),
                ...(status !== undefined ? {status} : {}),
                ...(categoryId !== undefined && {
                    category:{
                        connect:{
                            id:categoryId
                        }
                    }})
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
        }
        const product=await prisma.product.update(prismaQuery);

        return product;
    },

    deleteProductById:async(params:TgetProductByIdParams["params"])=>{
        const {productId}=params;

        await prisma.product.update({
            where:{
                id:productId
            },
            data:{
                status:"INACTIVE"
            }
        });
    }
}