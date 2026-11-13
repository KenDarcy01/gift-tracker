import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Inter } from "next/font/google";
import "./globals.css";

const base = process.env.NEXT_PUBLIC_BASE_PATH || "";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  title: "Gift Tracker",
  description: "Christmas gift ideas, budgets and deliveries in one place.",
  applicationName: "Gift Tracker",
  appleWebApp: { capable: true, title: "Gifts", statusBarStyle: "default" },
  icons: {
    icon: [{ url: `${base}/icons/icon-192.png`, sizes: "192x192", type: "image/png" }],
    apple: [{ url: `${base}/icons/apple-touch-icon.png`, sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#1e5b45",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-GB" className={`${inter.variable} ${bricolage.variable} h-full antialiased`}>
      <body className="min-h-full bg-ground text-ink">{children}</body>
    </html>
  );
}
