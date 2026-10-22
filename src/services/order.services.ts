
import type { Prisma } from "../generated/prisma/client.js";
import prisma from "../lib/prisma.js";
import type { TorderActivityAddNote, TorderIdParams, TorderStatusTransition, TviewOrdersQuery, TyourOrderBody } from "../schemas/orderSchema.js";
import ApiError from "../utils/ApiError.js";
import { getTodayInIndiaDateString } from "../utils/dateOnly.js";

export const OrderService = {
    createOrder: async (body: TyourOrderBody["body"],userId:number) => {
        const { quotationRevisionId } = body;

        return prisma.$transaction(async (tx) => {
            const revision = await tx.quotationRevision.findUnique({
                where: {
                    id: quotationRevisionId,
                },
                include: {
                    items: true,
                },
            });

            if (!revision) {
                throw new ApiError(404, "Revision not found");
            }

            if(revision.salespersonId!==userId){
                throw new ApiError(403,"Forbidden can't access other salesperson resource");
            }

            if (revision.quotationRevisionStatus !== "ACCEPTED") {
                throw new ApiError(
                    409,
                    "An order can only be created from an accepted quotation revision"
                );
            }

            const today = getTodayInIndiaDateString();
            const year = Number(today.slice(0, 4));

            const counter = await tx.orderNumberCounter.upsert({
                where: { year },
                create: {
                    year,
                    lastNumber: 1,
                },
                update: {
                    lastNumber: {
                        increment: 1,
                    },
                },
            });

            const orderNumber =
                `ODR-${year}-${String(counter.lastNumber).padStart(5, "0")}`;

            const order = await tx.order.create({
                data: {
                    orderNumber,
                    quotationRevisionId,
                    status: "CONFIRMED",
                    items: {
                        create: revision.items.map((item) => ({
                            name: item.name,
                            description: item.description ?? "",
                            quantity: item.quantity,
                            unit: item.unit,
                            unitPrice: item.unitPrice,
                            amount: item.amount,
                            displayOrder:item.displayOrder
                        })),
                    },
                }
            });

            await tx.orderActivity.create({
                data:{
                    orderId:order.id,
                    userId,
                    activityType:"CREATED",
                    newStatus:"CONFIRMED",
                    note:"Order confirmed"
                }
            })

            return tx.order.findUniqueOrThrow({
                where:{
                    id:order.id
                },
                include:{
                    items:true,
                    activities:{
                        orderBy:{
                            createdAt:"asc"
                        }
                    }
                }
            });
        });
    },
    viewOrders:async(query:TviewOrdersQuery["query"])=>{
        const {page,limit,status,search}=query;

        const where:Prisma.OrderWhereInput={};

        const skip=(page-1)*limit;

        if(status){
            where.status=status;
        }

        if(search){
            where.orderNumber={
                contains:search,
                mode:"insensitive"
            }
        }

        const prismaQuery:Prisma.OrderFindManyArgs={
            take:limit,
            skip,
            where,
            orderBy:[
                {createdAt:"desc"},
                {id:"desc"}
            ],
            include:{
                quotationRevision:true,
                items:true
            }
        }
        const [orders,total]=await prisma.$transaction([
            prisma.order.findMany(prismaQuery),
            prisma.order.count({where})
        ]);

        return {
            orders,
            metadata:{
                page,
                limit,
                total,
                totalPages:Math.ceil(total/limit)
            }
        };
    },
    viewOrdersById:async(params:TorderIdParams["params"])=>{
        const {orderId}=params;

        const order=await prisma.order.findUnique({
            where:{
                id:orderId
            },
            include:{
                quotationRevision:true,
                items:true
            }
        })

        if(!order){
            throw new ApiError(404,"Order not found");
        }

        return order;
    },
    changeOrderStatus:async(params:TorderStatusTransition["params"],body:TorderStatusTransition["body"],userId:number)=>{
        const {orderId}=params;
        const {status}=body;

        return await prisma.$transaction(async(tx)=>{
            const order=await tx.order.findUnique({
                where:{
                    id:orderId
                },
                include:{
                    quotationRevision:{
                        select:{
                            salespersonId:true
                        }
                    }
                }
            })

            if(!order){
                throw new ApiError(404,"Order not found");
            }

            if(order.quotationRevision.salespersonId!==userId){
                throw new ApiError(403,"Forbidden can't access other salesperson resource");
            }

            if(order.status==="DELIVERED" || order.status==="CANCELLED"){
                throw new ApiError(409,`Can't change status for this order its already ${order.status}`);
            }

            const isValidTransition =
                (order.status === "CONFIRMED" &&
                    (status === "IN_PRODUCTION" || status === "CANCELLED")) ||
                (order.status === "IN_PRODUCTION" && status === "READY") ||
                (order.status === "READY" && status === "DISPATCHED") ||
                (order.status === "DISPATCHED" && status === "DELIVERED");

            if (!isValidTransition) {
                throw new ApiError(409, "Invalid status transition");
            }

            const result=await tx.order.updateMany({
                where: {
                    id: orderId,
                    status: order.status
                },
                data: { status },
            });

            if(result.count==0){
                throw new ApiError(409,"Couldn't change status please refresh and try again");
            }

            await tx.orderActivity.create({
                data:{
                    orderId,
                    userId,
                    activityType:"STATUS_CHANGED",
                    previousStatus:order.status,
                    newStatus:status,
                    note:"Status changed"
                }
            })

            return tx.order.findUniqueOrThrow({
                where:{
                    id:orderId
                },
                include:{
                    items:true,
                    activities:true
                }
            })
        })
    },
    addNote:async(params:TorderActivityAddNote["params"],body:TorderActivityAddNote["body"],userId:number)=>{
        const {orderId}=params;
        const {note}=body;

        const order=await prisma.order.findUnique({
            where:{
                id:orderId
            },
            include:{
                quotationRevision:{
                    select:{
                        salespersonId:true
                    }
                }
            }
        })

        if(!order){
            throw new ApiError(404,"Order not found");
        }

        if(order.quotationRevision.salespersonId!==userId){
            throw new ApiError(403,"Forbidden can't access other salesperson resource");
        }

        return await prisma.orderActivity.create({
            data:{
                orderId,
                userId,
                activityType:"NOTE_ADDED",
                note
            }
        })
    },
    viewActivities:async(params:TorderIdParams["params"])=>{
        const {orderId}=params;

        const order=await prisma.order.findUnique({
            where:{
                id:orderId
            }
        })

        if(!order){
            throw new ApiError(404,"Order not found");
        }

        return prisma.orderActivity.findMany({
            where:{
                orderId
            },
            orderBy:{
                createdAt:"asc"
            }
        })
    }
};
