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