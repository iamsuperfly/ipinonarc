"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase";

function plain(message: string) {
  if (message.includes("code verifier")) return "Google came back, but this browser lost the sign-in proof. Try again.";
  return message;
}

export default function AuthCallback() {
  const router = useRouter();
  const [note, setNote] = useState("Signing you in.");

  useEffect(() => {
    const supabase = supabaseBrowser();
    if (!supabase) {
      setNote("Couldn't sign in. Try again.");
      return;
    }
    const client = supabase;
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const returned = params.get("error_description") || params.get("error");
    if (returned) {
      setNote(plain(returned));
      return;
    }
    async function finish() {
      if (code) {
        const exchanged = await client.auth.exchangeCodeForSession(code);
        if (exchanged.error) {
          const existing = await client.auth.getSession();
          if (existing.data.session) {
            router.replace("/account");
            return;
          }
          setNote(plain(exchanged.error.message || "Couldn't finish Google sign-in."));
          return;
        }
      }
      const { data, error } = await client.auth.getSession();
      if (error || !data.session) {
        setNote(plain(error?.message || "Google came back, but the session was not saved."));
        return;
      }
      router.replace("/account");
    }
    void finish();
  }, [router]);

  return (
    <main className="mx-auto max-w-lg px-5 pt-16">
      <p className="text-sm text-mute">{note}</p>
    </main>
  );
}
