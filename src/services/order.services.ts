
import prisma from "../lib/prisma.js";
import type { TrevisionIdParams } from "../schemas/quotationSchema.js";
import ApiError from "../utils/ApiError.js";
import { getTodayInIndiaDateString } from "../utils/dateOnly.js";

export const OrderService = {
    createOrder: async (params: TrevisionIdParams["params"]) => {
        const { revisionId } = params;

        return prisma.$transaction(async (tx) => {
            const revision = await tx.quotationRevision.findUnique({
                where: {
                    id: revisionId,
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
                    400,
                    "Order can only be created if quotation is accepted"
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
                    quotationRevisionId: revisionId,
                    status: "CONFIRMED",
                    items: {
                        create: revision.items.map((item) => ({
                            name: item.name,
                            description: item.description ?? "",
                            quantity: item.quantity,
                            unit: item.unit,
                            unitPrice: item.unitPrice,
                            amount: item.amount,
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
};
