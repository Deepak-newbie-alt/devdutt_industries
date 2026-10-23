
import path from "node:path";
import prisma from "../lib/prisma.js";
import ApiError from "../utils/ApiError.js";
import { generatePdf } from "../utils/pdf-generator.js";
import type { TDocumentDefinitions } from "pdfmake/interfaces.js";
import type { TrevisionIdParams } from "../schemas/quotationSchema.js";

export const quotationPdfService = {
    generate: async (params: TrevisionIdParams["params"],salespersonId:number) => {
        const { revisionId } = params;

        const [company, revision] = await Promise.all([
        prisma.companySettings.findUnique({
            where: { id: 1 },
        }),

        prisma.quotationRevision.findUnique({
            where: { id: revisionId },
            include: {
            quotation: {
                select: {
                quotationNumber: true,
                },
            },
            items: {
                orderBy: {
                displayOrder: "asc",
                },
            },
            },
        }),
        ]);

        if (!company) {
        throw new ApiError(404, "Company settings not found");
        }

        if (!revision) {
        throw new ApiError(404, "Quotation revision not found");
        }

        if(revision.salespersonId!==salespersonId){
            throw new ApiError(403,"Forbidden you can't access this resource");
        }

        const docDefinition: TDocumentDefinitions = {
        content: [
            {
            text: company.companyName ?? "Devdutt Industries",
            fontSize: 22,
            bold: true,
            },
            {
            text: "QUOTATION",
            fontSize: 18,
            margin: [0, 12, 0, 8],
            },
            {
            text: `Quotation No: ${revision.quotation.quotationNumber}`,
            },
            {
            text: `Revision ID: ${revision.id}`,
            margin: [0, 0, 0, 12],
            },
            {
            text: "Quotation details",
            bold: true,
            fontSize: 14,
            margin: [0, 8, 0, 8],
            },
            JSON.stringify(revision.items, null, 2),
        ],
        defaultStyle: {
            font: "Roboto",
            fontSize: 10,
        },
        };

        const outputPath = path.resolve(
        "uploads/quotations",
        `${revision.quotation.quotationNumber}.pdf`,
        );

        await generatePdf(docDefinition, outputPath);

        return {
            filePath: outputPath,
            fileName: `${revision.quotation.quotationNumber}.pdf`,
        };
    },
};
