import { Prisma } from "../generated/prisma/client.js";
import prisma from "../lib/prisma.js";
import type {
    TcreateQuotation,
    TeditQuotationRevision,
    TquotationIdParams,
    TquotationItem,
    TrevisionIdParams,
    TsendQuotation
} from "../schemas/quotationSchema.js";
import ApiError from "../utils/ApiError.js";
import { getTodayInIndiaDbDate } from "../utils/dateOnly.js";

export const QuotationService = {

    createQuotation: async (
        params: TcreateQuotation["params"],
        body: TcreateQuotation["body"],
        salespersonId:number
    ) => {

        return await prisma.$transaction(async (tx) => {

            const { inquiryId } = params;
            const year = Number(
                new Intl.DateTimeFormat("en-US", {
                    timeZone: "Asia/Kolkata",
                    year: "numeric"
                }).format(new Date())
            );

            const inquiry=await tx.inquiry.findUnique({
                where:{
                    id:inquiryId
                },
                select:{
                    status:true,
                    salespersonId:true
                }
            })

            if(!inquiry){
                throw new ApiError(404,"Inquiry not found");
            }

            if(inquiry.status!=="IN_PROGRESS"){
                throw new ApiError(400,"Invalid inquiry status")
            }

            if(inquiry.salespersonId!==salespersonId){
                throw new ApiError(403,"Inquiry is assigned to a different salesperson")
            }

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
                    .div(100)
                    .toDecimalPlaces(2);

                sgstAmount = taxableAmount
                    .mul(sgstRate)
                    .div(100)
                    .toDecimalPlaces(2);
            }

            if (igstRate !== null) {
                igstAmount = taxableAmount
                    .mul(igstRate)
                    .div(100)
                    .toDecimalPlaces(2);
            }

            const grandTotal = taxableAmount
                .add(cgstAmount ?? 0)
                .add(sgstAmount ?? 0)
                .add(igstAmount ?? 0);

            // Create quotation
            const quotation = await tx.quotation.create({
                data: {
                    inquiryId,
                    salespersonId,
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

                    salespersonId,

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
    sendQuotation:async(params:TsendQuotation["params"],body:TsendQuotation["body"],salespersonId:number)=>{
        return await prisma.$transaction(async(tx)=>{
            const revisionExists=await tx.quotationRevision.findUnique({
                where:{
                    id:params.revisionId
                }
            })

            if(!revisionExists){
                throw new ApiError(403,"Revision does not exists");
            }

            if(revisionExists.salespersonId!==salespersonId){
                throw new ApiError(403,"Forbidden, can't access other salesperson's resource");
            }

            const revision=await tx.quotationRevision.update({
                where:{
                    id:params.revisionId,
                    quotationRevisionStatus:"DRAFT",
                    validUntil:{
                        gte:getTodayInIndiaDbDate()
                    }
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
        body: TeditQuotationRevision["body"],
        salespersonId:number
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
                ? taxableAmount.mul(cgst).div(100).toDecimalPlaces(2)
                : null;

        const sgstAmount =
            sgst !== null
                ? taxableAmount.mul(sgst).div(100).toDecimalPlaces(2)
                : null;

        const igstAmount =
            igst !== null
                ? taxableAmount.mul(igst).div(100).toDecimalPlaces(2)
                : null;

        const grandTotal = taxableAmount
            .add(cgstAmount ?? 0)
            .add(sgstAmount ?? 0)
            .add(igstAmount ?? 0);

        return prisma.$transaction(async (tx) => {
            // Only draft revisions can be edited

            const revisionExists=await tx.quotationRevision.findUnique({
                where:{
                    id:params.revisionId
                }
            })

            if(!revisionExists){
                throw new ApiError(403,"Revision does not exists");
            }

            if(revisionExists.salespersonId!==salespersonId){
                throw new ApiError(403,"Forbidden, can't access other salesperson's resource");
            }


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
    getRevisions:async(params:TquotationIdParams["params"],actor:Actor)=>{
        const {quotationId}=params;

        const revisions=await prisma.quotationRevision.findMany({
            where:{
                quotationId
            },
            include:{
                quotation:{
                    select:{
                        inquiryId:true,
                        quotationNumber:true,
                        salespersonId:true
                    }
                },
                items:true
            },
            orderBy:{
                revisionNumber:"asc"
            }
        })

        if(actor.role!=="ADMIN" && actor.id!==revisions[0]?.quotation.salespersonId){
            throw new ApiError(403,"Forbidden can't access this resource");
        }

        return revisions;
    },
    requestRevision:async(params:TrevisionIdParams["params"])=>{
        const {revisionId}=params;

        const revision=await prisma.quotationRevision.updateMany({
            where:{
                    id:revisionId,
                    quotationRevisionStatus:"SENT",
                    validUntil:{
                        gte:getTodayInIndiaDbDate()
                    }
                },
                data:{
                    quotationRevisionStatus:"REVISION_REQUESTED",
                }
        })

        if(revision.count==0){
            throw new ApiError(409,"Only sent quotations can have revision requests")
        }

        return {
            revisionId,
            quotationRevisionStatus: "REVISION_REQUESTED"
        };
    },
    createRevision:async(params:TquotationIdParams["params"],salespersonId:number)=>{
        const {quotationId}=params;

        return await prisma.$transaction(async(tx)=>{
            const revisions=await tx.quotationRevision.findMany({
                where:{
                    quotationId
                },
                select:{
                    revisionNumber:true,
                    salespersonId:true
                },
                orderBy:{
                    revisionNumber:"desc"
                }
            });

            if(revisions[0]?.salespersonId!==salespersonId){
                throw new ApiError(403,"Can access other salesperson quotation");
            }
        
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
            

            const result=await tx.quotationRevision.updateMany({
                where: {
                    quotationId,
                    revisionNumber: latestRevisionNumber,
                    quotationRevisionStatus: "REVISION_REQUESTED"
                },
                data:{
                    quotationRevisionStatus:"SUPERSEDED"
                }
            })


            if(result.count==0){
                throw new ApiError(409,"There is no revision requested or is already handled by another salesperson");
            }

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
                    salespersonId,
                    taxableAmount: latestRevision.taxableAmount,
                    cgstRate: latestRevision.cgstRate,
                    cgstAmount: latestRevision.cgstAmount,
                    sgstRate: latestRevision.sgstRate,
                    sgstAmount: latestRevision.sgstAmount,
                    igstRate: latestRevision.igstRate,
                    igstAmount: latestRevision.igstAmount,
                    grandTotal: latestRevision.grandTotal,
                    items: {
                        create: latestRevision.items.map((item) => {
                            const { id, quotationRevisionId, ...itemData } = item;

                            return itemData;
                        })
                    }
                },
                include:{
                    items:true
                }
            });

            return newRevision;
        });
    },
    acceptRevision:async(params:TrevisionIdParams["params"])=>{
        const {revisionId}=params;

        return await prisma.$transaction(async(tx)=>{
            const result=await tx.quotationRevision.updateMany({
                where:{
                    id:revisionId,
                    quotationRevisionStatus:"SENT",
                    validUntil:{
                        gte: getTodayInIndiaDbDate()
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
                            inquiryId:true,
                            quotationNumber:true
                        }
                    }
                }
            })

            const inquiryId = revision?.quotation?.inquiryId;
            const quotationNumber=revision?.quotation?.quotationNumber;

            if(!inquiryId){
                throw new ApiError(404,"Can't find associated inquiry for revision");
            }

            const inquiry=await tx.inquiry.update({
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
            
            if(!quotationNumber){
                throw new ApiError(404,"Can't find quotation for the associated revision")
            }

            await tx.inquiryActivity.create({
                data:{
                    inquiryId,
                    salespersonId:inquiry.salespersonId,
                    activityType:"STATUS_CHANGED",
                    note:`Inquiry close because quotation ${quotationNumber} was accepted`
                }
            })

            return {
                revisionId,
                quotationRevisionStatus: "ACCEPTED",
                inquiryId,
                inquiryStatus: "CLOSED"
            };
        })
    },
    rejectRevision:async(params:TrevisionIdParams["params"])=>{
        const {revisionId}=params;

        return await prisma.$transaction(async(tx)=>{
            const result=await tx.quotationRevision.updateMany({
                where:{
                    id:revisionId,
                    quotationRevisionStatus:"SENT",
                    validUntil:{
                        gte: getTodayInIndiaDbDate()
                    }
                },
                data:{
                    quotationRevisionStatus:"REJECTED"
                }
            })

            if(result.count===0){
                throw new ApiError(404,"Can't find revision or invalid revision status");
            }

            const revision=await tx.quotationRevision.findUnique({
                where:{
                    id:revisionId
                },
                include:{
                    quotation:{
                        select:{
                            inquiryId:true,
                            quotationNumber:true
                        }
                    }
                }
            })

            const inquiryId = revision?.quotation?.inquiryId;
            const quotationNumber=revision?.quotation?.quotationNumber;

            if(!inquiryId){
                throw new ApiError(404,"Can't find associated inquiry for revision");
            }

            const inquiry=await tx.inquiry.update({
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

            if(!quotationNumber){
                throw new ApiError(404,"Can't find quotation for the associated revision")
            }

            await tx.inquiryActivity.create({
                data:{
                    inquiryId,
                    salespersonId:inquiry.salespersonId,
                    activityType:"STATUS_CHANGED",
                    note:`Inquiry close because quotation ${quotationNumber} was rejected`
                }
            })

            return {
                revisionId,
                quotationRevisionStatus: "REJECTED",
                inquiryId,
                inquiryStatus: "CLOSED"
            };
        })
    }
};