import type { Prisma } from "../generated/prisma/client.js";
import prisma from "../lib/prisma.js";
import type { TcreateCategoryInput, TgetCategoryByIdParams, TgetCategoryQuery } from "../schemas/categorySchema.js";

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
            where: {
                id: categoryId,
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
        };

        const category=await prisma.category.findUnique(prismaQuery);

        return category;
    }
}