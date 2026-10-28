import z from "zod";

export const createCategorySchema=z.object({
    body:z.object({
        name:z
        .string()
        .trim()
        .min(1,"Category name is required")
        .max(100,"Category name is too long"),
        slug:z
        .string()
        .trim()
        .min(1,"Category slug is required")
        .max(120,"Category slug is too long")
        .regex(
            /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
            "Slug must contain only lowercase letters, numbers, and hyphens"
        ),
        description:z
        .string()
        .trim()
        .max(500,"Description is too long")
        .optional(),
        displayOrder:z
        .coerce
        .number()
        .int("Display order must be an integer")
        .nonnegative("Display Order cannot be negative")
        .default(0),
        status:z
        .enum(["ACTIVE","INACTIVE","ARCHIVED"])
        .default("ACTIVE")
    })
})

export type TcreateCategoryInput=z.infer<typeof createCategorySchema>;

export const getCategoryQuerySchema=z.object({
    query:z.object({
        page:z
        .coerce
        .number()
        .int("Page number should be an integer")
        .positive("Page number should be positive")
        .default(1),
        limit:z
        .coerce
        .number()
        .max(100,"Limit is too high")
        .int("Limit should be an integer")
        .positive("Limit should be positive")
        .default(10),
        id:z
        .coerce
        .number()
        .int("Id must be an integer")
        .positive("Id must be positive")
        .optional(),
        search:z
        .string()
        .trim()
        .max(200,"Name is too long")
        .optional()
    })
})

export type TgetCategoryQuery=z.infer<typeof getCategoryQuerySchema>;

export const getCategoryByIdParams=z.object({
    params:z.object({
        categoryId:z
        .coerce
        .number()
        .int("Category id must be integer")
        .positive("Category id must be positive")
    })
})

export type TgetCategoryByIdParams=z.infer<typeof getCategoryByIdParams>;

export const updateCategorySchema=z.object({
    params:z.object({
        categoryId:z
        .coerce
        .number()
        .int("Category id must be integer")
        .positive('Category id must be positive')
    }),

    body:createCategorySchema.shape.body.partial()
    .refine(
        (data)=>Object.keys(data).length>0,
        {message:"Atleast one field must be provided to update category"}
    )
})

export type TupdateCategory=z.infer<typeof updateCategorySchema>;