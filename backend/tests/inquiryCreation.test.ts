// Customer inquiry submission: the OTP code and which products can be enquired about.
import { Fixtures, prisma, rejectsWith, testIp, withSmsCode } from "./helpers.js";
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { createInquirySchema } from "../src/schemas/inquirySchema.js";
import { InquiryService } from "../src/services/inquiry.services.js";
import { CustomerOtpService } from "../src/services/customer.otp.services.js";

const fixtures = new Fixtures();
let activeProductId: number;

before(async () => {
    activeProductId = (await fixtures.product("ACTIVE")).id;
});

after(async () => {
    await fixtures.cleanup();
    await prisma.$disconnect();
});

async function requestCode(phoneNumber: string) {
    const { result, code } = await withSmsCode(() =>
        CustomerOtpService.requestChallenge({ purpose: "INQUIRY_SUBMISSION", phoneNumber }, testIp)
    );
    return { challengeId: result.challengeId, code };
}

function submit(productId: number, phoneNumber: string, otp: { challengeId: string; code: string }) {
    const { body } = createInquirySchema.parse({ body: { productId, phoneNumber, requirement: "Test requirement", ...otp } });
    return InquiryService.createInquiry(body);
}

describe("submitting an inquiry", () => {
    it("creates an open, unassigned inquiry with a CREATED entry", async () => {
        const phone = fixtures.phone();
        const { inquiry, activity } = await submit(activeProductId, phone, await requestCode(phone));
        fixtures.track(inquiry.id);

        assert.equal(inquiry.status, "OPEN");
        assert.equal(inquiry.salespersonId, null);
        assert.equal(inquiry.phoneNumber, phone);
        assert.equal(activity.activityType, "CREATED");
    });

    it("refuses inactive and archived products, and keeps the code usable", async () => {
        const phone = fixtures.phone();
        const otp = await requestCode(phone);
        const before = await prisma.inquiry.count();

        for (const status of ["INACTIVE", "ARCHIVED"] as const) {
            const product = await fixtures.product(status);
            await rejectsWith(submit(product.id, phone, otp), 404, /no longer available/);
        }
        assert.equal(await prisma.inquiry.count(), before);

        // The failed attempts rolled back, so the same code still works for an active product.
        const { inquiry } = await submit(activeProductId, phone, otp);
        fixtures.track(inquiry.id);
    });

    it("refuses a product that doesn't exist", async () => {
        const phone = fixtures.phone();
        await rejectsWith(submit(2_147_483_647, phone, await requestCode(phone)), 404);
    });

    it("refuses a wrong or reused code", async () => {
        const phone = fixtures.phone();
        const otp = await requestCode(phone);
        const wrong = otp.code === "000000" ? "000001" : "000000";

        await rejectsWith(submit(activeProductId, phone, { ...otp, code: wrong }), 400);
        const { inquiry } = await submit(activeProductId, phone, otp);
        fixtures.track(inquiry.id);
        await rejectsWith(submit(activeProductId, phone, otp), 400);
    });

    it("refuses a code issued for a different phone", async () => {
        const phone = fixtures.phone();
        await rejectsWith(submit(activeProductId, fixtures.phone(), await requestCode(phone)), 400);
    });
});
