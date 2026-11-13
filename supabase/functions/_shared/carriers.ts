export type CarrierId =
  | "royal-mail"
  | "parcelforce"
  | "evri"
  | "dpd"
  | "yodel"
  | "ups"
  | "dhl"
  | "amazon"
  | "an-post"
  | "dpd-ie"
  | "fastway"
  | "nightline"
  | "17track"
  | "other";

export type Carrier = {
  id: CarrierId;
  name: string;
  trackingUrl: (number: string) => string | null;
};

/** 17TRACK follows parcels from almost any carrier, so it's the fallback for numbers we don't recognise. */
const seventeenTrack = (n: string) => `https://t.17track.net/en#nums=${n}`;

export const CARRIERS: Carrier[] = [
  { id: "an-post", name: "An Post", trackingUrl: (n) => `https://www.anpost.com/Post-Parcels/Track/History?item=${n}` },
  { id: "dpd-ie", name: "DPD Ireland", trackingUrl: seventeenTrack },
  { id: "fastway", name: "Fastway (Ireland)", trackingUrl: seventeenTrack },
  { id: "nightline", name: "Nightline", trackingUrl: seventeenTrack },
  { id: "royal-mail", name: "Royal Mail", trackingUrl: (n) => `https://www.royalmail.com/track-your-item#/tracking-results/${n}` },
  { id: "parcelforce", name: "Parcelforce", trackingUrl: (n) => `https://www.parcelforce.com/track-trace?trackNumber=${n}` },
  { id: "evri", name: "Evri", trackingUrl: (n) => `https://www.evri.com/track/parcel/${n}` },
  { id: "dpd", name: "DPD", trackingUrl: (n) => `https://track.dpd.co.uk/parcels/${n}` },
  { id: "yodel", name: "Yodel", trackingUrl: (n) => `https://www.yodel.co.uk/tracking/${n}` },
  { id: "ups", name: "UPS", trackingUrl: (n) => `https://www.ups.com/track?tracknum=${n}` },
  { id: "dhl", name: "DHL", trackingUrl: (n) => `https://www.dhl.com/gb-en/home/tracking/tracking-parcel.html?submit=1&tracking-id=${n}` },
  { id: "amazon", name: "Amazon Logistics", trackingUrl: () => "https://www.amazon.co.uk/gp/your-account/order-history" },
  { id: "17track", name: "17TRACK", trackingUrl: seventeenTrack },
  { id: "other", name: "Other", trackingUrl: seventeenTrack },
];

const PATTERNS: [RegExp, CarrierId][] = [
  [/^1Z[0-9A-Z]{16}$/, "ups"],
  [/^TBA\d{12}$/, "amazon"],
  [/^JD\d{16}$/, "yodel"],
  [/^H[0-9A-Z]{15}$/, "evri"],
  [/^[A-Z]{2}\d{9}GB$/, "royal-mail"],
  [/^[A-Z]{2}\d{9}IE$/, "an-post"],
  [/^[A-Z]{2}\d{7}$/, "parcelforce"],
  [/^\d{14}$/, "dpd"],
  [/^\d{10}$/, "dhl"],
];

export function normaliseTracking(input: string): string {
  return input.replace(/[\s-]+/g, "").toUpperCase();
}

export function getCarrier(id: string | null | undefined): Carrier | undefined {
  return CARRIERS.find((c) => c.id === id);
}

/**
 * Guess the carrier from a tracking number. Anything else that looks like a
 * tracking number (8 to 40 letters and digits) goes to 17TRACK, which finds
 * the carrier itself. Returns undefined when it can't be a tracking number.
 */
export function detectCarrier(trackingNumber: string): Carrier | undefined {
  const n = normaliseTracking(trackingNumber);
  if (!n) return undefined;
  const match = PATTERNS.find(([re]) => re.test(n));
  if (match) return getCarrier(match[1]);
  return /^(?=.*\d)[0-9A-Z]{8,40}$/.test(n) ? getCarrier("17track") : undefined;
}

/** Build the carrier's public tracking page for a number. */
export function trackingUrlFor(carrierId: string | null | undefined, trackingNumber: string | null | undefined): string | null {
  const carrier = getCarrier(carrierId);
  if (!carrier || !trackingNumber) return null;
  return carrier.trackingUrl(encodeURIComponent(normaliseTracking(trackingNumber)));
}

/** Map a free-text carrier name (from an email) to one of ours. */
export function carrierFromName(name: string | null | undefined): Carrier | undefined {
  if (!name) return undefined;
  const s = name.toLowerCase();
  if (s.includes("17track") || s.includes("17 track")) return getCarrier("17track");
  if (s.includes("an post")) return getCarrier("an-post");
  if (s.includes("fastway")) return getCarrier("fastway");
  if (s.includes("nightline")) return getCarrier("nightline");
  if (s.includes("dpd") && (s.includes("ireland") || s.includes(".ie"))) return getCarrier("dpd-ie");
  if (s.includes("parcelforce")) return getCarrier("parcelforce");
  if (s.includes("royal mail")) return getCarrier("royal-mail");
  if (s.includes("evri") || s.includes("hermes")) return getCarrier("evri");
  if (s.includes("dpd")) return getCarrier("dpd");
  if (s.includes("yodel")) return getCarrier("yodel");
  if (s.includes("ups")) return getCarrier("ups");
  if (s.includes("dhl")) return getCarrier("dhl");
  if (s.includes("amazon")) return getCarrier("amazon");
  return undefined;
}
