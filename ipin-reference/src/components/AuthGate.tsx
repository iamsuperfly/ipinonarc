"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabase";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const open = path === "/" || path.startsWith("/auth");
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    const sb = supabaseBrowser();
    if (!sb) {
      setReady(true);
      return;
    }
    sb.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setReady(true);
    });
    const { data } = sb.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function google() {
    const sb = supabaseBrowser();
    if (!sb) {
      setNote("Couldn't sign in. Try again.");
      return;
    }
    await sb.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  if (open) return children;
  if (!ready) return <main className="px-5 pt-16">Checking session…</main>;
  if (!user) {
    return (
      <main className="mx-auto max-w-lg px-5 pt-16">
        <h1 className="text-4xl font-bold">Sign in</h1>
        <button type="button" className="btn-primary mt-6 w-full" onClick={google}>Continue with Google</button>
        {note && <p className="mt-3 text-sm text-mute">{note}</p>}
      </main>
    );
  }
  return children;
}
