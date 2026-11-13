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
    ["CD123456789IE", "an-post"],
    ["LP00123456789012", "17track"],
    ["YT2412345678901234", "17track"],
    ["JSEKJ1273898933YQ", "17track"],
  ])("recognises %s as %s", (number, carrier) => {
    expect(detectCarrier(number)?.id).toBe(carrier);
  });

  it("returns undefined for unknown formats", () => {
    expect(detectCarrier("hello")).toBeUndefined();
    expect(detectCarrier("ABCDEFGHIJ")).toBeUndefined();
    expect(detectCarrier("")).toBeUndefined();
  });
});

describe("trackingUrlFor", () => {
  it("builds the Evri tracking page", () => {
    expect(trackingUrlFor("evri", "h01hya0012345678")).toBe(
      "https://www.evri.com/track/parcel/H01HYA0012345678",
    );
  });
  it("returns null without a number", () => {
    expect(trackingUrlFor("evri", "")).toBeNull();
  });
  it("sends unknown carriers to 17TRACK", () => {
    expect(trackingUrlFor("17track", "lp00 1234 5678 9012")).toBe("https://t.17track.net/en#nums=LP00123456789012");
    expect(trackingUrlFor("other", "123")).toBe("https://t.17track.net/en#nums=123");
  });
});

describe("carrierFromName", () => {
  it("maps email wording to carriers", () => {
    expect(carrierFromName("Royal Mail Tracked 24")?.id).toBe("royal-mail");
    expect(carrierFromName("Hermes")?.id).toBe("evri");
    expect(carrierFromName("17TRACK")?.id).toBe("17track");
    expect(carrierFromName("An Post")?.id).toBe("an-post");
    expect(carrierFromName("DPD Ireland")?.id).toBe("dpd-ie");
    expect(carrierFromName("DPD")?.id).toBe("dpd");
    expect(carrierFromName("Fastway Couriers")?.id).toBe("fastway");
    expect(carrierFromName("Parcelforce Worldwide")?.id).toBe("parcelforce");
    expect(carrierFromName("Pigeon")).toBeUndefined();
  });
});
