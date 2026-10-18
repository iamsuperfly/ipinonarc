import type { Metadata } from "next";
import { Providers } from "./providers";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { AuthGate } from "@/components/AuthGate";
import "./globals.css";

export const metadata: Metadata = {
  title: "IPIN",
  description: "Create a pool. Fund it. Pay many people once. USDC settles on Arc.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>
          <SiteHeader />
          <AuthGate>{children}</AuthGate>
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}
