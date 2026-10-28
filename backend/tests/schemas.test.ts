// Request validation rules that the frontend relies on. No database needed.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { closeInquirySchema, createInquirySchema } from "../src/schemas/inquirySchema.js";
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

    it("requires a note for OTHER, ignoring blank space", () => {
        assert.deepEqual(issuePaths(closeInquirySchema.safeParse({ params, body: { reason: "OTHER" } })), ["body.note"]);
        assert.deepEqual(issuePaths(closeInquirySchema.safeParse({ params, body: { reason: "OTHER", note: "   " } })), ["body.note"]);
    });

    it("accepts other reasons without a note, and trims notes", () => {
        const plain = closeInquirySchema.parse({ params, body: { reason: "DUPLICATE" } });
        assert.equal(plain.body.note, undefined);

        const other = closeInquirySchema.parse({ params, body: { reason: "OTHER", note: "  Bought elsewhere  " } });
        assert.equal(other.body.note, "Bought elsewhere");
    });

    it("limits the note to 350 characters", () => {
        assert.equal(closeInquirySchema.safeParse({ params, body: { reason: "DUPLICATE", note: "x".repeat(350) } }).success, true);
        assert.equal(closeInquirySchema.safeParse({ params, body: { reason: "DUPLICATE", note: "x".repeat(351) } }).success, false);
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
