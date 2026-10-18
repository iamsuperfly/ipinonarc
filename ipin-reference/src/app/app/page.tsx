"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AppRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/distributions"); }, [router]);
  return <main className="px-5 pt-16">Opening distributions…</main>;
}
