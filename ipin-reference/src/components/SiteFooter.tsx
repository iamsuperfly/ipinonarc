"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase";

export function SiteFooter() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    const sb = supabaseBrowser();
    if (!sb) return;
    sb.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
    const { data } = sb.auth.onAuthStateChange((_e, session) => setSignedIn(Boolean(session)));
    return () => data.subscription.unsubscribe();
  }, []);

  return (
    <footer className="border-t border-ink/10 px-5 py-12 text-sm text-mute">
      <div className="mx-auto grid max-w-6xl gap-10 sm:grid-cols-2">
        <div>
          <p className="text-2xl font-bold text-laterite">IPIN</p>
          <p className="mt-3 max-w-sm">A share is a share. Paid once.</p>
          <a href="https://x.com/iamsuperflly" target="_blank" rel="noreferrer" className="mt-5 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-ink/10 text-ink" aria-label="X">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true"><path d="M18.2 2H21l-6.5 7.4L22 22h-6.8l-4.3-6.6L6 22H3.2l7-8L2 2h6.9l3.9 6.1L18.2 2Zm-1.2 18h1.8L7.1 3.9H5.2L17 20Z"/></svg>
          </a>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-3">
            <p className="text-ink">Product</p>
            <Link href="/distributions" className="block hover:text-ink">Distributions</Link>
            <Link href="/bridge" className="block hover:text-ink">Bridge</Link>
            <Link href={signedIn ? "/account" : "/account"} className="block hover:text-ink">{signedIn ? "Profile" : "Sign in"}</Link>
          </div>
          <div className="space-y-3">
            <p className="text-ink">Contact</p>
            <a href="mailto:iamsuperfly02@gmail.com" className="block hover:text-ink">iamsuperfly02@gmail.com</a>
          </div>
        </div>
      </div>
      <p className="mx-auto mt-10 max-w-6xl">© 2026 IPIN — a project of <a className="text-ink hover:underline" href="https://x.com/iamsuperflly" target="_blank" rel="noreferrer">Superfly</a></p>
    </footer>
  );
}
