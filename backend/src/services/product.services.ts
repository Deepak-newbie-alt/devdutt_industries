import prisma from "../lib/prisma.js";
import { Prisma } from "../generated/prisma/client.js";

//types
import type { TgetProductQuery,TgetProductByIdParams, TcreateProductBody, TupdateProductById, TgetAdminProductsQuery } from "../schemas/productSchema.js";

// Admin views: the product with its category and every media item (ids included, for removal).
const adminProductInclude={
    category:{
        select:{
            id:true,
            name:true,
            slug:true,
            status:true
        }
    },
    images:{
        select:{
            id:true,
            imageUrl:true,
            displayOrder:true
        },
        orderBy:[{displayOrder:"asc"},{id:"asc"}]
    },
    videos:{
        select:{
            id:true,
            youtubeUrl:true,
            title:true,
            displayOrder:true
        },
        orderBy:[{displayOrder:"asc"},{id:"asc"}]
    },
    brochure:{
        select:{
            id:true,
            fileName:true,
            fileUrl:true
        }
    }
} satisfies Prisma.ProductInclude;


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
                },
                orderBy:[{displayOrder:"asc"},{id:"asc"}]
            },
            videos:{
                select:{
                    id:true,
                    youtubeUrl:true,
                    title:true
                },
                orderBy:[{displayOrder:"asc"},{id:"asc"}]
            },
            brochure:{
                select:{
                    id:true,
                    fileName:true,
                    fileUrl:true
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

    // Public endpoint: unpublished products are treated as not found.
    const product=await prisma.product.findUnique({
        where:{
            id:productId,
            status:"ACTIVE"
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
                },
                orderBy:[{displayOrder:"asc"},{id:"asc"}]
            },
            videos:{
                select:{
                    id:true,
                    youtubeUrl:true,
                    title:true
                },
                orderBy:[{displayOrder:"asc"},{id:"asc"}]
            },
            brochure:{
                select:{
                    id:true,
                    fileName:true,
                    fileUrl:true
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

    // Admin: products in every status, so inactive ones can be found and edited again.
    findProductsForAdmin:async(query:TgetAdminProductsQuery["query"])=>{
        const {page,limit,categoryId,search,status}=query;

        const where:Prisma.ProductWhereInput={};

        if(status){
            where.status=status;
        }

        if(categoryId){
            where.categoryId=categoryId;
        }

        if(search){
            where.name={
                contains:search,
                mode:"insensitive"
            }
        }

        const [products,totalProducts]=await Promise.all([
            prisma.product.findMany({
                take:limit,
                skip:(page-1)*limit,
                where,
                orderBy:{
                    createdAt:"desc"
                },
                include:adminProductInclude
            }),
            prisma.product.count({where})
        ]);

        return {
            products,
            meta:{
                page,
                limit,
                totalPages:Math.ceil(totalProducts/limit),
                totalProducts
            }
        };
    },

    findProductByIdForAdmin:async(params:TgetProductByIdParams["params"])=>{
        const {productId}=params;

        return prisma.product.findUnique({
            where:{
                id:productId
            },
            include:adminProductInclude
        });
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