"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { Avatar } from "./Avatar";
import { FAUCET, EXPLORER } from "@/lib/chain";
import { supabaseBrowser } from "@/lib/supabase";

const APP_LINKS = [
  { href: "/distributions", label: "Distributions" },
  { href: "/bridge", label: "Bridge USDC" },
];

function pictureOf(user: User | null, stored: string | null) {
  if (stored) return stored;
  const meta = user?.user_metadata as { avatar_url?: string; picture?: string } | undefined;
  return meta?.avatar_url || meta?.picture || null;
}

function nameOf(user: User | null, stored: string | null) {
  if (stored) return stored;
  const meta = user?.user_metadata as { full_name?: string; name?: string } | undefined;
  return meta?.full_name || meta?.name || user?.email || "You";
}

function clearCircle() {
  ["appId", "google.clientId", "deviceToken", "deviceEncryptionKey"].forEach((name) => {
    document.cookie = `${name}=; path=/; max-age=0; samesite=lax`;
  });
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [storedName, setStoredName] = useState<string | null>(null);
  const [storedPic, setStoredPic] = useState<string | null>(null);

  useEffect(() => {
    const sb = supabaseBrowser();
    if (!sb) return;
    const client = sb;
    async function load(next: User | null) {
      setUser(next);
      if (!next) {
        setOpen(false);
        setMenu(false);
        return;
      }
      const row = await client.from("profiles").select("display_name,avatar_url").eq("id", next.id).maybeSingle();
      setStoredName(row.data?.display_name ?? null);
      setStoredPic(row.data?.avatar_url ?? null);
    }
    client.auth.getSession().then(({ data }) => void load(data.session?.user ?? null));
    const { data } = client.auth.onAuthStateChange((_e, session) => void load(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  async function signOut() {
    const sb = supabaseBrowser();
    await sb?.auth.signOut();
    clearCircle();
    setMenu(false);
    setOpen(false);
  }

  const name = nameOf(user, storedName);
  const pic = pictureOf(user, storedPic);

  return (
    <header className="z-40 border-b border-ink/10 bg-ground/95 backdrop-blur-md lg:sticky lg:top-0">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-3 sm:px-6">
        <Link href="/" className="text-xl font-bold text-laterite">IPIN</Link>
        {!user && <Link href="/account" className="btn-primary h-11 px-4 text-sm">Sign in</Link>}
        {user && (
          <div className="flex items-center gap-3">
            <nav className="hidden items-center gap-6 lg:flex">
              {APP_LINKS.map((link) => (
                <Link key={link.href} href={link.href} className="text-sm font-medium text-ink/80 hover:text-laterite">{link.label}</Link>
              ))}
            </nav>
            <button type="button" className="hidden rounded-full lg:inline-flex" aria-label="Profile" onClick={() => setMenu((v) => !v)}>
              <Avatar name={name} src={pic} />
            </button>
            <button type="button" className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-ink/15 lg:hidden" aria-label="Menu" onClick={() => setOpen((v) => !v)}>☰</button>
          </div>
        )}
      </div>
      {menu && user && (
        <div className="absolute right-6 top-16 z-50 hidden w-48 rounded-2xl border border-ink/10 bg-panel p-2 shadow-lg lg:block">
          <Link href="/account" className="flex min-h-11 items-center rounded-xl px-3 text-sm" onClick={() => setMenu(false)}>Profile</Link>
          <button type="button" className="flex min-h-11 w-full items-center rounded-xl px-3 text-left text-sm text-danger" onClick={signOut}>Sign out</button>
        </div>
      )}
      {open && user && (
        <nav className="flex flex-col gap-1 border-t border-ink/10 px-5 py-4 lg:hidden">
          {APP_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="flex min-h-12 items-center" onClick={() => setOpen(false)}>{link.label}</Link>
          ))}
          <Link href="/account" className="flex min-h-12 items-center" onClick={() => setOpen(false)}>Profile</Link>
          <a href={FAUCET} target="_blank" rel="noreferrer" className="flex min-h-12 items-center">Faucet</a>
          <a href={EXPLORER} target="_blank" rel="noreferrer" className="flex min-h-12 items-center">Explorer</a>
          <button type="button" className="flex min-h-12 items-center text-left text-danger" onClick={signOut}>Sign out</button>
        </nav>
      )}
    </header>
  );
}
