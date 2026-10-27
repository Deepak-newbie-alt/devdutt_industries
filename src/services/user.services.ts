import { clerkClient } from "@clerk/express";

import prisma from "../lib/prisma.js";
import type { TchangeUserRole, TcreateUserInput, TidParams, TlistUsersQuery, TupdateProfile, TupdateUserStatus } from "../schemas/userSchema.js";
import { Prisma, UserRole, UserStatus } from "../generated/prisma/client.js";
import ApiError from "../utils/ApiError.js";


// --------------------------------------------------
// Safe user fields: never return credentials.
// --------------------------------------------------

const userSelect = {
    id: true,
    clerkId: true,
    name: true,
    email: true,
    phone: true,
    role: true,
    status: true,
    createdAt: true,
    updatedAt: true,
} satisfies Prisma.UserSelect;


// --------------------------------------------------
// Helpers
// --------------------------------------------------

function splitName(name: string) {
    const parts = name.trim().split(/\s+/);

    return {
        firstName: parts[0],
        lastName: parts.slice(1).join(" "),
    };
}


// --------------------------------------------------
// User Service
// --------------------------------------------------

export const UserService = {

    // 1. Create a salesperson in Clerk + PostgreSQL

    async createSalesman(
        body: TcreateUserInput["body"]
    ) {
        const name = body.name.trim();
        const email = body.email.trim().toLowerCase();
        const phone = body.phone.trim();
        const password = body.password;

        // Check the application database before calling Clerk.
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [
                    { email },
                    { phone },
                ],
            },
            select: {
                id: true,
            },
        });

        if (existingUser) {
            throw new ApiError(
                409,
                "A user with this email or phone already exists."
            );
        }

        const { firstName, lastName } = splitName(name);

        let createdClerkId: string | undefined;

        try {
            // Step A: Create the authentication account.
            const clerkUser =
                await clerkClient.users.createUser({
                    emailAddress: [email],
                    password,

                    ...(firstName ? { firstName } : {}),
                    lastName,

                    // Don't mark an email as verified just
                    // because an administrator created it.
                    emailAddressIdentificationStatus: [
                        "reserved",
                    ],
                });

            createdClerkId = clerkUser.id;

            // Step B: Save the application user.
            // The password is NOT stored in PostgreSQL.
            const user = await prisma.user.create({
                data: {
                    clerkId: clerkUser.id,
                    name,
                    email,
                    phone,
                    role: "SALESPERSON",
                    status: "ACTIVE",
                },
                select: userSelect,
            });

            return user;

        } catch (error) {
            // Compensating cleanup if PostgreSQL fails
            // after Clerk has already created the account.
            if (createdClerkId) {
                try {
                    await clerkClient.users.deleteUser(
                        createdClerkId
                    );
                } catch (cleanupError) {
                    console.error(
                        "Failed to clean up Clerk account:",
                        cleanupError
                    );
                }
            }
        }
    },


    // 2. Get the currently authenticated application's user

    async getByClerkId(clerkId: string) {
        const user = await prisma.user.findUnique({
            where: { clerkId },
            select: userSelect,
        });

        if (!user) {
            throw new ApiError(
                404,
                "No application user is linked to this Clerk account."
            );
        }

        return user;
    },


    // 3. Get a user by PostgreSQL ID

    async getById(params:TidParams["params"]) {
        const {id}=params;
        const user = await prisma.user.findUnique({
            where: { id },
            select: userSelect,
        });

        if (!user) {
            throw new ApiError(
                404,
                "User not found."
            );
        }

        return user;
    },


    // 4. List users with pagination, filtering and search

    async listUsers(query:TlistUsersQuery["query"]) {

        const {page,limit,search,role,status}=query;

        const where: Prisma.UserWhereInput = {};

        if (role) {
            where.role = role;
        }

        if (status) {
            where.status = status;
        }

        if (search) {
            where.OR = [
                {
                    name: {
                        contains: search,
                        mode: "insensitive",
                    },
                },
                {
                    email: {
                        contains: search,
                        mode: "insensitive",
                    },
                },
                {
                    phone: {
                        contains: search,
                    },
                },
            ];
        }

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                select: userSelect,
                orderBy: {
                    createdAt: "desc",
                },
                skip: (page - 1) * limit,
                take: limit,
            }),

            prisma.user.count({ where }),
        ]);

        return {
            users,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    },


    // 5. Update name and phone

    async updateProfile(
        params:TupdateProfile["params"],
        body:TupdateProfile["body"]
    ) {
        const {id}=params;
        const {name,phone}=body;
        const data: Prisma.UserUpdateInput = {};

        if (name !== undefined) {
            data.name = name;
        }

        if (phone !== undefined) {
            data.phone = phone;
        }

        let updatedUser;

        updatedUser = await prisma.user.update({
            where: { id },
            data,
            select: userSelect,
        });

        // Keep Clerk's display name synchronized.
        if (
            name !== undefined &&
            updatedUser!.clerkId
        ) {
            const { firstName, lastName } =
                splitName(updatedUser!.name);

            try {
                await clerkClient.users.updateUser(
                    updatedUser!.clerkId,
                    {
                        ...(firstName ? { firstName } : {}),
                        lastName,
                    }
                );
            } catch {
                throw new ApiError(
                    502,
                    "The profile was saved in PostgreSQL, " +
                    "but syncing the name to Clerk failed. " +
                    "Retry the synchronization."
                );
            }
        }

        return updatedUser!;
    },


    // 6. Change a user's application role

    async changeRole(params:TchangeUserRole["params"], body:TchangeUserRole["body"]) {
        const {id}=params;
        const {role}=body;
        return await prisma.user.update({
            where: { id },
            data: { role },
            select: userSelect,
        });
    },


    // 7. Activate or deactivate a user

    async setStatus(params: TupdateUserStatus["params"], body:TupdateUserStatus["body"]) {
        const {id}=params;
        const {status}=body;
        let updatedUser;

        updatedUser = await prisma.user.update({
            where: { id },
            data: { status },
            select: userSelect,
        });

        // Customers without Clerk accounts only have
        // application-level status.
        if (updatedUser.clerkId) {
            try {
                if (status === "ACTIVE") {
                    await clerkClient.users.unbanUser(
                        updatedUser.clerkId
                    );
                } else {
                    await clerkClient.users.banUser(
                        updatedUser.clerkId
                    );
                }
            } catch {
                throw new ApiError(
                    502,
                    "The database status was updated, " +
                    "but Clerk synchronization failed. " +
                    "Retry the operation."
                );
            }
        }

        return updatedUser;
    },
};