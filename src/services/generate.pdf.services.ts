import path from "node:path";

import prisma from "../lib/prisma.js";
import ApiError from "../utils/ApiError.js";
import { generatePdf as writePdfFile } from "../utils/pdf-generator.js";

import type { TDocumentDefinitions } from "pdfmake/interfaces.js";
import type { TrevisionIdParams } from "../schemas/quotationSchema.js";

// Convert keys such as deliveryTerms into Delivery Terms.
function formatLabel(key: string): string {
    return key
        .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
        .replace(/[_-]/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

// Convert JSON values into readable text.
function formatJsonValue(value: unknown): string {
    if (value === null || value === undefined || value === "") {
        return "—";
    }

    if (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
    ) {
        return String(value);
    }

    if (Array.isArray(value)) {
        return value.map(formatJsonValue).join(", ");
    }

    if (typeof value === "object") {
        return Object.entries(value as Record<string, unknown>)
        .map(([key, nestedValue]) =>
            `${formatLabel(key)}: ${formatJsonValue(nestedValue)}`
        )
        .join("; ");
    }

    return String(value);
    }

    // Convert a JSON object into rows suitable for a PDF table.
    function createKeyValueRows(
    value: unknown
    ): Array<Array<string | { text: string; bold?: boolean }>> {
    if (
        value === null ||
        typeof value !== "object" ||
        Array.isArray(value)
    ) {
        return [["Details", formatJsonValue(value)]];
    }

    const entries = Object.entries(value as Record<string, unknown>);

    if (entries.length === 0) {
        return [["Details", "No details provided"]];
    }

    return entries.map(([key, entryValue]) => [
        { text: formatLabel(key), bold: true },
        formatJsonValue(entryValue),
    ]);
    }

    function formatDate(date: Date): string {
    return new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
    }).format(date);
    }

    function formatMoney(amount: unknown, currency: string): string {
    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount)) {
        return "—";
    }

    try {
        return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        }).format(numericAmount);
    } catch {
        return `${currency} ${numericAmount.toFixed(2)}`;
    }
    }

    export const quotationPdfService = {
    generate: async (
        params: TrevisionIdParams["params"],
        salespersonId: number
    ) => {
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

        if (!revision) {
        throw new ApiError(404, "Quotation revision not found");
        }

        // Only the assigned salesperson can generate this PDF.
        if (revision.salespersonId !== salespersonId) {
        throw new ApiError(
            403,
            "Forbidden: you cannot access this quotation"
        );
        }

        // Generate documents only for editable revisions.
        if (revision.quotationRevisionStatus !== "DRAFT") {
        throw new ApiError(
            409,
            "PDF generation is only allowed for draft revisions"
        );
        }

        if (!company) {
        throw new ApiError(404, "Company settings not found");
        }

        const currency = revision.currency;

        const companyAddress = [
        company.addressLine1,
        company.addressLine2,
        `${company.city}, ${company.state} - ${company.postalCode}`,
        company.country,
        ]
        .filter(Boolean)
        .join("\n");

        const companyContacts = [
        `Phone: ${company.phone}`,
        company.email ? `Email: ${company.email}` : null,
        company.website ? `Website: ${company.website}` : null,
        company.gstin ? `GSTIN: ${company.gstin}` : null,
        ]
        .filter(Boolean)
        .join("\n");

        const buyerDetails = [
        { text: revision.buyerName, bold: true },
        ...(revision.companyName
            ? [{ text: revision.companyName }]
            : []),
        { text: revision.address },
        { text: `GSTIN: ${revision.gstNumber}` },
        { text: `Phone: ${revision.mobileNumber}` },
        ...(revision.email
            ? [{ text: `Email: ${revision.email}` }]
            : []),
        ];

        const itemRows = revision.items.map((item, index) => [
        {
            text: String(index + 1),
            alignment: "center" as const,
        },
        {
            stack: [
            { text: item.name, bold: true },
            ...(item.description
                ? [
                    {
                    text: item.description,
                    style: "smallText",
                    },
                ]
                : []),
            ],
        },
        {
            text: String(item.quantity),
            alignment: "right" as const,
        },
        { text: item.unit },
        {
            text: formatMoney(item.unitPrice, currency),
            alignment: "right" as const,
        },
        {
            text: formatMoney(item.amount, currency),
            alignment: "right" as const,
        },
        ]);

        const taxRows: Array<{
        label: string;
        amount: unknown;
        }> = [];

        if (
        revision.cgstRate !== null &&
        revision.cgstAmount !== null
        ) {
        taxRows.push({
            label: `CGST (${Number(revision.cgstRate).toFixed(2)}%)`,
            amount: revision.cgstAmount,
        });
        }

        if (
        revision.sgstRate !== null &&
        revision.sgstAmount !== null
        ) {
        taxRows.push({
            label: `SGST (${Number(revision.sgstRate).toFixed(2)}%)`,
            amount: revision.sgstAmount,
        });
        }

        if (
        revision.igstRate !== null &&
        revision.igstAmount !== null
        ) {
        taxRows.push({
            label: `IGST (${Number(revision.igstRate).toFixed(2)}%)`,
            amount: revision.igstAmount,
        });
        }

        const docDefinition: TDocumentDefinitions = {
        pageSize: "A4",
        pageMargins: [36, 40, 36, 45],

        content: [
            // Company header and quotation number.
            {
            columns: [
                {
                width: "*",
                stack: [
                    {
                    text: company.companyName,
                    style: "companyName",
                    },
                    {
                    text: companyAddress,
                    style: "smallText",
                    },
                    {
                    text: companyContacts,
                    style: "smallText",
                    margin: [0, 5, 0, 0],
                    },
                ],
                },
                {
                width: "auto",
                stack: [
                    {
                    text: "QUOTATION",
                    style: "documentTitle",
                    alignment: "right",
                    },
                    {
                    text: revision.quotation.quotationNumber,
                    style: "quotationNumber",
                    alignment: "right",
                    },
                    {
                    text: `Revision ${revision.revisionNumber}`,
                    alignment: "right",
                    style: "smallText",
                    },
                ],
                },
            ],
            columnGap: 15,
            },

            {
            canvas: [
                {
                type: "line",
                x1: 0,
                y1: 0,
                x2: 523,
                y2: 0,
                lineWidth: 1.2,
                lineColor: "#263D52",
                },
            ],
            margin: [0, 14, 0, 8],
            },

            // Buyer and quotation dates.
            {
            columns: [
                {
                width: "*",
                stack: [
                    { text: "QUOTATION FOR", style: "sectionTitle" },
                    ...buyerDetails,
                ],
                },
                {
                width: "*",
                stack: [
                    { text: "QUOTATION DETAILS", style: "sectionTitle" },
                    `Quotation No: ${revision.quotation.quotationNumber}`,
                    `Revision: ${revision.revisionNumber}`,
                    `Prepared: ${formatDate(revision.createdAt)}`,
                    `Valid until: ${formatDate(revision.validUntil)}`,
                ],
                },
            ],
            columnGap: 20,
            margin: [0, 5, 0, 12],
            },

            // Machine snapshot.
            { text: "MACHINE DETAILS", style: "sectionTitle" },
            {
            text: revision.productName,
            style: "subheading",
            margin: [0, 0, 0, 6],
            },
            {
            table: {
                widths: [150, "*"],
                body: createKeyValueRows(revision.machineSpecifications),
            },
            layout: "lightHorizontalLines",
            },

            // Item and pricing table.
            { text: "PRICE BREAKDOWN", style: "sectionTitle" },
            {
            table: {
                headerRows: 1,
                widths: [22, "*", 34, 48, 75, 78],
                body: [
                [
                    { text: "#", style: "tableHeader" },
                    { text: "Item / Description", style: "tableHeader" },
                    { text: "Qty", style: "tableHeader", alignment: "right" },
                    { text: "Unit", style: "tableHeader" },
                    {
                    text: "Unit Price",
                    style: "tableHeader",
                    alignment: "right",
                    },
                    {
                    text: "Amount",
                    style: "tableHeader",
                    alignment: "right",
                    },
                ],
                ...itemRows,
                ],
            },
            layout: "lightHorizontalLines",
            },

            // Totals use the amounts already saved in the revision.
            {
            columns: [
                { width: "*", text: "" },
                {
                width: 230,
                table: {
                    widths: ["*", 105],
                    body: [
                    [
                        { text: "Taxable amount" },
                        {
                        text: formatMoney(revision.taxableAmount, currency),
                        alignment: "right",
                        },
                    ],
                    ...taxRows.map((tax) => [
                        { text: tax.label },
                        {
                        text: formatMoney(tax.amount, currency),
                        alignment: "right" as const,
                        },
                    ]),
                    [
                        {
                        text: "GRAND TOTAL",
                        bold: true,
                        fontSize: 11,
                        fillColor: "#E8EEF3",
                        margin: [4, 7, 4, 7],
                        },
                        {
                        text: formatMoney(revision.grandTotal, currency),
                        bold: true,
                        fontSize: 11,
                        alignment: "right" as const,
                        fillColor: "#E8EEF3",
                        margin: [4, 7, 4, 7],
                        },
                    ],
                    ],
                },
                layout: "lightHorizontalLines",
                },
            ],
            margin: [0, 10, 0, 14],
            },

            // These are the terms saved on this specific revision.
            { text: "TERMS AND CONDITIONS", style: "sectionTitle" },
            {
            table: {
                widths: [150, "*"],
                body: createKeyValueRows(revision.terms),
            },
            layout: "lightHorizontalLines",
            },

            {
            text: [
                "Thank you for your interest in ",
                { text: company.companyName, bold: true },
                ".",
            ],
            alignment: "center",
            margin: [0, 20, 0, 20],
            style: "smallText",
            },

            {
            text: `For ${company.companyName}`,
            alignment: "right",
            bold: true,
            margin: [0, 12, 0, 30],
            },
            {
            text: "Authorized Signatory",
            alignment: "right",
            style: "smallText",
            },
        ],

        styles: {
            companyName: {
            fontSize: 19,
            bold: true,
            color: "#263D52",
            margin: [0, 0, 0, 5],
            },
            documentTitle: {
            fontSize: 21,
            bold: true,
            color: "#263D52",
            },
            quotationNumber: {
            fontSize: 12,
            bold: true,
            margin: [0, 5, 0, 3],
            },
            sectionTitle: {
            fontSize: 10,
            bold: true,
            color: "#263D52",
            margin: [0, 10, 0, 6],
            },
            subheading: {
            fontSize: 12,
            bold: true,
            },
            tableHeader: {
            bold: true,
            color: "#FFFFFF",
            fillColor: "#263D52",
            margin: [3, 6, 3, 6],
            },
            smallText: {
            fontSize: 8,
            color: "#555555",
            lineHeight: 1.2,
            },
        },

        defaultStyle: {
            font: "Roboto",
            fontSize: 9,
            lineHeight: 1.25,
        },
        };

        const safeQuotationNumber =
        revision.quotation.quotationNumber.replace(
            /[^a-zA-Z0-9_-]/g,
            "_"
        );

        // Each revision gets its own file.
        const fileName =
        `${safeQuotationNumber}-rev-${revision.revisionNumber}.pdf`;

        const outputPath = path.resolve(
        process.cwd(),
        "uploads",
        "quotations",
        fileName
        );

        await writePdfFile(docDefinition, outputPath);

        return {
        filePath: outputPath,
        fileName,
        };
    },
};