import { z } from "zod";
import { getTodayInIndiaDateString } from "../utils/dateOnly.js";

const moneySchema = z
  .string()
  .trim()
  .regex(
    /^\d+(\.\d{1,2})?$/,
    "Amount must have up to 2 decimal places"
  )
  .refine(
    (value) => Number(value) > 0,
    "Amount must be greater than zero"
  );


const taxRateSchema = z
  .string()
  .trim()
  .regex(
    /^\d+(\.\d{1,2})?$/,
    "Rate must have up to 2 decimal places"
  )
  .refine(
    (value) => Number(value) <= 100,
    "Rate cannot exceed 100%"
  );

const validUntilSchema = z
    .string()
    .regex(
        /^\d{4}-\d{2}-\d{2}$/,
        "Expiry date must use YYYY-MM-DD format"
    )
    .refine(value => {
        const date = new Date(`${value}T00:00:00.000Z`);

        return (
            !Number.isNaN(date.getTime()) &&
            date.toISOString().slice(0, 10) === value
        );
    }, "Please provide a valid calendar date")
    .refine(
        value => value >= getTodayInIndiaDateString(),
        "Expiry date cannot be in the past"
    )
    .transform(
        value => new Date(`${value}T00:00:00.000Z`)
    );

  type TaxRates = {
    cgstRate?: string | null | undefined;
    sgstRate?: string | null | undefined;
    igstRate?: string | null | undefined;
};

const validateTaxRates = (data: TaxRates, ctx: z.RefinementCtx) => {
    const hasCgst = data.cgstRate != undefined;
    const hasSgst = data.sgstRate != undefined;
    const hasIgst = data.igstRate != undefined;

    if (hasCgst !== hasSgst) {
        ctx.addIssue({
            code: "custom",
            message: "CGST and SGST must be provided together",
            path: ["cgstRate"],
        });
    }

    if (hasCgst && hasIgst) {
        ctx.addIssue({
            code: "custom",
            message: "Can't apply both intra-state and inter-state tax",
            path: ["igstRate"],
        });
    }
};

export const revisionIdParamsSchema=z.object({
    params:z.object({
        revisionId:z
        .coerce 
        .number()
        .int("Id must be an integer")
        .positive("Id must be positive")
    })
})

export type TrevisionIdParams=z.infer<typeof revisionIdParamsSchema>;

const quotationItemSchema = z.object({
    name: z
        .string()
        .trim()
        .min(1, "Item name is required")
        .max(200, "Item name is too long"),

    description: z
        .string()
        .trim()
        .max(1000, "Description is too long")
        .optional(),

    quantity: z
        .coerce
        .number()
        .int("Quantity must be an integer")
        .positive("Quantity must be positive"),

    unit:z
        .enum(["Piece","Set","Machine"]),

    unitPrice:moneySchema,

    displayOrder: z
        .coerce
        .number()
        .int("Display order must be an integer")
        .nonnegative("Display order must not be negative")
        .default(0)
});

export type TquotationItem=z.infer<typeof quotationItemSchema>;

const quotationRevisionBodySchema= z.object({

        quotationRevisionStatus: z.enum(
            [
                "DRAFT",
                "SENT",
                "REVISION_REQUESTED",
                "ACCEPTED",
                "REJECTED"
            ],
            "Please provide a valid quotation revision status"
        ),

        buyerName: z
            .string()
            .trim()
            .min(1, "Buyer name is required")
            .max(50, "Buyer name is too long"),

        companyName: z
            .string()
            .trim()
            .max(50, "Company name is too long")
            .optional(),

        address: z
            .string()
            .trim()
            .min(1, "Address is required"),

        gstNumber: z
            .string()
            .trim()
            .min(1, "GST number is required")
            .max(50, "GST number is too long"),

        mobileNumber: z
            .string()
            .trim()
            .min(10, "Mobile number must contain at least 10 digits")
            .max(15, "Mobile number is too long"),

        email: z
            .email("Please provide a valid email")
            .optional(),

        productName: z
            .string()
            .trim()
            .min(1, "Product name is required")
            .max(200, "Product name is too long"),

        machineSpecifications: z
            .record(z.string(), z.any())
            .refine(
                (value) => Object.keys(value).length > 0,
                "Machine specifications are required"
            ),

        terms: z
            .record(z.string(), z.any())
            .refine(
                (value) => Object.keys(value).length > 0,
                "Quotation terms are required"
            ),

        validUntil:validUntilSchema,

        cgstRate:taxRateSchema
            .optional(),

        sgstRate:taxRateSchema
            .optional(),

        igstRate:taxRateSchema
            .optional(),

        items: z
            .array(quotationItemSchema)
            .min(1, "At least one quotation item is required")
    })

export const createQuotationSchema = z.object({
    body:quotationRevisionBodySchema.omit({
        quotationRevisionStatus:true
    }).superRefine(validateTaxRates),
    params:z.object({
            inquiryId:z
            .coerce
            .number()
            .int("Id must be an integer")
            .positive("Id must be positive")
        })
});

export type TcreateQuotation=z.infer<typeof createQuotationSchema>;

// The issued PDF is generated on the server; the client sends no body.
export const sendQuotationSchema=z.object({
    params:revisionIdParamsSchema.shape.params
})

export type TsendQuotation=z.infer<typeof sendQuotationSchema>;

export const editQuotationSchema=z.object({
    params:sendQuotationSchema.shape.params,
    body:quotationRevisionBodySchema.omit({
        quotationRevisionStatus:true
    }).superRefine(validateTaxRates)
})

export type TeditQuotationRevision=z.infer<typeof editQuotationSchema>;

export const quotationIdParamsSchema=z.object({
    params:z.object({
        quotationId:z
        .coerce
        .number()
        .int("Id must be integer")
        .positive('Id must be positive')
    })
})

export type TquotationIdParams=z.infer<typeof quotationIdParamsSchema>;