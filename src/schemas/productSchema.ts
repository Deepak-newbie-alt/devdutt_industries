import z from "zod";


export const createProductSchema=z.object({
    body:z.object({
        name:z
        .string()
        .trim()
        .min(1,"Product name is required")
        .max(200,"Product name is too long"),
        slug:z
        .string()
        .trim()
        .min(1,"Slug is required")
        .max(220,"Slug is too long")
        .regex(
            /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
            "Slug must contain only lowercase letters, numbers, and hyphens"
        ),
        description:z
        .string()
        .trim()
        .min(1,"Description is required")
        .max(1000,"Description is too long"),
        price:z
        .coerce
        .number()
        .positive("Price must be greater than 0")
        .refine(
            (value)=>Number.isInteger(value*100),
            "Price must have at most 2 decimal places"
        ),
        unit:z
        .enum(["Piece","Set","Machine"]),
        minimumOrderQuantity:z
        .coerce
        .number()
        .int('Minimum order quantity must be an Integer')
        .positive("Minimum order quantity must be positive")
        .default(1),
        specifications:z
        .record(z.string(),z.json())
        .default({}),
        status:z
        .enum(["ACTIVE","INACTIVE","ARCHIVED"])
        .default("ACTIVE"),
        categoryId:z
        .coerce
        .number()
        .int("Category Id must be an integer")
        .positive("Category Id must be positive")
    })
})

export type TcreateProductBody=z.infer<typeof createProductSchema>;

export const getProductsQuerySchema=z.object({
    query:z.object({
        page:z
        .coerce
        .number()
        .int("Page must be integer")
        .positive("Page must be positive")
        .default(1),
        limit:z
        .coerce
        .number()
        .int("Limit must be an integer")
        .positive("Limit must be positive")
        .max(100,"Limit is too high")
        .default(10),
        categoryId:z
        .coerce
        .number()
        .int("Category Id must be an integer")
        .positive('Category Id must be positive')
        .optional(),
        search:z
        .string()
        .trim()
        .max(200,"Searched name is too long")
        .optional(),
        minPrice:z
        .coerce
        .number()
        .positive("Minimum price must be positive")
        .optional(),
        maxPrice:z
        .coerce
        .number()
        .positive("Max price must be positive")
        .optional()
    }).refine(
        (data)=>{
            if(data.minPrice !==undefined && data.maxPrice!==undefined){
                return data.minPrice<data.maxPrice;
            }

            return true;
        },
        {
            message:"Min price must be less than Max price",
            path:["minPrice"]
        }
    )
})

export type TgetProductQuery=z.infer<typeof getProductsQuerySchema>;

export const getProductByIdParamsSchema=z.object({
    params:z.object({
        productId:z
        .coerce
        .number()
        .int("Product Id must be an integer")
        .positive("Product Id must be positive")
    })
})

export type TgetProductByIdParams=z.infer<typeof getProductByIdParamsSchema>;