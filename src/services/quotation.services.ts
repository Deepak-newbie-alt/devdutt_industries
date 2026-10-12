import { editQuotation } from "../controllers/quotation.controllers.js";
import { Prisma, QuotationRevisionStatus } from "../generated/prisma/client.js";
import prisma from "../lib/prisma.js";
import type {
    TcreateQuotation,
    TcreateRevision,
    TeditQuotationRevision,
    TgetQuotationRevisionParams,
    TquotationItem,
    TsendQuotation
} from "../schemas/quotationSchema.js";
import ApiError from "../utils/ApiError.js";

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
                    id:params.revisionId,
                    quotationRevisionStatus:"DRAFT"
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
    
    editQuotationRevision: async (
        params: TeditQuotationRevision["params"],
        body: TeditQuotationRevision["body"]
    ) => {
        const {
            buyerName,
            companyName,
            address,
            gstNumber,
            mobileNumber,
            email,
            productName,
            machineSpecifications,
            terms,
            validUntil,
            cgstRate,
            sgstRate,
            igstRate,
            items
        } = body;

        // Calculate taxable amount from all submitted items
        let taxableAmount = new Prisma.Decimal(0);

        for (const item of items) {
            const quantity = new Prisma.Decimal(item.quantity);
            const unitPrice = new Prisma.Decimal(item.unitPrice);

            taxableAmount = taxableAmount.add(
                quantity.mul(unitPrice)
            );
        }

        // Convert provided rates to Decimal; absent rates mean no tax
        const cgst = cgstRate !== undefined
            ? new Prisma.Decimal(cgstRate)
            : null;

        const sgst = sgstRate !== undefined
            ? new Prisma.Decimal(sgstRate)
            : null;

        const igst = igstRate !== undefined
            ? new Prisma.Decimal(igstRate)
            : null;

        const cgstAmount =
            cgst !== null
                ? taxableAmount.mul(cgst).div(100)
                : null;

        const sgstAmount =
            sgst !== null
                ? taxableAmount.mul(sgst).div(100)
                : null;

        const igstAmount =
            igst !== null
                ? taxableAmount.mul(igst).div(100)
                : null;

        const grandTotal = taxableAmount
            .add(cgstAmount ?? 0)
            .add(sgstAmount ?? 0)
            .add(igstAmount ?? 0);

        return prisma.$transaction(async (tx) => {
            // Only draft revisions can be edited
            const revision = await tx.quotationRevision.update({
                where: {
                    id: params.revisionId,
                    quotationRevisionStatus: "DRAFT"
                },
                data: {
                    buyerName,
                    companyName: companyName ?? null,
                    address,
                    gstNumber,
                    mobileNumber,
                    email: email ?? null,
                    productName,
                    machineSpecifications,
                    terms,
                    validUntil,

                    taxableAmount,
                    cgstRate: cgst,
                    cgstAmount,
                    sgstRate: sgst,
                    sgstAmount,
                    igstRate: igst,
                    igstAmount,
                    grandTotal
                }
            });

            // Replace all quotation items
            await tx.quotationItem.deleteMany({
                where: {
                    quotationRevisionId: revision.id
                }
            });

            await tx.quotationItem.createMany({
                data: items.map((item:TquotationItem) => {
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

            return tx.quotationRevision.findUniqueOrThrow({
                where: {
                    id: revision.id
                },
                include: {
                    items: true
                }
            });
        });
    },
    getRevisions:async(params:TgetQuotationRevisionParams["params"])=>{
        const {quotationId}=params;

        const revisions=await prisma.quotationRevision.findMany({
            where:{
                quotationId
            },
            include:{
                quotation:{
                    select:{
                        inquiryId:true,
                        quotationNumber:true
                    }
                },
                items:true
            }
        })

        return revisions;
    },
    requestRevision:async(params:TeditQuotationRevision["params"])=>{
        const {revisionId}=params;

        const revision=await prisma.quotationRevision.updateMany({
            where:{
                    id:revisionId,
                    quotationRevisionStatus:"SENT"
                },
                data:{
                    quotationRevisionStatus:"REVISION_REQUESTED",
                }
        })

        if(revision.count==0){
            throw new ApiError(409,"Only sent quotations can have revision requests")
        }

        return {};
    },
    createRevision:async(params:TcreateRevision["params"])=>{
        const {quotationId}=params;

        return await prisma.$transaction(async(tx)=>{
            const revisions=await tx.quotationRevision.findMany({
                where:{
                    quotationId
                },
                select:{
                    revisionNumber:true
                },
                orderBy:{
                    revisionNumber:"desc"
                }
            });

            const latestRevisionNumber = revisions[0]?.revisionNumber;

            if (latestRevisionNumber === undefined) {
                throw new ApiError(404,"No revisions found for this quotation");
            }

            const latestRevision = await tx.quotationRevision.findUnique({
                where:{
                    quotationId_revisionNumber:{
                        quotationId,
                        revisionNumber: latestRevisionNumber
                    },
                    quotationRevisionStatus:"REVISION_REQUESTED"
                },
                include:{
                    items:true
                }
            });

            if (!latestRevision) {
                throw new ApiError(409,"Can only create new revision if customer requested")
            }

            await tx.quotationRevision.update({
                where:{
                    quotationId_revisionNumber:{
                        quotationId,
                        revisionNumber: latestRevisionNumber
                    }
                },
                data:{
                    quotationRevisionStatus:"SUPERSEDED"
                }
            })

            const newRevisionNumber = latestRevisionNumber + 1;

            const newRevision = await tx.quotationRevision.create({
                data:{
                    quotationId,
                    revisionNumber:newRevisionNumber,
                    quotationRevisionStatus:"DRAFT",
                    buyerName: latestRevision.buyerName,
                    companyName: latestRevision.companyName,
                    address: latestRevision.address,
                    gstNumber: latestRevision.gstNumber,
                    mobileNumber: latestRevision.mobileNumber,
                    email: latestRevision.email,
                    productName: latestRevision.productName,
                    machineSpecifications: latestRevision.machineSpecifications as Prisma.InputJsonObject,
                    terms: latestRevision.terms as Prisma.InputJsonObject,
                    validUntil: latestRevision.validUntil,
                    salespersonId: latestRevision.salespersonId,
                    taxableAmount: latestRevision.taxableAmount,
                    cgstRate: latestRevision.cgstRate,
                    cgstAmount: latestRevision.cgstAmount,
                    sgstRate: latestRevision.sgstRate,
                    sgstAmount: latestRevision.sgstAmount,
                    igstRate: latestRevision.igstRate,
                    igstAmount: latestRevision.igstAmount,
                    grandTotal: latestRevision.grandTotal
                },
                include:{
                    items:true
                }
            });


            return newRevision;
        });
    },
    acceptRevision:async(params:TeditQuotationRevision["params"])=>{
        const {revisionId}=params;

        return await prisma.$transaction(async(tx)=>{
            const result=await tx.quotationRevision.updateMany({
                where:{
                    id:revisionId,
                    quotationRevisionStatus:"SENT",
                    validUntil:{
                        gt: new Date(new Date().setHours(0, 0, 0, 0))
                    }
                },
                data:{
                    quotationRevisionStatus:"ACCEPTED"
                }
            })

            if(result.count==0){
                throw new ApiError(404,"Can't find revision or invalid revision status");
            }

            const revision=await tx.quotationRevision.findUnique({
                where:{
                    id:revisionId
                },
                include:{
                    quotation:{
                        select:{
                            inquiryId:true
                        }
                    }
                }
            })

            const inquiryId = revision?.quotation?.inquiryId;

            if(!inquiryId){
                throw new ApiError(404,"Can't find associated inquiry for revision");
            }

            return await tx.inquiry.update({
                where:{
                    id: inquiryId
                },
                data:{
                    status:"CLOSED"
                },
                include:{
                    quotation:true
                }
            })
        })
    },
    rejectRevision:async(params:TeditQuotationRevision["params"])=>{
        const {revisionId}=params;

        return await prisma.$transaction(async(tx)=>{
            const result=await tx.quotationRevision.updateMany({
                where:{
                    id:revisionId,
                    quotationRevisionStatus:"SENT",
                    validUntil:{
                        gt: new Date(new Date().setHours(0, 0, 0, 0))
                    }
                },
                data:{
                    quotationRevisionStatus:"REJECTED"
                }
            })

            if(result.count==0){
                throw new ApiError(404,"Can't find revision or invalid revision status");
            }

            const revision=await tx.quotationRevision.findUnique({
                where:{
                    id:revisionId
                },
                include:{
                    quotation:{
                        select:{
                            inquiryId:true
                        }
                    }
                }
            })

            const inquiryId = revision?.quotation?.inquiryId;

            if(!inquiryId){
                throw new ApiError(404,"Can't find associated inquiry for revision");
            }

            return await tx.inquiry.update({
                where:{
                    id: inquiryId
                },
                data:{
                    status:"CLOSED"
                },
                include:{
                    quotation:true
                }
            })
        })
    }
};