import z from "zod";


export const createProductSchema=z.object({
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
    .record(z.string(),z.unknown())
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