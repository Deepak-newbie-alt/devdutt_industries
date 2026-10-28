import z from "zod";

export const createCompanySettingsSchema = z.object({
    body: z.object({
        companyName: z
            .string()
            .trim()
            .min(1, "Company name is required")
            .max(200, "Company name is too long"),

        addressLine1: z
            .string()
            .trim()
            .min(1, "Address line 1 is required")
            .max(255, "Address line 1 is too long"),

        addressLine2: z
            .string()
            .trim()
            .max(255, "Address line 2 is too long")
            .nullable()
            .default(null),

        city: z
            .string()
            .trim()
            .min(1, "City is required")
            .max(100, "City is too long"),

        state: z
            .string()
            .trim()
            .min(1, "State is required")
            .max(100, "State is too long"),

        postalCode: z
            .string()
            .trim()
            .min(1, "Postal code is required")
            .max(20, "Postal code is too long"),

        country: z
            .string()
            .trim()
            .min(1, "Country is required")
            .max(100, "Country is too long")
            .default("India"),

        phone: z
            .string()
            .trim()
            .min(1, "Phone number is required")
            .max(20, "Phone number is too long"),

        email: z
            .email()
            .nullable()
            .default(null),

        website: z
            .url({ protocol: /^https?$/, message: "Website URL must start with http:// or https://" })
            .max(255, "Website URL is too long")
            .nullable()
            .default(null),

        gstin: z
            .string()
            .trim()
            .toUpperCase()
            .length(15, "GSTIN must be exactly 15 characters")
            .regex(
                /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/,
                "Invalid GSTIN format"
            )
            .nullable()
            .default(null),

        logoUrl: z
            .url({ protocol: /^https?$/, message: "Logo URL must start with http:// or https://" })
            .max(500, "Logo URL is too long")
            .nullable()
            .default(null),

        defaultTermsAndConditions: z
            .string()
            .trim()
            .nullable()
            .default(null)
    })
});

export type TcreateCompanySettings = z.infer<
    typeof createCompanySettingsSchema
>;

export const updateCompanySettingsSchema = z.object({
    body: createCompanySettingsSchema.shape.body
        .partial()
        .refine(
            (data) => Object.keys(data).length > 0,
            { message: "At least one field must be provided" }
        )
});

export type TupdateCompanySettings = z.infer<
    typeof updateCompanySettingsSchema
>;
