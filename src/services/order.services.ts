
import type { Prisma } from "../generated/prisma/client.js";
import prisma from "../lib/prisma.js";
import type { TorderIdParams, TorderStatusTransition, TviewOrdersQuery, TyourOrderBody } from "../schemas/orderSchema.js";
import ApiError from "../utils/ApiError.js";
import { getTodayInIndiaDateString } from "../utils/dateOnly.js";

export const OrderService = {
    createOrder: async (body: TyourOrderBody["body"]) => {
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
                },
                include: {
                    items: true,
                },
            });

            return order;
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
    changeOrderStatus:async(params:TorderStatusTransition["params"],body:TorderStatusTransition["body"])=>{
        const {orderId}=params;
        const {status}=body;

        return await prisma.$transaction(async(tx)=>{
            const order=await tx.order.findUnique({
                where:{
                    id:orderId
                }
            })

            if(!order){
                throw new ApiError(404,"Order not found");
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

            return tx.order.findUniqueOrThrow({
                where:{
                    id:orderId
                }
            })
        })
    }
};
