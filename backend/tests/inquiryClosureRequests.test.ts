// Closing an inquiry for "other" reasons: the salesperson requests, an admin decides.
import { Fixtures, newCustomerToken, prisma, raceOnce, rejectsWith } from "./helpers.js";
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { closeInquirySchema, closureRequestSchema } from "../src/schemas/inquirySchema.js";
import { listClosureRequestsQuerySchema, reviewClosureRequestSchema } from "../src/schemas/inquiryClosureRequestSchema.js";
import { createQuotationSchema, editQuotationSchema } from "../src/schemas/quotationSchema.js";
import { InquiryService } from "../src/services/inquiry.services.js";
import { InquiryClosureRequestService } from "../src/services/inquiryClosureRequest.services.js";
import { QuotationService } from "../src/services/quotation.services.js";

const fixtures = new Fixtures();
let owner: number;
let otherSalesperson: number;
let admin: number;
let productId: number;

before(async () => {
    owner = (await fixtures.salesperson()).id;
    otherSalesperson = (await fixtures.salesperson()).id;
    admin = (await fixtures.admin()).id;
    productId = (await fixtures.product()).id;
    // Sending renders the PDF from company settings.
    await fixtures.ensureCompanySettings();
});

after(async () => {
    await fixtures.cleanup();
    await prisma.$disconnect();
});

const myInquiry = () => fixtures.inquiry(productId, "IN_PROGRESS", owner);
const statusOf = async (inquiryId: number) => (await prisma.inquiry.findUniqueOrThrow({ where: { id: inquiryId } })).status;
const pendingCount = (inquiryId: number) => prisma.inquiryClosureRequest.count({ where: { inquiryId, status: "PENDING" } });

function requestClosure(inquiryId: number, note = "Customer moved abroad", salespersonId = owner) {
    const { params, body } = closureRequestSchema.parse({ params: { inquiryId }, body: { note } });
    return InquiryService.requestClosure(params, body, salespersonId);
}

function review(action: "approve" | "reject", requestId: number, reviewNote?: string) {
    const { params, body } = reviewClosureRequestSchema.parse({ params: { requestId }, body: reviewNote === undefined ? undefined : { reviewNote } });
    return InquiryClosureRequestService[action](params, body, admin);
}

function closeDirectly(inquiryId: number) {
    const { params, body } = closeInquirySchema.parse({ params: { inquiryId }, body: { reason: "DUPLICATE" } });
    return InquiryService.closeInquiry(params, body, owner);
}

const quotationBody = {
    buyerName: "Test Buyer",
    address: "Test address",
    gstNumber: "TEST",
    mobileNumber: "9876543210",
    productName: "Test product",
    machineSpecifications: { Test: "yes" },
    terms: { Payment: "Test terms" },
    validUntil: "2099-12-31",
    items: [{ name: "Test item", quantity: 1, unit: "Piece", unitPrice: "1000", displayOrder: 0 }]
};

describe("requesting closure", () => {
    it("records a pending request and keeps the inquiry in progress", async () => {
        const inquiry = await myInquiry();
        const { request, activity } = await requestClosure(inquiry.id, "Customer moved abroad");

        assert.equal(request.status, "PENDING");
        assert.equal(request.requestedById, owner);
        assert.equal(request.note, "Customer moved abroad");
        assert.equal(activity.activityType, "CLOSURE_REQUESTED");
        assert.equal(activity.salespersonId, owner);
        assert.equal(activity.note, "Customer moved abroad");
        assert.equal(await statusOf(inquiry.id), "IN_PROGRESS");
    });

    it("is only for the owner of an in-progress inquiry", async () => {
        await rejectsWith(requestClosure((await fixtures.inquiry(productId, "IN_PROGRESS", otherSalesperson)).id), 403);
        await rejectsWith(requestClosure((await fixtures.inquiry(productId, "OPEN", null)).id), 403);
        await rejectsWith(requestClosure((await fixtures.inquiry(productId, "CLOSED", owner)).id), 409);
        await rejectsWith(requestClosure(2_147_483_647), 404);
    });

    it("waits while a sent quotation can still be answered", async () => {
        const inquiry = await myInquiry();
        await fixtures.quotation(inquiry, owner, "SENT", { token: newCustomerToken() });

        await rejectsWith(requestClosure(inquiry.id), 409, /waiting for the customer/);
        assert.equal(await pendingCount(inquiry.id), 0);
    });

    it("allows only one pending request per inquiry", async () => {
        const inquiry = await myInquiry();
        await requestClosure(inquiry.id);
        await rejectsWith(requestClosure(inquiry.id, "Second try"), 409, /waiting for an admin/);
        assert.equal(await pendingCount(inquiry.id), 1);
    });
});

describe("while a request is pending", () => {
    it("the inquiry can't be closed directly or have a quotation created", async () => {
        const inquiry = await myInquiry();
        await requestClosure(inquiry.id);

        await rejectsWith(closeDirectly(inquiry.id), 409, /waiting for an admin/);
        const { params, body } = createQuotationSchema.parse({ params: { inquiryId: inquiry.id }, body: quotationBody });
        await rejectsWith(QuotationService.createQuotation(params, body, owner), 409, /waiting for an admin/);
        assert.equal(await prisma.quotation.count({ where: { inquiryId: inquiry.id } }), 0);
    });

    it("its draft can't be edited or sent, and a change request can't be revised", async () => {
        const withDraft = await myInquiry();
        const { revision } = await fixtures.quotation(withDraft, owner, "DRAFT");
        await requestClosure(withDraft.id);
        const edit = editQuotationSchema.parse({ params: { revisionId: revision.id }, body: quotationBody });
        await rejectsWith(QuotationService.editQuotationRevision(edit.params, edit.body, owner), 409, /waiting for an admin/);
        await rejectsWith(QuotationService.sendQuotation({ revisionId: revision.id }, owner), 409, /waiting for an admin/);

        const withRequest = await myInquiry();
        const { quotation } = await fixtures.quotation(withRequest, owner, "REVISION_REQUESTED");
        await requestClosure(withRequest.id);
        await rejectsWith(QuotationService.createRevision({ quotationId: quotation.id }, owner), 409, /waiting for an admin/);
    });

    it("notes can still be added", async () => {
        const inquiry = await myInquiry();
        await requestClosure(inquiry.id);
        await InquiryService.addNote({ inquiryId: inquiry.id }, { note: "Called again, no answer" }, owner);
    });
});

describe("an admin's decision", () => {
    it("approving closes the inquiry and records who decided and why", async () => {
        const inquiry = await myInquiry();
        const { request } = await requestClosure(inquiry.id);
        const result = await review("approve", request.id, " Confirmed with the customer ");

        assert.equal(await statusOf(inquiry.id), "CLOSED");
        assert.equal(result.request.status, "APPROVED");
        assert.equal(result.request.reviewedById, admin);
        assert.equal(result.request.reviewNote, "Confirmed with the customer");
        assert.ok(result.request.reviewedAt);
        assert.equal(result.activity.activityType, "CLOSURE_APPROVED");
        assert.equal(result.activity.salespersonId, admin);
        assert.equal(result.activity.closureReason, "OTHER");
        assert.equal(result.activity.note, "Confirmed with the customer");
    });

    it("rejecting keeps the inquiry in progress and allows a new request", async () => {
        const inquiry = await myInquiry();
        const { request } = await requestClosure(inquiry.id);
        const result = await review("reject", request.id);

        assert.equal(await statusOf(inquiry.id), "IN_PROGRESS");
        assert.equal(result.request.status, "REJECTED");
        assert.equal(result.request.reviewNote, null);
        assert.equal(result.activity.activityType, "CLOSURE_REJECTED");
        assert.equal(result.activity.salespersonId, admin);

        await requestClosure(inquiry.id, "Customer confirmed by email");
        assert.equal(await pendingCount(inquiry.id), 1);
    });

    it("can only be made once", async () => {
        const inquiry = await myInquiry();
        const { request } = await requestClosure(inquiry.id);
        await review("reject", request.id);

        await rejectsWith(review("approve", request.id), 409, /already been reviewed/);
        await rejectsWith(review("reject", request.id), 409, /already been reviewed/);
        await rejectsWith(review("approve", 2_147_483_647), 404);
    });

    it("lists requests by status with who asked and who decided", async () => {
        const inquiry = await myInquiry();
        const { request } = await requestClosure(inquiry.id);
        const listed = async (status: "PENDING" | "APPROVED") => {
            const { query } = listClosureRequestsQuerySchema.parse({ query: { status, limit: "100" } });
            return (await InquiryClosureRequestService.list(query)).requests.find((item) => item.id === request.id);
        };

        const pending = await listed("PENDING");
        assert.equal(pending?.requestedBy.id, owner);
        assert.equal(pending?.inquiry.id, inquiry.id);

        await review("approve", request.id);
        assert.equal((await listed("APPROVED"))?.reviewedBy?.id, admin);
        assert.equal(await listed("PENDING"), undefined);
    });
});

describe("audit history", () => {
    it("an inquiry with a closure request can't be deleted", async () => {
        const inquiry = await myInquiry();
        const { request } = await requestClosure(inquiry.id);

        await assert.rejects(prisma.inquiry.delete({ where: { id: inquiry.id } }));
        assert.ok(await prisma.inquiryClosureRequest.findUnique({ where: { id: request.id } }));
    });
});

// Each round starts both operations together; the inquiry row lock must let exactly one win.
async function race(rounds: number, setup: () => Promise<[() => Promise<unknown>, () => Promise<unknown>, (outcome: string) => Promise<void>]>) {
    for (let round = 0; round < rounds; round++) {
        const [first, second, verify] = await setup();
        await verify(await raceOnce(first, second, round % 2 === 1));
    }
}

describe("concurrent requests", () => {
    it("a closure request racing a quotation send: one wins, never a pending request with a sent quotation", async () => {
        await race(8, async () => {
            const inquiry = await myInquiry();
            const { revision } = await fixtures.quotation(inquiry, owner, "DRAFT");
            return [
                () => requestClosure(inquiry.id),
                () => QuotationService.sendQuotation({ revisionId: revision.id }, owner),
                async (outcome) => {
                    const sent = (await prisma.quotationRevision.findUniqueOrThrow({ where: { id: revision.id } })).quotationRevisionStatus === "SENT";
                    assert.ok(!(sent && (await pendingCount(inquiry.id)) > 0), `pending request alongside a sent quotation (${outcome})`);
                }
            ];
        });
    });

    it("two closure requests: exactly one is pending", async () => {
        await race(8, async () => {
            const inquiry = await myInquiry();
            return [
                () => requestClosure(inquiry.id, "First"),
                () => requestClosure(inquiry.id, "Second"),
                async () => assert.equal(await pendingCount(inquiry.id), 1)
            ];
        });
    });

    it("approve racing reject: one decision, and the inquiry matches it", async () => {
        await race(8, async () => {
            const inquiry = await myInquiry();
            const { request } = await requestClosure(inquiry.id);
            return [
                () => review("approve", request.id),
                () => review("reject", request.id),
                async () => {
                    const decided = await prisma.inquiryClosureRequest.findUniqueOrThrow({ where: { id: request.id } });
                    assert.equal(await statusOf(inquiry.id), decided.status === "APPROVED" ? "CLOSED" : "IN_PROGRESS");
                    const decisions = await prisma.inquiryActivity.count({
                        where: { inquiryId: inquiry.id, activityType: { in: ["CLOSURE_APPROVED", "CLOSURE_REJECTED"] } }
                    });
                    assert.equal(decisions, 1);
                }
            ];
        });
    });

    it("a closure request racing a direct close: one wins", async () => {
        await race(8, async () => {
            const inquiry = await myInquiry();
            return [
                () => requestClosure(inquiry.id),
                () => closeDirectly(inquiry.id),
                async () => {
                    const closed = (await statusOf(inquiry.id)) === "CLOSED";
                    assert.notEqual(closed, (await pendingCount(inquiry.id)) === 1);
                }
            ];
        });
    });
});
