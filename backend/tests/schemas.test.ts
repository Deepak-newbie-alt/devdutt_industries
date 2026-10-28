// Request validation rules that the frontend relies on. No database needed.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { closeInquirySchema, closureRequestSchema, createInquirySchema } from "../src/schemas/inquirySchema.js";
import { reviewClosureRequestSchema } from "../src/schemas/inquiryClosureRequestSchema.js";
import { createProductImageSchema } from "../src/schemas/productImagesSchema.js";
import { createProductVideoSchema } from "../src/schemas/productVideosSchema.js";
import { createProductBrochureSchema } from "../src/schemas/productBrochureSchema.js";
import { updateCompanySettingsSchema } from "../src/schemas/companySettingsSchema.js";

const params = { inquiryId: "1" };
const issuePaths = (result: { success: boolean; error?: { issues: { path: PropertyKey[] }[] } }) =>
    result.error?.issues.map((issue) => issue.path.join(".")) ?? [];

describe("closing an inquiry", () => {
    it("requires a known reason", () => {
        assert.deepEqual(issuePaths(closeInquirySchema.safeParse({ params, body: {} })), ["body.reason"]);
        assert.deepEqual(issuePaths(closeInquirySchema.safeParse({ params, body: { reason: "BORED" } })), ["body.reason"]);
    });

    it("refuses OTHER, which needs an admin-approved closure request", () => {
        const result = closeInquirySchema.safeParse({ params, body: { reason: "OTHER", note: "Bought elsewhere" } });
        assert.deepEqual(issuePaths(result), ["body.reason"]);
        assert.match(result.error?.issues[0]?.message ?? "", /closure request/);
    });

    it("accepts the named reasons without a note, and trims notes", () => {
        const plain = closeInquirySchema.parse({ params, body: { reason: "DUPLICATE" } });
        assert.equal(plain.body.note, undefined);

        const noted = closeInquirySchema.parse({ params, body: { reason: "NOT_OUR_PRODUCT", note: "  Needs a 6-inch bender  " } });
        assert.equal(noted.body.note, "Needs a 6-inch bender");
    });

    it("limits the note to 350 characters", () => {
        assert.equal(closeInquirySchema.safeParse({ params, body: { reason: "DUPLICATE", note: "x".repeat(350) } }).success, true);
        assert.equal(closeInquirySchema.safeParse({ params, body: { reason: "DUPLICATE", note: "x".repeat(351) } }).success, false);
    });
});

describe("closure requests", () => {
    it("require an explanation, trimmed, up to 350 characters", () => {
        assert.deepEqual(issuePaths(closureRequestSchema.safeParse({ params, body: {} })), ["body.note"]);
        assert.deepEqual(issuePaths(closureRequestSchema.safeParse({ params, body: { note: "   " } })), ["body.note"]);
        assert.equal(closureRequestSchema.safeParse({ params, body: { note: "x".repeat(351) } }).success, false);
        assert.equal(closureRequestSchema.parse({ params, body: { note: "  Customer moved abroad  " } }).body.note, "Customer moved abroad");
    });

    it("take an optional review note, with or without a body", () => {
        const review = { params: { requestId: "1" } };
        assert.equal(reviewClosureRequestSchema.parse(review).body.reviewNote, undefined);
        assert.equal(reviewClosureRequestSchema.parse({ ...review, body: { reviewNote: " Agreed " } }).body.reviewNote, "Agreed");
        assert.equal(reviewClosureRequestSchema.safeParse({ ...review, body: { reviewNote: "x".repeat(351) } }).success, false);
    });
});

describe("customer phone numbers", () => {
    const body = { productId: 1, requirement: "Need a machine", challengeId: "8f14e45f-ceea-467a-9c3e-5c1c1a2f6b11", code: "123456" };

    it("accepts 10-digit Indian mobile numbers only", () => {
        assert.equal(createInquirySchema.safeParse({ body: { ...body, phoneNumber: "9876543210" } }).success, true);
        for (const phoneNumber of ["98765432101", "987654321", "5876543210", "+919876543210"]) {
            assert.equal(createInquirySchema.safeParse({ body: { ...body, phoneNumber } }).success, false, phoneNumber);
        }
    });
});

describe("link fields accept only http and https", () => {
    const accepted = ["http://localhost:8000/a.jpg", "http://192.168.1.5/b.pdf", "https://cdn.example.com/a.jpg"];
    const rejected = ["javascript:alert(1)", "data:text/html,x", "file:///C:/a", "ftp://example.com/a"];
    const checks: [string, (url: string) => boolean][] = [
        ["product image", (url) => createProductImageSchema.safeParse({ body: { productId: 1, imageUrl: url } }).success],
        ["product video", (url) => createProductVideoSchema.safeParse({ body: { productId: 1, youtubeUrl: url, title: "Demo" } }).success],
        ["product brochure", (url) => createProductBrochureSchema.safeParse({ body: { productId: 1, fileUrl: url, fileName: "Brochure" } }).success],
        ["company website and logo", (url) => updateCompanySettingsSchema.safeParse({ body: { website: url, logoUrl: url } }).success],
    ];

    for (const [name, isValid] of checks) {
        it(name, () => {
            for (const url of accepted) assert.equal(isValid(url), true, url);
            for (const url of rejected) assert.equal(isValid(url), false, url);
        });
    }

    it("still allows clearing the company website", () => {
        assert.equal(updateCompanySettingsSchema.safeParse({ body: { website: null } }).success, true);
    });
});
