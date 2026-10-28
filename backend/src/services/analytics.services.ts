import prisma from "../lib/prisma.js";
import {
    CategoryStatus,
    InquiryStatus,
    OrderStatus,
    ProductStatus,
    QuotationRevisionStatus,
    UserRole,
    UserStatus,
} from "../generated/prisma/enums.js";

// Turns groupBy rows into { VALUE: count } with every enum value present (0 when none).
function countsByValue<T extends string>(
    values: Record<string, T>,
    rows: { value: T; count: number }[]
) {
    const counts = Object.fromEntries(
        Object.values(values).map((value) => [value, 0])
    ) as Record<T, number>;

    for (const row of rows) {
        counts[row.value] = row.count;
    }

    return counts;
}

export const analyticsService = {
    // Plain record counts for the admin overview; nothing is estimated.
    getSummary: async () => {
        const [
            inquiries,
            revisions,
            quotations,
            orders,
            users,
            products,
            categories,
        ] = await Promise.all([
            prisma.inquiry.groupBy({ by: ["status"], _count: { _all: true } }),
            prisma.quotationRevision.groupBy({ by: ["quotationRevisionStatus"], _count: { _all: true } }),
            prisma.quotation.count(),
            prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
            prisma.user.groupBy({ by: ["role", "status"], _count: { _all: true } }),
            prisma.product.groupBy({ by: ["status"], _count: { _all: true } }),
            prisma.category.groupBy({ by: ["status"], _count: { _all: true } }),
        ]);

        return {
            inquiries: countsByValue(
                InquiryStatus,
                inquiries.map((row) => ({ value: row.status, count: row._count._all }))
            ),
            quotations: {
                total: quotations,
                revisionsByStatus: countsByValue(
                    QuotationRevisionStatus,
                    revisions.map((row) => ({ value: row.quotationRevisionStatus, count: row._count._all }))
                ),
            },
            orders: countsByValue(
                OrderStatus,
                orders.map((row) => ({ value: row.status, count: row._count._all }))
            ),
            users: Object.values(UserRole).map((role) => ({
                role,
                byStatus: countsByValue(
                    UserStatus,
                    users
                        .filter((row) => row.role === role)
                        .map((row) => ({ value: row.status, count: row._count._all }))
                ),
            })),
            products: countsByValue(
                ProductStatus,
                products.map((row) => ({ value: row.status, count: row._count._all }))
            ),
            categories: countsByValue(
                CategoryStatus,
                categories.map((row) => ({ value: row.status, count: row._count._all }))
            ),
        };
    },
};
