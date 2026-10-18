"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { Avatar } from "@/components/Avatar";
import { CircleCard } from "@/components/CircleWallet";
import { supabaseBrowser } from "@/lib/supabase";
import { shortAddr } from "@/lib/format";

type WalletRow = { id: string; address: string; is_active: boolean; kind?: string };
type Dist = { id: string; name: string; pool_amount: number; status: string; pot_id: number | null };

export default function AccountPage() {
  const supabase = supabaseBrowser();
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const [user, setUser] = useState<User | null>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [pic, setPic] = useState<string | null>(null);
  const [wallets, setWallets] = useState<WalletRow[]>([]);
  const [rows, setRows] = useState<Dist[]>([]);
  const [people, setPeople] = useState(0);
  const [note, setNote] = useState("");

  async function refresh() {
    if (!supabase) return;
    const { data } = await supabase.auth.getUser();
    setUser(data.user ?? null);
    if (!data.user) return;
    const row = await supabase.from("profiles").select("display_name,avatar_url").eq("id", data.user.id).maybeSingle();
    const meta = data.user.user_metadata as { full_name?: string; name?: string; avatar_url?: string; picture?: string };
    setName(row.data?.display_name || meta.full_name || meta.name || "");
    setPic(row.data?.avatar_url || meta.avatar_url || meta.picture || null);
    const walletRows = await supabase.from("wallets").select("id,address,is_active,kind").order("created_at");
    setWallets((walletRows.data as WalletRow[]) ?? []);
    const list = await supabase.from("campaigns").select("id,name,pool_amount,status,pot_id").order("created_at", { ascending: false });
    setRows((list.data as Dist[]) ?? []);
    const paid = await supabase.from("allocations").select("recipient").eq("paid", true);
    setPeople(new Set((paid.data ?? []).map((item) => item.recipient)).size);
  }

  useEffect(() => { void refresh(); }, []);

  async function google() {
    if (!supabase) {
      setNote("Couldn't sign in. Try again.");
      return;
    }
    setNote("Opening Google.");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setNote(error.message || "Couldn't sign in. Try again.");
      return;
    }
    window.setTimeout(() => {
      setNote((current) => (current === "Opening Google." ? "Google did not open. Try again." : current));
    }, 2500);
  }

  async function saveName() {
    if (!supabase || !user) return;
    await supabase.from("profiles").upsert({ id: user.id, email: user.email, display_name: name });
    setEditing(false);
    setNote("Saved.");
  }

  async function onFile(file: File) {
    if (!supabase || !user) return;
    const path = `${user.id}/avatar`;
    const up = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (up.error) {
      setNote("Couldn't save the picture. Try again.");
      return;
    }
    const url = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
    const stamped = `${url}?v=${Date.now()}`;
    await supabase.from("profiles").upsert({ id: user.id, email: user.email, avatar_url: stamped });
    setPic(stamped);
  }

  async function attach() {
    if (!supabase || !address || !user) return;
    const circle = wallets.find((wallet) => wallet.kind === "circle");
    await supabase.from("wallets").upsert({ account_id: user.id, address: address.toLowerCase(), is_active: !circle, kind: "connected" }, { onConflict: "account_id,address" });
    await refresh();
  }

  async function makeActive(id: string) {
    if (!supabase || !user) return;
    await supabase.from("wallets").update({ is_active: false }).eq("account_id", user.id);
    await supabase.from("wallets").update({ is_active: true }).eq("id", id);
    await refresh();
  }

  async function remove(id: string) {
    if (!supabase) return;
    const gone = await supabase.from("campaigns").delete().eq("id", id);
    if (gone.error) {
      setNote("Couldn't remove that. Try again.");
      return;
    }
    setRows((current) => current.filter((row) => row.id !== id));
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-lg px-5 pb-24 pt-4">
        <h1 className="text-4xl font-bold">Sign in</h1>
        <button type="button" className="btn-primary mt-6 w-full" onClick={google}>Continue with Google</button>
        {note && <p className="mt-3 text-sm text-mute">{note}</p>}
      </main>
    );
  }

  const waiting = rows.filter((r) => r.status !== "done");
  const done = rows.filter((r) => r.status === "done");
  const circle = wallets.find((w) => w.kind === "circle");
  const active = circle || wallets.find((w) => w.is_active);
  const sent = done.reduce((sum, row) => sum + Number(row.pool_amount || 0), 0);
  const waitingTotal = waiting.reduce((sum, row) => sum + Number(row.pool_amount || 0), 0);

  return (
    <main className="mx-auto max-w-2xl px-5 pb-24 pt-4">
      <div className="flex items-center gap-4">
        <Avatar name={name || user.email || "I"} src={pic} size={72} />
        <div className="min-w-0">
          <h1 className="truncate text-3xl font-bold">{name || "Profile"}</h1>
          <p className="truncate text-mute">{user.email}</p>
          <p className="mt-1 break-all font-mono text-sm">{active ? active.address : "No active wallet"}</p>
          {circle && <p className="text-sm text-laterite">Arc wallet</p>}
        </div>
      </div>
      <div className="mt-4">
        <CircleCard />
      </div>
      <button type="button" className="btn-ghost mt-4 h-11 w-full text-sm" onClick={() => setEditing((v) => !v)}>{editing ? "Close" : "Edit"}</button>
      {editing && (
        <div className="mt-4 space-y-4 rounded-3xl border border-ink/10 bg-panel p-6">
          <label className="block text-sm text-mute">Picture
            <input type="file" accept="image/*" className="mt-2 block w-full text-sm" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
          </label>
          <label className="block text-sm text-mute">Name
            <input value={name} onChange={(e) => setName(e.target.value)} className="mt-2 h-12 w-full rounded-2xl border border-ink/15 bg-ground px-4 outline-none focus:border-laterite" />
          </label>
          <button type="button" className="btn-primary w-full" onClick={saveName}>Save</button>
        </div>
      )}
      <section className="mt-8 grid grid-cols-3 gap-3">
        <article className="rounded-2xl border border-ink/10 bg-panel p-4"><p className="text-sm text-mute">Sent</p><p className="mt-2 text-2xl font-bold tabular-nums">{sent}</p></article>
        <article className="rounded-2xl border border-ink/10 bg-panel p-4"><p className="text-sm text-mute">People</p><p className="mt-2 text-2xl font-bold tabular-nums">{people}</p></article>
        <article className="rounded-2xl border border-ink/10 bg-panel p-4"><p className="text-sm text-mute">Waiting</p><p className="mt-2 text-2xl font-bold tabular-nums">{waitingTotal}</p></article>
      </section>
      <section className="mt-8">
        <p className="text-sm text-mute">Waiting</p>
        <ul className="mt-3 space-y-3">
          {waiting.length === 0 && <li className="rounded-2xl border border-ink/10 bg-panel px-4 py-4 text-sm text-mute">Nothing waiting.</li>}
          {waiting.map((r) => (
            <li key={r.id} className="rounded-2xl border border-ink/10 bg-panel px-4 py-4">
              <Link href={r.pot_id ? `/pot/${r.pot_id}` : `/distribute?name=${encodeURIComponent(r.name)}&total=${r.pool_amount}`} className="flex items-center justify-between"><span>{r.name}</span><span className="font-mono text-sm">{r.pool_amount} USDC</span></Link>
              {!r.pot_id && <p className="mt-1 text-sm text-mute">Not created yet.</p>}
              <button type="button" className="mt-3 text-sm text-danger" onClick={() => remove(r.id)}>Delete</button>
            </li>
          ))}
        </ul>
      </section>
      <section className="mt-8">
        <p className="text-sm text-mute">Done</p>
        <ul className="mt-3 space-y-3">
          {done.length === 0 && <li className="rounded-2xl border border-ink/10 bg-panel px-4 py-4 text-sm text-mute">None completed yet.</li>}
          {done.map((r) => (
            <li key={r.id} className="rounded-2xl border border-ink/10 bg-panel px-4 py-4">
              {r.pot_id ? <Link href={`/pot/${r.pot_id}`} className="flex items-center justify-between"><span>{r.name}</span><span className="font-mono text-sm">{r.pool_amount} USDC</span></Link> : <Link href={`/distribute?name=${encodeURIComponent(r.name)}&total=${r.pool_amount}`} className="flex items-center justify-between"><span>{r.name}</span><span className="font-mono text-sm">{r.pool_amount} USDC</span></Link>}
            </li>
          ))}
        </ul>
      </section>
      <section className="mt-8 space-y-3">
        <p className="text-sm text-mute">Wallets</p>
        {isConnected ? (
          <button type="button" className="btn-ghost w-full" onClick={() => disconnect()}>Disconnect {shortAddr(address)}</button>
        ) : (
          <button type="button" className="btn-ghost w-full" onClick={() => connectors[0] && connect({ connector: connectors[0] })}>Connect wallet</button>
        )}
        <button type="button" className="btn-ghost w-full" onClick={attach} disabled={!isConnected}>Attach connected wallet</button>
        {wallets.map((w) => (
          <div key={w.id} className="flex items-center justify-between rounded-2xl border border-ink/10 bg-panel px-4 py-3">
            <span className="font-mono text-sm">{shortAddr(w.address)}{w.kind === "circle" ? " \u00b7 Arc" : ""}</span>
            {w.kind === "circle" || w.is_active ? <span className="text-sm text-laterite">Active</span> : <button type="button" className="btn-ghost h-11 px-4 text-sm" onClick={() => makeActive(w.id)}>Make active</button>}
          </div>
        ))}
        {note && <p className="text-sm text-mute">{note}</p>}
      </section>
    </main>
  );
}
