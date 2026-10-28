
import type { Prisma } from "../generated/prisma/client.js";
import prisma from "../lib/prisma.js";
import type {
    TcreateCompanySettings,
    TupdateCompanySettings
} from "../schemas/companySettingsSchema.js";
import ApiError from "../utils/ApiError.js";

// Fields the public website may show. Anything not listed here stays admin-only.
const publicCompanyInfoSelect = {
    companyName: true,
    addressLine1: true,
    addressLine2: true,
    city: true,
    state: true,
    postalCode: true,
    country: true,
    phone: true,
    email: true,
    website: true,
    logoUrl: true
} satisfies Prisma.CompanySettingsSelect;

export const companySettingsService = {
    createCompanySettings: async (body: TcreateCompanySettings["body"]) => {
        const existing = await prisma.companySettings.findUnique({
            where: {
                id: 1
            }
        });

        if (existing) {
            throw new ApiError(409, "Company settings already exist");
        }

        return await prisma.companySettings.create({
            data: {
                id: 1,
                ...body
            }
        });
    },

    getCompanySettings: async () => {
        const companySettings = await prisma.companySettings.findUnique({
            where: {
                id: 1
            }
        });

        if (!companySettings) {
            throw new ApiError(404, "Company settings not found");
        }

        return companySettings;
    },

    getPublicCompanyInfo: async () => {
        const companyInfo = await prisma.companySettings.findUnique({
            where: {
                id: 1
            },
            select: publicCompanyInfoSelect
        });

        if (!companyInfo) {
            throw new ApiError(404, "Company information not found");
        }

        return companyInfo;
    },

    updateCompanySettings: async (body: TupdateCompanySettings["body"]) => {
        const companySettings = await prisma.companySettings.update({
            where: {
                id: 1
            },
            data: Object.fromEntries(
                Object.entries(body).filter(([,value])=>value!==undefined)
            )
        });

        return companySettings;
    },
};