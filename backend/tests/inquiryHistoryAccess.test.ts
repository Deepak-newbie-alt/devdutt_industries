// Customer "My inquiries" after verification: the short-lived read token, an inquiry's details
// and its issued quotation PDFs.
import { Fixtures, prisma, rejectsWith, testIp, withSmsCode } from "./helpers.js";
import { after, before, describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import {
    customerInquiryDetailSchema,
    customerInquiryHistorySchema,
    customerQuotationDocumentSchema
} from "../src/schemas/inquirySchema.js";
import { customerQuotationLookupSchema } from "../src/schemas/quotationSchema.js";
import { InquiryService } from "../src/services/inquiry.services.js";
import { QuotationService } from "../src/services/quotation.services.js";
import { CustomerOtpService } from "../src/services/customer.otp.services.js";
import { issueHistoryAccess } from "../src/utils/customerHistoryAccess.js";
import type { QuotationRevisionStatus } from "../src/generated/prisma/enums.js";

const fixtures = new Fixtures();
// Own IP, so this file's codes don't use up the hourly IP limit the other files share.
const ip = `${testIp}-history-access`;

let phoneA: string;
let phoneB: string;
let inquiryA: { id: number; phoneNumber: string };
let closedA: { id: number; phoneNumber: string };
let inquiryB: { id: number; phoneNumber: string };
let issuedPdf: Buffer;

function pdfBytes(label: string) {
    return Buffer.from(`%PDF-1.7\n% test document ${label}\n%%EOF\n`);
}

async function addDocument(revisionId: number, label: string) {
    const content = pdfBytes(label);
    await prisma.quotationDocument.create({
        data: {
            quotationRevisionId: revisionId,
            fileName: `test-${label}.pdf`,
            content: new Uint8Array(content),
            sha256: createHash("sha256").update(content).digest("hex"),
            sizeBytes: content.length
        }
    });
    return content;
}

// Another revision of the quotation, copied from revision 1.
async function addRevision(base: Awaited<ReturnType<Fixtures["quotation"]>>["revision"], revisionNumber: number, status: QuotationRevisionStatus) {
    const { id: _id, createdAt: _c, updatedAt: _u, customerAccessTokenHash: _t, ...copy } = base;
    return prisma.quotationRevision.create({
        data: { ...copy, revisionNumber, quotationRevisionStatus: status, machineSpecifications: { Test: "yes" }, terms: { Payment: "Test" } }
    });
}

before(async () => {
    const product = await fixtures.product("ACTIVE");
    const salesperson = await fixtures.salesperson();
    phoneA = fixtures.phone();
    phoneB = fixtures.phone();

    // A: received, claimed, internal notes, revision 1 superseded by sent revision 2, a draft revision 3.
    inquiryA = await fixtures.inquiry(product.id, "IN_PROGRESS", salesperson.id, phoneA);
    await prisma.inquiryActivity.createMany({
        data: [
            { inquiryId: inquiryA.id, activityType: "CREATED" },
            { inquiryId: inquiryA.id, activityType: "CLAIMED", salespersonId: salesperson.id },
            { inquiryId: inquiryA.id, activityType: "CUSTOMER_CONTACTED", salespersonId: salesperson.id, note: "Internal contact note" },
            { inquiryId: inquiryA.id, activityType: "NOTE_ADDED", salespersonId: salesperson.id, note: "Internal staff note" },
            { inquiryId: inquiryA.id, activityType: "CLOSURE_REQUESTED", salespersonId: salesperson.id, note: "Internal closure request" }
        ]
    });
    const { revision: rev1 } = await fixtures.quotation(inquiryA, salesperson.id, "SUPERSEDED");
    await addDocument(rev1.id, "a-rev1");
    const rev2 = await addRevision(rev1, 2, "SENT");
    issuedPdf = await addDocument(rev2.id, "a-rev2");
    // A draft never has an issued document in practice; one is added here to prove it's never served.
    const rev3 = await addRevision(rev1, 3, "DRAFT");
    await addDocument(rev3.id, "a-rev3-draft");

    // A, closed: the closing note and reason are internal; a sent revision without a document.
    closedA = await fixtures.inquiry(product.id, "CLOSED", salesperson.id, phoneA);
    await prisma.inquiryActivity.createMany({
        data: [
            { inquiryId: closedA.id, activityType: "CREATED" },
            { inquiryId: closedA.id, activityType: "STATUS_CHANGED", salespersonId: salesperson.id, closureReason: "DUPLICATE", note: "Internal closing note" }
        ]
    });
    await fixtures.quotation(closedA, salesperson.id, "ACCEPTED");

    // B: another customer.
    inquiryB = await fixtures.inquiry(product.id, "IN_PROGRESS", salesperson.id, phoneB);
    const { revision: revB } = await fixtures.quotation(inquiryB, salesperson.id, "SENT");
    await addDocument(revB.id, "b-rev1");
});

after(async () => {
    mock.restoreAll();
    await fixtures.cleanup();
    await prisma.$disconnect();
});

function detail(inquiryId: number, accessToken: string) {
    const { params, body } = customerInquiryDetailSchema.parse({ params: { inquiryId }, body: { accessToken } });
    return InquiryService.getCustomerInquiryDetail(params, body);
}

function documentOf(inquiryId: number, revisionNumber: number, accessToken: string) {
    const { params, body } = customerQuotationDocumentSchema.parse({ params: { inquiryId, revisionNumber }, body: { accessToken } });
    return InquiryService.getCustomerQuotationDocument(params, body);
}

// Signs a payload with the same derived key as the app, to check the claims are enforced too.
function forge(payload: object) {
    const key = createHmac("sha256", process.env.OTP_SECRET!).update("customer-history-access:v1").digest();
    const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
    return `${encoded}.${createHmac("sha256", key).update(encoded).digest("base64url")}`;
}

describe("history lookup issues a read token", () => {
    it("returns a 15-minute token with the list, and no document bytes", async () => {
        const { result, code } = await withSmsCode(() =>
            CustomerOtpService.requestChallenge({ purpose: "INQUIRY_HISTORY_LOOKUP", phoneNumber: phoneA }, ip)
        );
        const { body } = customerInquiryHistorySchema.parse({ body: { phoneNumber: phoneA, challengeId: result.challengeId, code } });
        const history = await InquiryService.getCustomerInquiryHistory(body);

        assert.equal(history.access.expiresInSeconds, 900);
        assert.match(history.access.token, /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
        assert.ok(!JSON.stringify(history).includes("%PDF"), "no PDF content in the list");

        // The token from the real lookup opens that phone's inquiry.
        assert.equal((await detail(inquiryA.id, history.access.token)).id, inquiryA.id);
    });
});

describe("customer inquiry details", () => {
    it("shows the inquiry, a customer-safe timeline and the sent versions", async () => {
        const { token } = issueHistoryAccess(phoneA);
        const result = await detail(inquiryA.id, token);

        assert.deepEqual(Object.keys(result).sort(), ["createdAt", "id", "product", "quotation", "requirement", "status", "timeline"]);
        assert.deepEqual(
            result.timeline.map((event) => ("revisionNumber" in event ? `${event.type}:${event.revisionNumber}` : event.type)),
            ["RECEIVED", "IN_PROGRESS", "QUOTATION_ISSUED:1", "QUOTATION_ISSUED:2"]
        );

        const quotation = result.quotation!;
        assert.deepEqual(quotation.revisions.map((revision) => [revision.revisionNumber, revision.status, revision.isCurrent]), [
            [2, "SENT", true],
            [1, "SUPERSEDED", false]
        ]);
        assert.deepEqual(Object.keys(quotation.revisions[0]!).sort(), ["canRespond", "document", "isCurrent", "revisionNumber", "status", "validUntil"]);
        assert.deepEqual(quotation.revisions[0]!.document, { fileName: "test-a-rev2.pdf", sizeBytes: issuedPdf.length });
        assert.equal(quotation.revisions[0]!.canRespond, true);

        const json = JSON.stringify(result);
        for (const hidden of ["Internal", "%PDF", "salesperson", "phoneNumber", "TokenHash", "sha256", "DUPLICATE"]) {
            assert.ok(!json.includes(hidden), `response must not contain ${hidden}`);
        }
    });

    it("shows a closure without its internal reason or note, and a missing document as null", async () => {
        const result = await detail(closedA.id, issueHistoryAccess(phoneA).token);

        assert.deepEqual(result.timeline.map((event) => event.type), ["RECEIVED", "CLOSED"]);
        assert.equal(result.quotation!.revisions[0]!.document, null);
        assert.ok(!JSON.stringify(result).includes("Internal closing note"));
    });

    it("treats another phone's inquiry, or a missing one, as not found", async () => {
        const { token } = issueHistoryAccess(phoneA);

        await rejectsWith(detail(inquiryB.id, token), 404, /Inquiry not found/);
        await rejectsWith(detail(2_147_483_647, token), 404, /Inquiry not found/);
    });
});

describe("customer quotation documents", () => {
    it("returns the exact stored PDF of a sent revision", async () => {
        const document = await documentOf(inquiryA.id, 2, issueHistoryAccess(phoneA).token);

        assert.ok(Buffer.from(document.content).equals(issuedPdf));
        assert.equal(document.sha256, createHash("sha256").update(issuedPdf).digest("hex"));
        assert.equal(document.fileName, "test-a-rev2.pdf");
    });

    it("also returns a superseded revision's own PDF", async () => {
        const document = await documentOf(inquiryA.id, 1, issueHistoryAccess(phoneA).token);
        assert.ok(Buffer.from(document.content).equals(pdfBytes("a-rev1")));
    });

    it("never returns a draft's document", async () => {
        await rejectsWith(documentOf(inquiryA.id, 3, issueHistoryAccess(phoneA).token), 404);
    });

    it("refuses another phone's document, a revision without one, and unknown revisions", async () => {
        const { token } = issueHistoryAccess(phoneA);

        await rejectsWith(documentOf(inquiryB.id, 1, token), 404);
        await rejectsWith(documentOf(closedA.id, 1, token), 404, /isn't available/);
        await rejectsWith(documentOf(inquiryA.id, 99, token), 404);
    });
});

describe("the read token", () => {
    it("is refused when altered", async () => {
        const [payload, signature] = issueHistoryAccess(phoneA).token.split(".");
        const otherPayload = issueHistoryAccess(phoneB).token.split(".")[0];

        // B's claims with A's signature, and A's claims with a changed signature.
        await rejectsWith(detail(inquiryB.id, `${otherPayload}.${signature}`), 401, /Verify your number again/);
        const flipped = signature!.startsWith("A") ? `B${signature!.slice(1)}` : `A${signature!.slice(1)}`;
        await rejectsWith(detail(inquiryA.id, `${payload}.${flipped}`), 401);
    });

    it("is refused after 15 minutes", async () => {
        const { token } = issueHistoryAccess(phoneA);
        const realNow = Date.now();
        const later = mock.method(Date, "now", () => realNow + 15 * 60 * 1000 + 1000);

        try {
            await rejectsWith(detail(inquiryA.id, token), 401);
            await rejectsWith(documentOf(inquiryA.id, 2, token), 401);
        } finally {
            later.mock.restore();
        }
    });

    it("is refused with the wrong scope or version, even when correctly signed", async () => {
        const exp = Math.floor(Date.now() / 1000) + 600;

        // The forged-but-valid control proves the test key matches the app's.
        assert.equal((await detail(inquiryA.id, forge({ v: 1, scope: "inquiry-history:read", phone: phoneA, exp }))).id, inquiryA.id);
        await rejectsWith(detail(inquiryA.id, forge({ v: 1, scope: "quotation:respond", phone: phoneA, exp })), 401);
        await rejectsWith(detail(inquiryA.id, forge({ v: 2, scope: "inquiry-history:read", phone: phoneA, exp })), 401);
        await rejectsWith(detail(inquiryA.id, forge({ v: 1, scope: "inquiry-history:read", phone: phoneA })), 401);
    });

    it("is rejected by validation when malformed", () => {
        for (const accessToken of ["", "abc", "a.b.c", "a b.c", "x".repeat(600) + ".y"]) {
            assert.ok(!customerInquiryDetailSchema.safeParse({ params: { inquiryId: 1 }, body: { accessToken } }).success, accessToken.slice(0, 20));
        }
        assert.ok(!customerInquiryDetailSchema.safeParse({ params: { inquiryId: 1 }, body: {} }).success);
    });

    it("can't be used for quotation actions", async () => {
        const { token } = issueHistoryAccess(phoneA);

        // Quotation routes take only a link token, which this never matches.
        assert.ok(!customerQuotationLookupSchema.safeParse({ body: { token } }).success);
        await rejectsWith(QuotationService.getCustomerQuotation({ token }), 404);
        await rejectsWith(
            CustomerOtpService.requestChallenge({ purpose: "QUOTATION_ACCEPT", token }, ip),
            404
        );
    });
});
