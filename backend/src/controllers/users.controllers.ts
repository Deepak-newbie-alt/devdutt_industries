import type { Response } from "express";

import type { TchangeUserRole, TcreateUserInput, TidParams, TlistUsersQuery, TupdateProfile, TupdateUserStatus } from "../schemas/userSchema.js";
import type { ValidatedRequest } from "../types/ValidatedRequest.js";

import { catchAsync } from "../utils/catchAsync.js";
import { UserService } from "../services/user.services.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";
import { getAuth } from "@clerk/express";



// --------------------------------------------------
// 1. Create salesperson
// --------------------------------------------------

export const createSalesman =
    catchAsync<ValidatedRequest<TcreateUserInput>>(
        async (req, res: Response) => {
            const data = await UserService.createSalesman(
                req.validated.body
            );

            res.status(201).json(
                new ApiResponse(
                    201,
                    "Salesperson created successfully.",
                    data
                )
            );
        }
    );


// --------------------------------------------------
// 2. Get currently authenticated user
// --------------------------------------------------

export const getCurrentUser =
    catchAsync(
        async (req, res: Response) => {
            const { isAuthenticated, userId } = getAuth(req);

            if (!isAuthenticated || !userId) {
                throw new ApiError(
                    401,
                    "Authentication required."
                );
            }

            const data = await UserService.getByClerkId(userId);

            res.status(200).json(
                new ApiResponse(
                    200,
                    "User retrieved successfully.",
                    data
                )
            );
        }
    );


// --------------------------------------------------
// 3. Get user by database ID
// --------------------------------------------------

export const getUserById =
    catchAsync<ValidatedRequest<TidParams>>(
        async (req, res: Response) => {

            const data = await UserService.getById(req.validated.params);

            res.status(200).json(
                new ApiResponse(
                    200,
                    "User retrieved successfully.",
                    data
                )
            );
        }
    );


// --------------------------------------------------
// 4. List users with pagination, search and filters
// --------------------------------------------------

export const listUsers =
    catchAsync<ValidatedRequest<TlistUsersQuery>>(
        async (req, res: Response) => {

            const data = await UserService.listUsers(
                req.validated.query
            );

            res.status(200).json(
                new ApiResponse(
                    200,
                    "Users retrieved successfully.",
                    data
                )
            );
        }
    );


// --------------------------------------------------
// 5. Update user profile
// --------------------------------------------------

export const updateProfile =
    catchAsync<ValidatedRequest<TupdateProfile>>(
        async (req, res: Response) => {

            // Users may edit only their own profile; admins may edit any.
            if (
                req.user!.role !== "ADMIN" &&
                req.user!.id !== req.validated.params.id
            ) {
                throw new ApiError(403, "Forbidden: can't edit another user's profile");
            }

            const data = await UserService.updateProfile(
                req.validated.params,
                req.validated.body
            );

            res.status(200).json(
                new ApiResponse(
                    200,
                    "User profile updated successfully.",
                    data
                )
            );
        }
    );


// --------------------------------------------------
// 6. Change user role
// --------------------------------------------------

export const changeUserRole =
    catchAsync<ValidatedRequest<TchangeUserRole>>(
        async (req, res: Response) => {

            const data = await UserService.changeRole(
                req.validated.params,
                req.validated.body
            );

            res.status(200).json(
                new ApiResponse(
                    200,
                    "User role updated successfully.",
                    data
                )
            );
        }
    );


// --------------------------------------------------
// 7. Activate or deactivate user
// --------------------------------------------------

export const updateUserStatus =
    catchAsync<ValidatedRequest<TupdateUserStatus>>(
        async (req, res: Response) => {
            

            const data = await UserService.setStatus(
                req.validated.params,
                req.validated.body
            );

            res.status(200).json(
                new ApiResponse(
                    200,
                    "User status updated successfully.",
                    data
                )
            );
        }
    );