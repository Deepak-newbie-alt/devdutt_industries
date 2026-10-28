// Customer "My inquiries": the OTP-verified lookup by phone number and what it reveals.
import { Fixtures, prisma, rejectsWith, testIp, withSmsCode } from "./helpers.js";
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { createInquirySchema, customerInquiryHistorySchema } from "../src/schemas/inquirySchema.js";
import { requestOtpChallengeSchema } from "../src/schemas/customerOtpSchema.js";
import { InquiryService } from "../src/services/inquiry.services.js";
import { CustomerOtpService } from "../src/services/customer.otp.services.js";

const fixtures = new Fixtures();
// Own IP, so this file's codes don't use up the hourly IP limit the other files share.
const ip = `${testIp}-history`;
let productId: number;
let productName: string;
let salespersonId: number;

before(async () => {
    const product = await fixtures.product("ACTIVE");
    productId = product.id;
    productName = product.name;
    salespersonId = (await fixtures.salesperson()).id;
});

after(async () => {
    await fixtures.cleanup();
    await prisma.$disconnect();
});

async function requestCode(phoneNumber: string, purpose: "INQUIRY_HISTORY_LOOKUP" | "INQUIRY_SUBMISSION" = "INQUIRY_HISTORY_LOOKUP") {
    const { result, code, to } = await withSmsCode(() => CustomerOtpService.requestChallenge({ purpose, phoneNumber }, ip));
    assert.equal(to, phoneNumber);
    return { challengeId: result.challengeId, code };
}

function lookup(phoneNumber: string, otp: { challengeId: string; code: string }) {
    const { body } = customerInquiryHistorySchema.parse({ body: { phoneNumber, ...otp } });
    return InquiryService.getCustomerInquiryHistory(body);
}

const wrongCode = (code: string) => (code === "000000" ? "000001" : "000000");

const challenge = (id: string) => prisma.customerOtpChallenge.findUniqueOrThrow({ where: { id } });

describe("customer inquiry history", () => {
    it("returns only the verified phone's inquiries, newest first, with customer-safe fields", async () => {
        const phone = fixtures.phone();
        const older = await fixtures.inquiry(productId, "IN_PROGRESS", salespersonId, phone);
        const newer = await fixtures.inquiry(productId, "OPEN", null, phone);
        await fixtures.quotation(older, salespersonId, "SENT", { token: "x".repeat(43) });
        await prisma.inquiryActivity.create({ data: { inquiryId: older.id, activityType: "NOTE_ADDED", salespersonId, note: "Internal note" } });
        const someoneElse = await fixtures.inquiry(productId, "OPEN", null);

        const otp = await requestCode(phone);
        const history = await lookup(phone, otp);

        assert.deepEqual(history.inquiries.map((inquiry) => inquiry.id), [newer.id, older.id]);
        assert.equal(history.totalInquiries, 2);
        assert.ok(!history.inquiries.some((inquiry) => inquiry.id === someoneElse.id));

        // Exactly these fields: no salesperson, activities, phone, prices or token hashes.
        assert.deepEqual(Object.keys(history).sort(), ["access", "inquiries", "totalInquiries"]);
        for (const inquiry of history.inquiries) {
            assert.deepEqual(Object.keys(inquiry).sort(), ["createdAt", "id", "product", "quotation", "requirement", "status"]);
            assert.deepEqual(inquiry.product, { name: productName });
        }
        assert.equal(history.inquiries[0]!.quotation, null);
        const quotation = history.inquiries[1]!.quotation!;
        assert.deepEqual(Object.keys(quotation).sort(), ["canRespond", "quotationNumber", "revisionNumber", "status", "validUntil"]);
        assert.equal(quotation.status, "SENT");
        assert.equal(quotation.canRespond, true);
        assert.ok(!JSON.stringify(history).includes("Internal note"));

        assert.ok((await challenge(otp.challengeId)).consumedAt, "the code is used up");
    });

    it("returns an empty list for a verified phone with no inquiries", async () => {
        const phone = fixtures.phone();
        const { inquiries, totalInquiries } = await lookup(phone, await requestCode(phone));
        assert.deepEqual({ inquiries, totalInquiries }, { inquiries: [], totalInquiries: 0 });
    });

    it("shows only what was sent to the customer, never drafts", async () => {
        const phone = fixtures.phone();

        const draftOnly = await fixtures.inquiry(productId, "IN_PROGRESS", salespersonId, phone);
        await fixtures.quotation(draftOnly, salespersonId, "DRAFT");

        // Customer asked for changes: revision 1 superseded, revision 2 still a draft.
        const beingRevised = await fixtures.inquiry(productId, "IN_PROGRESS", salespersonId, phone);
        const { quotation, revision } = await fixtures.quotation(beingRevised, salespersonId, "SUPERSEDED");
        const { id: _id, createdAt: _c, updatedAt: _u, ...copy } = revision;
        await prisma.quotationRevision.create({
            data: { ...copy, revisionNumber: 2, quotationRevisionStatus: "DRAFT", machineSpecifications: { Test: "yes" }, terms: { Payment: "Test" } }
        });

        // Sent, but past its valid-until date and not yet marked expired by the job.
        const lapsed = await fixtures.inquiry(productId, "IN_PROGRESS", salespersonId, phone);
        await fixtures.quotation(lapsed, salespersonId, "SENT", { validUntil: "2020-01-01" });

        const byId = new Map((await lookup(phone, await requestCode(phone))).inquiries.map((inquiry) => [inquiry.id, inquiry]));

        assert.equal(byId.get(draftOnly.id)!.quotation, null);
        assert.equal(byId.get(beingRevised.id)!.quotation!.status, "SUPERSEDED");
        assert.equal(byId.get(beingRevised.id)!.quotation!.revisionNumber, 1);
        assert.equal(byId.get(beingRevised.id)!.quotation!.quotationNumber, quotation.quotationNumber);
        assert.equal(byId.get(lapsed.id)!.quotation!.status, "SENT");
        assert.equal(byId.get(lapsed.id)!.quotation!.canRespond, false);
    });

    it("returns the 50 newest and the total", async () => {
        const phone = fixtures.phone();
        // Inquiries on the test product are removed at cleanup.
        await prisma.inquiry.createMany({
            data: Array.from({ length: 51 }, (_, i) => ({ productId, phoneNumber: phone, requirement: `Bulk ${i}` }))
        });

        const history = await lookup(phone, await requestCode(phone));
        assert.equal(history.inquiries.length, 50);
        assert.equal(history.totalInquiries, 51);
        assert.ok(!history.inquiries.some((inquiry) => inquiry.requirement === "Bulk 0"), "the oldest is the one left out");
    });
});

describe("customer inquiry history: verification", () => {
    it("refuses a wrong code and counts the attempt, then accepts the right one", async () => {
        const phone = fixtures.phone();
        await fixtures.inquiry(productId, "OPEN", null, phone);
        const otp = await requestCode(phone);

        await rejectsWith(lookup(phone, { ...otp, code: wrongCode(otp.code) }), 400, /Invalid or expired/);
        const afterWrong = await challenge(otp.challengeId);
        assert.equal(afterWrong.attempts, 1, "the failed attempt is recorded");
        assert.equal(afterWrong.consumedAt, null);

        assert.equal((await lookup(phone, otp)).totalInquiries, 1);
    });

    it("locks the code after 5 wrong attempts", async () => {
        const phone = fixtures.phone();
        const otp = await requestCode(phone);

        for (let i = 0; i < 5; i++) {
            await rejectsWith(lookup(phone, { ...otp, code: wrongCode(otp.code) }), 400);
        }
        await rejectsWith(lookup(phone, otp), 400);
        assert.equal((await challenge(otp.challengeId)).consumedAt, null);
    });

    it("refuses an expired code", async () => {
        const phone = fixtures.phone();
        const otp = await requestCode(phone);
        await prisma.customerOtpChallenge.update({ where: { id: otp.challengeId }, data: { expiresAt: new Date(Date.now() - 1000) } });

        await rejectsWith(lookup(phone, otp), 400, /Invalid or expired/);
    });

    it("refuses a replayed code", async () => {
        const phone = fixtures.phone();
        const otp = await requestCode(phone);

        await lookup(phone, otp);
        await rejectsWith(lookup(phone, otp), 400, /Invalid or expired/);
    });

    it("refuses a code sent to another phone, so another customer's inquiries can't be read", async () => {
        const mine = fixtures.phone();
        const victim = fixtures.phone();
        await fixtures.inquiry(productId, "OPEN", null, victim);
        const otp = await requestCode(mine);

        await rejectsWith(lookup(victim, otp), 400);
        assert.equal((await challenge(otp.challengeId)).attempts, 1, "the attempt is counted");
        // Still usable for the phone it was sent to, which has no inquiries.
        const { inquiries, totalInquiries } = await lookup(mine, otp);
        assert.deepEqual({ inquiries, totalInquiries }, { inquiries: [], totalInquiries: 0 });
    });

    it("doesn't accept codes across purposes", async () => {
        const phone = fixtures.phone();
        await fixtures.inquiry(productId, "OPEN", null, phone);

        // An enquiry-submission code can't open the history...
        const submissionOtp = await requestCode(phone, "INQUIRY_SUBMISSION");
        await rejectsWith(lookup(phone, submissionOtp), 400);

        // ...and a history code can't submit an enquiry.
        const historyOtp = await requestCode(phone);
        const { body } = createInquirySchema.parse({ body: { productId, phoneNumber: phone, requirement: "Test", ...historyOtp } });
        await rejectsWith(InquiryService.createInquiry(body), 400);
    });
});

describe("customer inquiry history: code requests", () => {
    it("accepts the new purpose in the request schema", () => {
        const phoneNumber = "9876543210";
        assert.ok(requestOtpChallengeSchema.safeParse({ body: { purpose: "INQUIRY_HISTORY_LOOKUP", phoneNumber } }).success);
        assert.ok(!requestOtpChallengeSchema.safeParse({ body: { purpose: "INQUIRY_HISTORY_LOOKUP", phoneNumber: "12345" } }).success);
        assert.ok(!customerInquiryHistorySchema.safeParse({ body: { phoneNumber, challengeId: "nope", code: "123456" } }).success);
    });

    it("has its own cooldown, separate from enquiry submission", async () => {
        const phone = fixtures.phone();

        await requestCode(phone, "INQUIRY_SUBMISSION");
        // A different purpose isn't held by the submission cooldown...
        await requestCode(phone);
        // ...but a second history code within 60 seconds is.
        await rejectsWith(CustomerOtpService.requestChallenge({ purpose: "INQUIRY_HISTORY_LOOKUP", phoneNumber: phone }, ip), 429);
    });
});
