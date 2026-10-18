import { Suspense } from "react";

export default function BridgeLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<main className="px-5 pt-10">Loading bridge…</main>}>{children}</Suspense>;
}
