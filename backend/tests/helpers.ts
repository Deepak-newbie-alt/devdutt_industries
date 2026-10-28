// Shared fixtures for the integration tests. They run against the database in DATABASE_URL
// (development only), create every record they use and delete it again afterwards.
// Test files must import this module before any service, so setup.ts runs first.
import "./setup.js";
import assert from "node:assert/strict";
import { randomBytes, randomInt } from "node:crypto";
import prisma from "../src/lib/prisma.js";
import ApiError from "../src/utils/ApiError.js";
import { hashCustomerAccessToken } from "../src/utils/customerAccessToken.js";
import type { InquiryStatus, ProductStatus, QuotationRevisionStatus } from "../src/generated/prisma/enums.js";

assert.equal(process.env.SMS_PROVIDER, "console", "Tests must use the console SMS sender");

// Unique per run, so names, slugs and the hourly OTP limits never collide with earlier runs.
export const runTag = randomBytes(4).toString("hex");
export const testIp = `test-${runTag}`;

export function newPhone(): string {
    return `9${String(randomInt(0, 1_000_000_000)).padStart(9, "0")}`;
}

export function newCustomerToken(): string {
    return randomBytes(32).toString("base64url");
}

// Asserts that the call fails with this ApiError status (and message, when given).
export async function rejectsWith(promise: Promise<unknown>, statusCode: number, message?: RegExp) {
    await assert.rejects(promise, (error: unknown) => {
        assert.ok(error instanceof ApiError, `expected an ApiError, got ${String(error)}`);
        assert.equal(error.statusCode, statusCode, error.message);
        if (message) assert.match(error.message, message);
        return true;
    });
}

// Starts two operations together and checks that exactly one wins and the other loses with a
// 409. Any other failure (a crash, a missing file) fails the test instead of passing as a lost
// race. Alternate `secondFirst` between rounds: a fast operation started first can finish
// before the other begins, which would hide a missing lock.
export async function raceOnce(first: () => Promise<unknown>, second: () => Promise<unknown>, secondFirst: boolean) {
    const settled = await Promise.allSettled(secondFirst ? [second(), first()] : [first(), second()]);
    const [a, b] = secondFirst ? [settled[1]!, settled[0]!] : [settled[0]!, settled[1]!];
    const outcome = `${a.status}/${b.status}`;

    assert.notEqual(a.status === "fulfilled", b.status === "fulfilled", `exactly one should win: ${outcome}`);
    const loser = a.status === "rejected" ? a : b.status === "rejected" ? b : null;
    assert.ok(
        loser?.reason instanceof ApiError && loser.reason.statusCode === 409,
        `the losing operation should fail with 409, got: ${String(loser?.reason)}`
    );

    return outcome;
}

// Runs an OTP request and returns the code the console sender logged for it.
export async function withSmsCode<T>(request: () => Promise<T>): Promise<{ result: T; code: string; to: string }> {
    const original = console.log;
    let sent: { code: string; to: string } | null = null;

    console.log = (...args: unknown[]) => {
        const match = typeof args[0] === "string" ? /^\[sms:console\] to \+91(\d{10}): (\d{6}) /.exec(args[0]) : null;
        if (match?.[1] && match[2]) sent = { to: match[1], code: match[2] };
        else original(...args);
    };

    try {
        const result = await request();
        assert.ok(sent, "no verification code was sent");
        const { code, to } = sent as { code: string; to: string };
        return { result, code, to };
    } finally {
        console.log = original;
    }
}

export class Fixtures {
    private count = 0;
    private users: number[] = [];
    private categoryId: number | null = null;
    private products: number[] = [];
    private inquiries: number[] = [];
    private quotations: number[] = [];
    private phones: string[] = [];
    private createdCompanySettings = false;

    private next() {
        return `${runTag}-${++this.count}`;
    }

    async salesperson() {
        return this.staff("SALESPERSON");
    }

    async admin() {
        return this.staff("ADMIN");
    }

    private async staff(role: "ADMIN" | "SALESPERSON") {
        const key = this.next();
        const user = await prisma.user.create({
            data: { name: `Test ${role.toLowerCase()} ${key}`, email: `test-${key}@example.test`, phone: `test-${key}`, role }
        });
        this.users.push(user.id);
        return user;
    }

    async product(status: ProductStatus = "ACTIVE") {
        if (this.categoryId === null) {
            const key = this.next();
            const category = await prisma.category.create({ data: { name: `Test category ${key}`, slug: `test-category-${key}` } });
            this.categoryId = category.id;
        }

        const key = this.next();
        const product = await prisma.product.create({
            data: {
                name: `Test product ${key}`,
                slug: `test-product-${key}`,
                description: "Created by the automated tests.",
                price: "1000",
                unit: "Piece",
                status,
                categoryId: this.categoryId
            }
        });
        this.products.push(product.id);
        return product;
    }

    // A customer phone whose OTP challenges are removed at cleanup.
    phone() {
        const phone = newPhone();
        this.phones.push(phone);
        return phone;
    }

    // Records created by the inquiry service itself, so cleanup removes them too.
    track(inquiryId: number) {
        this.inquiries.push(inquiryId);
    }

    async inquiry(productId: number, status: InquiryStatus, salespersonId: number | null) {
        const inquiry = await prisma.inquiry.create({
            data: { productId, phoneNumber: newPhone(), requirement: `Test inquiry ${this.next()}`, status, salespersonId }
        });
        this.inquiries.push(inquiry.id);
        return inquiry;
    }

    // A quotation with one revision; a token sets the customer link (for SENT revisions).
    async quotation(
        inquiry: { id: number; phoneNumber: string },
        salespersonId: number,
        status: QuotationRevisionStatus,
        options: { validUntil?: string; token?: string } = {}
    ) {
        const quotation = await prisma.quotation.create({
            data: { inquiryId: inquiry.id, salespersonId, quotationNumber: `QT-TEST-${this.next()}` }
        });
        this.quotations.push(quotation.id);

        const revision = await prisma.quotationRevision.create({
            data: {
                quotationId: quotation.id,
                revisionNumber: 1,
                quotationRevisionStatus: status,
                buyerName: "Test Buyer",
                address: "Test address",
                gstNumber: "TEST",
                mobileNumber: inquiry.phoneNumber,
                productName: "Test product",
                machineSpecifications: { Test: "yes" },
                terms: { Payment: "Test terms" },
                validUntil: new Date(`${options.validUntil ?? "2099-12-31"}T00:00:00.000Z`),
                salespersonId,
                taxableAmount: "1000",
                grandTotal: "1000",
                customerAccessTokenHash: options.token ? hashCustomerAccessToken(options.token) : null,
                items: {
                    create: [{ name: "Test item", quantity: 1, unit: "Piece", unitPrice: "1000", amount: "1000", displayOrder: 0 }]
                }
            }
        });

        return { quotation, revision };
    }

    // Sending needs company settings for the PDF; add placeholder ones only if none exist.
    async ensureCompanySettings() {
        if (await prisma.companySettings.findUnique({ where: { id: 1 } })) return;

        await prisma.companySettings.create({
            data: { companyName: "Test Company", addressLine1: "Test", city: "Test", state: "Test", postalCode: "000000", phone: "0000000000" }
        });
        this.createdCompanySettings = true;
    }

    async cleanup() {
        // Also catches inquiries a failing test created without tracking them: every
        // inquiry on a test product belongs to this run.
        const inquiryWhere = { OR: [{ id: { in: this.inquiries } }, { productId: { in: this.products } }] };
        const inquiries = await prisma.inquiry.findMany({ where: inquiryWhere, select: { id: true, phoneNumber: true } });
        const quotationWhere = { OR: [{ id: { in: this.quotations } }, { inquiryId: { in: inquiries.map((inquiry) => inquiry.id) } }] };
        const revisionIds = (await prisma.quotationRevision.findMany({
            where: { quotation: quotationWhere },
            select: { id: true }
        })).map((revision) => revision.id);
        const phones = [...this.phones, ...inquiries.map((inquiry) => inquiry.phoneNumber)];

        await prisma.quotationDocument.deleteMany({ where: { quotationRevisionId: { in: revisionIds } } });
        await prisma.customerOtpChallenge.deleteMany({
            where: { OR: [{ resourceId: { in: revisionIds } }, { phoneNumber: { in: phones } }] }
        });
        await prisma.quotation.deleteMany({ where: quotationWhere });
        // Closure requests restrict deleting their inquiry, so they go first.
        await prisma.inquiryClosureRequest.deleteMany({ where: { inquiryId: { in: inquiries.map((inquiry) => inquiry.id) } } });
        await prisma.inquiry.deleteMany({ where: inquiryWhere });
        await prisma.product.deleteMany({ where: { id: { in: this.products } } });
        if (this.categoryId !== null) await prisma.category.delete({ where: { id: this.categoryId } });
        await prisma.user.deleteMany({ where: { id: { in: this.users } } });
        if (this.createdCompanySettings) await prisma.companySettings.delete({ where: { id: 1 } });
    }
}

export { prisma };
