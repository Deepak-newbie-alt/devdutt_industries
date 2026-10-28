import z from "zod";

export const createProductImageSchema = z.object({
  body: z.object({
    productId: z
    .coerce
    .number()
    .int("Product ID must be an integer")
    .positive("Product ID must be positive"),

    imageUrl: z
    .string()
    .trim()
    .min(1,"Product image_url is required")
    .url("Image URL must be a valid URL"),

    displayOrder: z
    .coerce
    .number()
    .int("Display order must be an integer")
    .nonnegative("Display order must not be negative")
    .default(0),
  }),
});

export type TcreateProductImageInput = z.infer<typeof createProductImageSchema>;