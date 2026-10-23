import type { Response } from "express";
import { catchAsync } from "../utils/catchAsync.js";
import { companySettingsService } from "../services/company.settings.services.js";
import type {
    TcreateCompanySettings,
    TupdateCompanySettings
} from "../schemas/companySettingsSchema.js";
import type { ValidatedRequest } from "../types/ValidatedRequest.js";
import ApiResponse from "../utils/ApiResponse.js";

export const createCompanySettings = catchAsync<ValidatedRequest<TcreateCompanySettings>>(
    async (req, res: Response) => {

        const data = await companySettingsService.createCompanySettings(req.validated.body);

        res.status(201).json(
            new ApiResponse(200,"Company settings created successfully",data)
        );
        return;
    }
);

export const getCompanySettings = catchAsync(
    async (_req, res: Response) => {
        const data = await companySettingsService.getCompanySettings();

        res.status(200).json(
            new ApiResponse(200,"Company settings fetched successfully",data)
        );
    }
);

export const updateCompanySettings = catchAsync<ValidatedRequest<TupdateCompanySettings>>(
    async (req, res: Response) => {

        const data = await companySettingsService.updateCompanySettings(req.validated.body);

        res.status(200).json(
            new ApiResponse(200,"Company settings updated successfully",data)
        );
        return;
    }
);