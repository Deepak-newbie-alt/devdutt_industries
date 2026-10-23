
import prisma from "../lib/prisma.js";
import type {
    TcreateCompanySettings,
    TupdateCompanySettings
} from "../schemas/companySettingsSchema.js";
import ApiError from "../utils/ApiError.js";

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