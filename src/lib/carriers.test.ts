import { describe, expect, it } from "vitest";
import { carrierFromName, detectCarrier, trackingUrlFor } from "./carriers";

describe("detectCarrier", () => {
  it.each([
    ["H01HYA0012345678", "evri"],
    ["AB123456785GB", "royal-mail"],
    ["ab 1234 5678 5gb", "royal-mail"],
    ["15501234567890", "dpd"],
    ["1Z999AA10123456784", "ups"],
    ["JD0002212345678901", "yodel"],
    ["TBA123456789012", "amazon"],
    ["1234567890", "dhl"],
    ["PB1234567", "parcelforce"],
  ])("recognises %s as %s", (number, carrier) => {
    expect(detectCarrier(number)?.id).toBe(carrier);
  });

  it("returns undefined for unknown formats", () => {
    expect(detectCarrier("hello")).toBeUndefined();
    expect(detectCarrier("")).toBeUndefined();
  });
});

describe("trackingUrlFor", () => {
  it("builds the Evri tracking page", () => {
    expect(trackingUrlFor("evri", "h01hya0012345678")).toBe(
      "https://www.evri.com/track/parcel/H01HYA0012345678",
    );
  });
  it("returns null without a number or for other carriers", () => {
    expect(trackingUrlFor("evri", "")).toBeNull();
    expect(trackingUrlFor("other", "123")).toBeNull();
  });
});

describe("carrierFromName", () => {
  it("maps email wording to carriers", () => {
    expect(carrierFromName("Royal Mail Tracked 24")?.id).toBe("royal-mail");
    expect(carrierFromName("Hermes")?.id).toBe("evri");
    expect(carrierFromName("Parcelforce Worldwide")?.id).toBe("parcelforce");
    expect(carrierFromName("Pigeon")).toBeUndefined();
  });
});
