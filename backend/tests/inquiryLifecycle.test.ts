// Claiming, closing and quotation changes on an inquiry, and how they protect each other.
import { Fixtures, newCustomerToken, prisma, rejectsWith, testIp, withSmsCode } from "./helpers.js";
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { closeInquirySchema } from "../src/schemas/inquirySchema.js";
import { customerRevisionResponseSchema, editQuotationSchema } from "../src/schemas/quotationSchema.js";
import { InquiryService } from "../src/services/inquiry.services.js";
import { QuotationService } from "../src/services/quotation.services.js";
import { CustomerOtpService } from "../src/services/customer.otp.services.js";
import type { InquiryStatus } from "../src/generated/prisma/enums.js";

const fixtures = new Fixtures();
let owner: number;
let otherSalesperson: number;
let productId: number;

before(async () => {
    owner = (await fixtures.salesperson()).id;
    otherSalesperson = (await fixtures.salesperson()).id;
    productId = (await fixtures.product()).id;
});

after(async () => {
    await fixtures.cleanup();
    await prisma.$disconnect();
});

const myInquiry = (status: InquiryStatus = "IN_PROGRESS") => fixtures.inquiry(productId, status, owner);
const statusOf = async (inquiryId: number) => (await prisma.inquiry.findUniqueOrThrow({ where: { id: inquiryId } })).status;
const revisionStatusOf = async (revisionId: number) =>
    (await prisma.quotationRevision.findUniqueOrThrow({ where: { id: revisionId } })).quotationRevisionStatus;

function close(inquiryId: number, body: { reason: string; note?: string }, salespersonId = owner) {
    const { params, body: parsed } = closeInquirySchema.parse({ params: { inquiryId }, body });
    return InquiryService.closeInquiry(params, parsed, salespersonId);
}

function editDraft(revisionId: number) {
    const { params, body } = editQuotationSchema.parse({
        params: { revisionId },
        body: {
            buyerName: "Edited Buyer",
            address: "Test address",
            gstNumber: "TEST",
            mobileNumber: "9876543210",
            productName: "Test product",
            machineSpecifications: { Test: "yes" },
            terms: { Payment: "Test terms" },
            validUntil: "2099-12-31",
            items: [{ name: "Test item", quantity: 1, unit: "Piece", unitPrice: "1000", displayOrder: 0 }]
        }
    });
    return QuotationService.editQuotationRevision(params, body, owner);
}

describe("closing an inquiry", () => {
    it("records the actor, reason and note", async () => {
        const plain = await myInquiry();
        const { activity } = await close(plain.id, { reason: "DUPLICATE" });
        assert.equal(await statusOf(plain.id), "CLOSED");
        assert.equal(activity.activityType, "STATUS_CHANGED");
        assert.equal(activity.salespersonId, owner);
        assert.equal(activity.closureReason, "DUPLICATE");
        assert.equal(activity.note, null);

        const other = await myInquiry();
        const result = await close(other.id, { reason: "OTHER", note: "Bought a used machine" });
        assert.equal(result.activity.closureReason, "OTHER");
        assert.equal(result.activity.note, "Bought a used machine");
    });

    it("is refused for unassigned, someone else's, closed or missing inquiries", async () => {
        const unassigned = await fixtures.inquiry(productId, "OPEN", null);
        await rejectsWith(close(unassigned.id, { reason: "DUPLICATE" }), 403);
        assert.equal(await statusOf(unassigned.id), "OPEN");

        const theirs = await fixtures.inquiry(productId, "IN_PROGRESS", otherSalesperson);
        await rejectsWith(close(theirs.id, { reason: "DUPLICATE" }), 403);
        assert.equal(await statusOf(theirs.id), "IN_PROGRESS");

        await rejectsWith(close((await myInquiry("CLOSED")).id, { reason: "DUPLICATE" }), 409);
        await rejectsWith(close(2_147_483_647, { reason: "DUPLICATE" }), 404);
    });

    it("waits while a sent quotation can still be answered", async () => {
        const inquiry = await myInquiry();
        await fixtures.quotation(inquiry, owner, "SENT", { token: newCustomerToken() });

        await rejectsWith(close(inquiry.id, { reason: "CUSTOMER_UNREACHABLE" }), 409, /waiting for the customer/);
        assert.equal(await statusOf(inquiry.id), "IN_PROGRESS");
        assert.equal(await prisma.inquiryActivity.count({ where: { inquiryId: inquiry.id } }), 0);
    });

    it("is allowed for drafts, change requests and expired quotations", async () => {
        const cases = [
            { status: "DRAFT" },
            { status: "REVISION_REQUESTED" },
            { status: "EXPIRED", validUntil: "2026-01-01" },
            // Past its date but not yet marked expired by the nightly job.
            { status: "SENT", validUntil: "2026-01-01" }
        ] as const;

        for (const { status, ...options } of cases) {
            const inquiry = await myInquiry();
            await fixtures.quotation(inquiry, owner, status, options);
            await close(inquiry.id, { reason: "CUSTOMER_NOT_INTERESTED" });
            assert.equal(await statusOf(inquiry.id), "CLOSED", status);
        }
    });
});

describe("a closed inquiry is final", () => {
    it("its draft can't be edited or sent", async () => {
        const inquiry = await myInquiry();
        const { revision } = await fixtures.quotation(inquiry, owner, "DRAFT");
        await close(inquiry.id, { reason: "NOT_OUR_PRODUCT" });

        await rejectsWith(editDraft(revision.id), 409, /closed/);
        await rejectsWith(QuotationService.sendQuotation({ revisionId: revision.id }, owner), 409, /closed/);
        assert.equal(await revisionStatusOf(revision.id), "DRAFT");
    });

    it("its change request can't become a new revision", async () => {
        const inquiry = await myInquiry();
        const { quotation } = await fixtures.quotation(inquiry, owner, "REVISION_REQUESTED");
        await close(inquiry.id, { reason: "CUSTOMER_UNREACHABLE" });

        await rejectsWith(QuotationService.createRevision({ quotationId: quotation.id }, owner), 409, /closed/);
        assert.equal(await prisma.quotationRevision.count({ where: { quotationId: quotation.id } }), 1);
    });

    it("its history takes no new entries", async () => {
        const inquiry = await myInquiry("CLOSED");
        await rejectsWith(InquiryService.contactCustomer({ inquiryId: inquiry.id }, { note: "Called" }, owner), 409);
        await rejectsWith(InquiryService.addNote({ inquiryId: inquiry.id }, { note: "Note" }, owner), 409);
    });

    it("while an in-progress inquiry still allows all of these", async () => {
        const inquiry = await myInquiry();
        const draft = await fixtures.quotation(inquiry, owner, "DRAFT");
        assert.equal((await editDraft(draft.revision.id)).buyerName, "Edited Buyer");
        await InquiryService.addNote({ inquiryId: inquiry.id }, { note: "Note" }, owner);

        const requested = await myInquiry();
        const { quotation } = await fixtures.quotation(requested, owner, "REVISION_REQUESTED");
        const next = await QuotationService.createRevision({ quotationId: quotation.id }, owner);
        assert.equal(next.quotationRevisionStatus, "DRAFT");
    });
});

describe("claiming", () => {
    it("is refused when the inquiry already has a quotation", async () => {
        const inquiry = await fixtures.inquiry(productId, "OPEN", null);
        await fixtures.quotation(inquiry, otherSalesperson, "DRAFT");

        await rejectsWith(InquiryService.claimInquiry({ inquiryId: inquiry.id }, owner), 409);
        assert.equal(await statusOf(inquiry.id), "OPEN");
    });

    it("assigns an open inquiry and records it", async () => {
        const inquiry = await fixtures.inquiry(productId, "OPEN", null);
        const { activity } = await InquiryService.claimInquiry({ inquiryId: inquiry.id }, owner);

        const claimed = await prisma.inquiry.findUniqueOrThrow({ where: { id: inquiry.id } });
        assert.equal(claimed.status, "IN_PROGRESS");
        assert.equal(claimed.salespersonId, owner);
        assert.equal(activity.activityType, "CLAIMED");
    });
});

describe("closing and sending at the same moment", () => {
    it("lets exactly one win and never leaves a closed inquiry with a sent quotation", async () => {
        await fixtures.ensureCompanySettings();

        for (let round = 0; round < 5; round++) {
            const inquiry = await myInquiry();
            const { revision } = await fixtures.quotation(inquiry, owner, "DRAFT");
            const [closed, sent] = await Promise.allSettled([
                close(inquiry.id, { reason: "DUPLICATE" }),
                QuotationService.sendQuotation({ revisionId: revision.id }, owner)
            ]);

            const outcome = `close ${closed.status}, send ${sent.status}`;
            assert.notEqual(closed.status === "fulfilled", sent.status === "fulfilled", outcome);
            const finalInquiry = await statusOf(inquiry.id);
            const finalRevision = await revisionStatusOf(revision.id);
            assert.ok(!(finalInquiry === "CLOSED" && finalRevision === "SENT"), `${outcome}: ${finalInquiry} + ${finalRevision}`);
        }
    });
});

describe("the customer's response", () => {
    it("accepting still closes the inquiry, with no closure reason", async () => {
        const inquiry = await myInquiry();
        const token = newCustomerToken();
        const { revision } = await fixtures.quotation(inquiry, owner, "SENT", { token });

        const { result, code, to } = await withSmsCode(() =>
            CustomerOtpService.requestChallenge({ purpose: "QUOTATION_ACCEPT", token }, testIp)
        );
        assert.equal(to, inquiry.phoneNumber);

        const { params, body } = customerRevisionResponseSchema.parse({
            params: { revisionId: revision.id },
            body: { token, challengeId: result.challengeId, code }
        });
        await QuotationService.acceptRevision(params, body);

        assert.equal(await revisionStatusOf(revision.id), "ACCEPTED");
        assert.equal(await statusOf(inquiry.id), "CLOSED");
        const last = await prisma.inquiryActivity.findFirstOrThrow({ where: { inquiryId: inquiry.id }, orderBy: { id: "desc" } });
        assert.equal(last.closureReason, null);
        assert.match(last.note ?? "", /accepted/);
    });
});
