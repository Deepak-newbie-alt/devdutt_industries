import { Prisma, QuotationRevisionStatus } from "../generated/prisma/client.js";
import prisma from "../lib/prisma.js";
import type {
    TcreateQuotation,
    TeditQuotation,
    TquotationItem,
    TsendQuotation
} from "../schemas/quotationSchema.js";

export const QuotationService = {

    createQuotation: async (
        params: TcreateQuotation["params"],
        body: TcreateQuotation["body"]
    ) => {

        return await prisma.$transaction(async (tx) => {

            const { inquiryId } = params;
            const year = new Date().getFullYear();

            // Generate yearly sequential quotation number
            const counter = await tx.quotationNumberCounter.upsert({
                where: { year },
                create: {
                    year,
                    lastNumber: 1
                },
                update: {
                    lastNumber: {
                        increment: 1
                    }
                }
            });

            const quotationNumber =
                `QT-${year}-${String(counter.lastNumber).padStart(5, "0")}`;

            // Calculate quotation amounts
            let taxableAmount = new Prisma.Decimal(0);

            for (const item of body.items) {
                const quantity = new Prisma.Decimal(item.quantity);
                const unitPrice = new Prisma.Decimal(item.unitPrice);

                taxableAmount = taxableAmount.add(
                    quantity.mul(unitPrice)
                );
            }

            const cgstRate = body.cgstRate
                ? new Prisma.Decimal(body.cgstRate)
                : null;

            const sgstRate = body.sgstRate
                ? new Prisma.Decimal(body.sgstRate)
                : null;

            const igstRate = body.igstRate
                ? new Prisma.Decimal(body.igstRate)
                : null;

            let cgstAmount: Prisma.Decimal | null = null;
            let sgstAmount: Prisma.Decimal | null = null;
            let igstAmount: Prisma.Decimal | null = null;

            if (cgstRate !== null && sgstRate !== null) {
                cgstAmount = taxableAmount
                    .mul(cgstRate)
                    .div(100);

                sgstAmount = taxableAmount
                    .mul(sgstRate)
                    .div(100);
            }

            if (igstRate !== null) {
                igstAmount = taxableAmount
                    .mul(igstRate)
                    .div(100);
            }

            const grandTotal = taxableAmount
                .add(cgstAmount ?? 0)
                .add(sgstAmount ?? 0)
                .add(igstAmount ?? 0);

            // Create quotation
            const quotation = await tx.quotation.create({
                data: {
                    inquiryId,
                    salespersonId: body.salespersonId,
                    quotationNumber
                }
            });

            // Create first revision
            const revision = await tx.quotationRevision.create({
                data: {
                    quotationId: quotation.id,
                    revisionNumber: 1,
                    quotationRevisionStatus: "DRAFT",

                    buyerName: body.buyerName,
                    companyName: body.companyName ?? null,
                    address: body.address ?? null,
                    gstNumber: body.gstNumber ?? null,
                    mobileNumber: body.mobileNumber ?? null,
                    email: body.email ?? null,

                    productName: body.productName ?? null,
                    machineSpecifications:
                        body.machineSpecifications ?? null,
                    terms: body.terms ?? null,

                    validUntil: body.validUntil ?? null,

                    salespersonId: body.salespersonId,

                    taxableAmount,

                    cgstRate,
                    cgstAmount,

                    sgstRate,
                    sgstAmount,

                    igstRate,
                    igstAmount,

                    grandTotal
                }
            });

            // Create quotation items
            await tx.quotationItem.createMany({
                data: body.items.map((item: TquotationItem) => {

                    const quantity =
                        new Prisma.Decimal(item.quantity);

                    const unitPrice =
                        new Prisma.Decimal(item.unitPrice);

                    return {
                        quotationRevisionId: revision.id,
                        name: item.name,
                        description: item.description ?? null,
                        quantity: item.quantity,
                        unit: item.unit,
                        unitPrice,
                        amount: quantity.mul(unitPrice),
                        displayOrder: item.displayOrder
                    };
                })
            });

            return tx.quotation.findUnique({
                where: {
                    id: quotation.id
                },
                include: {
                    revisions: {
                        include: {
                            items: true
                        }
                    }
                }
            });
        });
    },
    sendQuotation:async(params:TsendQuotation["params"],body:TsendQuotation["body"])=>{
        return await prisma.$transaction(async(tx)=>{
            const revision=await tx.quotationRevision.update({
                where:{
                    id:params.revisionId
                },
                data:{
                    quotationRevisionStatus:"SENT",
                    pdfUrl:body.pdfUrl
                },
                include:{
                    quotation:{
                        select:{
                            id:true,
                            inquiryId:true,
                            quotationNumber:true
                        }
                    },
                    items:{
                        select:{
                            id:true,
                            name:true,
                            quantity:true,
                            unitPrice:true,
                            amount:true
                        }
                    }
                }
            })

            return revision;
        })
    },
    editQuotation:async(params:TeditQuotation["params"],body:TeditQuotation["body"])=>{
        const {buyerName,companyName,address,gstNumber,mobileNumber,email,productName,machineSpecifications,terms,validUntil,items}=body;

            // Calculate quotation amounts
            let taxableAmount = new Prisma.Decimal(0);

            if(items){
                for (const item of items) {
                const quantity = new Prisma.Decimal(item.quantity);
                const unitPrice = new Prisma.Decimal(item.unitPrice);

                taxableAmount = taxableAmount.add(
                    quantity.mul(unitPrice)
                );
            }
            }

            const cgstRate = body.cgstRate
                ? new Prisma.Decimal(body.cgstRate)
                : null;

            const sgstRate = body.sgstRate
                ? new Prisma.Decimal(body.sgstRate)
                : null;

            const igstRate = body.igstRate
                ? new Prisma.Decimal(body.igstRate)
                : null;

            let cgstAmount: Prisma.Decimal | null = null;
            let sgstAmount: Prisma.Decimal | null = null;
            let igstAmount: Prisma.Decimal | null = null;

            if (cgstRate !== null && sgstRate !== null) {
                cgstAmount = taxableAmount
                    .mul(cgstRate)
                    .div(100);

                sgstAmount = taxableAmount
                    .mul(sgstRate)
                    .div(100);
            }

            if (igstRate !== null) {
                igstAmount = taxableAmount
                    .mul(igstRate)
                    .div(100);
            }

            const grandTotal = taxableAmount
                .add(cgstAmount ?? 0)
                .add(sgstAmount ?? 0)
                .add(igstAmount ?? 0);

        return await prisma.$transaction(async(tx)=>{
            const revision=await tx.quotationRevision.update({
                where:{
                    id:params.revisionId
                },
                data:{
                    ...(buyerName!==undefined?{buyerName}:{}),
                    ...(companyName!==undefined?{companyName}:{}),
                    ...(address!==undefined?{address}:{}),
                    ...(gstNumber!==undefined?{gstNumber}:{}),
                    ...(mobileNumber!==undefined?{mobileNumber}:{}),
                    ...(email!==undefined?{email}:{}),
                    ...(productName!==undefined?{productName}:{}),
                    ...(machineSpecifications!==undefined?{machineSpecifications}:{}),
                    ...(terms!==undefined?{terms}:{}),
                    ...(validUntil!==undefined?{validUntil}:{}),
                    ...(items!==undefined?{
                        taxableAmount,
                        cgstRate,
                        cgstAmount,
                        sgstRate,
                        sgstAmount,
                        igstRate,
                        igstAmount,
                        grandTotal
                    }:{}),
                }
            });

            if (items) {
                await tx.quotationItem.deleteMany({
                    where: {
                        quotationRevisionId: params.revisionId
                    }
                });

                await tx.quotationItem.createMany({
                    data: items.map((item:TquotationItem)=>{
                        const quantity = new Prisma.Decimal(item.quantity);
                        const unitPrice = new Prisma.Decimal(item.unitPrice);

                        return {
                            quotationRevisionId: revision.id,
                            name: item.name,
                            description: item.description ?? null,
                            quantity: item.quantity,
                            unit: item.unit,
                            unitPrice,
                            amount: quantity.mul(unitPrice),
                            displayOrder: item.displayOrder
                        };
                    })
                });
            }

            return revision;
        })
    }
};