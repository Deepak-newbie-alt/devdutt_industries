import type { Prisma } from "../generated/prisma/client.js";
import prisma from "../lib/prisma.js";
import type { TcreateCategoryInput, TgetAdminCategoriesQuery, TgetCategoryByIdParams, TgetCategoryQuery, TupdateCategory } from "../schemas/categorySchema.js";

export const categoryService={
    createCategory:async(body:TcreateCategoryInput["body"])=>{
        const category=await prisma.category.create({
        data:{
            name:body.name,
            slug:body.slug,
            description:body.description ?? null,
            displayOrder:body.displayOrder,
            status:body.status
        }
    })

    return category;
    },

    getCategories:async(query:TgetCategoryQuery["query"])=>{
        const {page,limit,id,search}=query;

        const where:Prisma.CategoryWhereInput={
            status:"ACTIVE"
        }

        if(id){
            where.id=id;
        }

        if(search){
            where.name={
                contains:search,
                mode:"insensitive"
            }
        }

        const skip=(page-1)*limit;

        const prismaQuery:Prisma.CategoryFindManyArgs={
            take:limit,
            skip,
            where,
            orderBy: {
            createdAt: "desc"
            },
            include:{
                products:{
                    where:{
                        status:"ACTIVE"
                    },
                    select:{
                        id:true,
                        name:true,
                        price:true
                    }
                }
            }
        }

        const [category,totalCategory]=await Promise.all([
            await prisma.category.findMany(prismaQuery),
            await prisma.category.count({where})
        ]);
        
        const totalPages=Math.ceil(totalCategory/limit);
        const meta={
            page,
            limit,
            totalPages,
            totalCategory
        }

        return {
            category,
            meta
        };
    },

    getCategoryById:async(params:TgetCategoryByIdParams["params"])=>{
        const {categoryId}=params;
        const prismaQuery:Prisma.CategoryFindUniqueArgs={
            // Public endpoint: inactive categories are treated as not found.
            where: {
                id: categoryId,
                status: "ACTIVE",
            },
            include:{
                products:{
                    where:{
                        status:"ACTIVE"
                    },
                    select:{
                        id:true,
                        name:true,
                        price:true
                    }
                }
            }
        };

        const category=await prisma.category.findUnique(prismaQuery);

        return category;
    },

    updateCategory:async(params:TupdateCategory["params"],body:TupdateCategory["body"])=>{
        const {categoryId}=params;

        const {name,slug,description,displayOrder,status}=body;

        const prismaQuery:Prisma.CategoryUpdateArgs={
            where:{
                id:categoryId
            },
            data:{
                ...(name!==undefined?{name}:{}),
                ...(slug!==undefined?{slug}:{}),
                ...(description!==undefined?{description}:{}),
                ...(displayOrder!==undefined?{displayOrder}:{}),
                ...(status!==undefined?{status}:{})
            },
            include:{
                products:{
                    select:{
                        id:true,
                        name:true,
                        price:true
                    }
                }
            }
        }

        const category=await prisma.category.update(prismaQuery);

        return category;
    },

    // Admin: categories in every status, with how many products each holds.
    getCategoriesForAdmin:async(query:TgetAdminCategoriesQuery["query"])=>{
        const {page,limit,search,status}=query;

        const where:Prisma.CategoryWhereInput={};

        if(status){
            where.status=status;
        }

        if(search){
            where.name={
                contains:search,
                mode:"insensitive"
            }
        }

        const [category,totalCategory]=await Promise.all([
            prisma.category.findMany({
                take:limit,
                skip:(page-1)*limit,
                where,
                orderBy:[{displayOrder:"asc"},{id:"asc"}],
                include:{
                    _count:{
                        select:{
                            products:true
                        }
                    }
                }
            }),
            prisma.category.count({where})
        ]);

        return {
            category,
            meta:{
                page,
                limit,
                totalPages:Math.ceil(totalCategory/limit),
                totalCategory
            }
        };
    },

    getCategoryByIdForAdmin:async(params:TgetCategoryByIdParams["params"])=>{
        const {categoryId}=params;

        return prisma.category.findUnique({
            where:{
                id:categoryId
            },
            include:{
                _count:{
                    select:{
                        products:true
                    }
                }
            }
        });
    }
}
