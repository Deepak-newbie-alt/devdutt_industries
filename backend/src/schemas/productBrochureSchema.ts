import z from "zod";

export const createProductBrochureSchema=z.object({
    body:z.object({
        productId:z
        .coerce
        .number()
        .int("Product id must be an integer")
        .positive("Product id must be positive"),
        fileUrl:z
        .string()
        .trim()
        .min(1,"You must provide file url")
        .url({ protocol: /^https?$/, message: "Please provide a valid http:// or https:// url" }),
        fileName:z
        .string()
        .min(1,"Please provide a file name")
        .max(255,"File name is too long")
    })
})

export type TcreateProductBrochureInput=z.infer<typeof createProductBrochureSchema>;

export const productBrochureIdParamsSchema=z.object({
    params:z.object({
        brochureId:z
        .coerce
        .number()
        .int("Id must be an integer")
        .positive("Id must be positive")
    })
})

export type TproductBrochureIdParams=z.infer<typeof productBrochureIdParamsSchema>;
