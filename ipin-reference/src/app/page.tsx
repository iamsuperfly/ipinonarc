"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase";

const RECIPIENTS = [
  { name: "Ada", amount: "4,200" },
  { name: "Kunle", amount: "1,150" },
  { name: "Mara", amount: "860" },
  { name: "Ife", amount: "2,040" },
];

const PILLS = ["Pool", "Recipient list", "Amounts", "Paid once", "Arc settlement"];
const PHASES = ["Ready", "Distributing", "Settling on Arc", "Settled"];

export default function LandingPage() {
  const [phase, setPhase] = useState(0);
  const [count, setCount] = useState(0);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setPhase((p) => (p + 1) % 4), 1800);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let n = 0;
    const id = setInterval(() => {
      n = Math.min(25000, n + 625);
      setCount(n);
      if (n >= 25000) clearInterval(id);
    }, 30);
    return () => clearInterval(id);
  }, [phase]);

  useEffect(() => {
    const sb = supabaseBrowser();
    if (!sb) return;
    sb.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
    const { data } = sb.auth.onAuthStateChange((_e, session) => setSignedIn(Boolean(session)));
    return () => data.subscription.unsubscribe();
  }, []);

  return (
    <main className="mx-auto max-w-6xl px-5 pb-28 pt-12">
      <section className="grid items-start gap-12 lg:grid-cols-2">
        <div>
          <h1 className="text-4xl font-bold leading-tight sm:text-5xl">Distribute to many people<br /><span className="phrase">on Arc</span></h1>
          <p className="mt-5 max-w-xl text-lg text-mute">One pool. Many people. <span className="phrase">USDC settles on Arc.</span> Recipients get the full allocation. You pay the fee on top.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/distributions" className="btn-primary w-full sm:w-auto">Create a distribution</Link>
            {!signedIn && <Link href="/account" className="btn-ghost w-full sm:w-auto">Sign in</Link>}
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-ink/10 bg-panel p-6">
          <p className="text-sm text-mute">Pool</p>
          <p className="mt-1 text-5xl font-bold leading-none tabular-nums">{count.toLocaleString()}</p>
          <p className="mt-1 text-sm text-mute">USDC</p>
          <p className="mt-3 h-5 text-sm text-laterite transition-opacity">{PHASES[phase]}</p>
          <div className="mt-4 space-y-3">
            {RECIPIENTS.map((r, i) => (
              <div key={r.name} className="flex items-center justify-between rounded-2xl border border-ink/10 px-4 py-3" style={{ opacity: phase === 0 ? 0.45 : 1, transition: `opacity 0.45s ${i * 70}ms` }}>
                <span>{r.name}</span>
                <span className="font-mono">{phase >= 2 ? r.amount : "\u2014"} USDC</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-24 grid gap-6 lg:grid-cols-2">
        <article className="rounded-3xl border border-ink/10 bg-panel p-6">
          <h2 className="text-3xl font-bold">By hand</h2>
          <p className="mt-4 font-mono text-sm text-mute">Wallet → Ada → Kunle → Mara → Ife …</p>
          <p className="mt-3 text-mute">Every person is a separate send. Miss one, pay twice, lose the thread.</p>
        </article>
        <article className="rounded-3xl border border-laterite/40 bg-panel p-6">
          <h2 className="text-3xl font-bold">In one send</h2>
          <p className="mt-4 font-mono text-sm">Wallet → the pool → everyone</p>
          <p className="mt-3 text-mute">One distribution. Amounts stay whole. Paid once.</p>
        </article>
      </section>

      <section className="mt-20">
        <h2 className="text-4xl font-bold">Create. Fund. Distribute. Verify.</h2>
        <ol className="mt-8 grid gap-4 sm:grid-cols-4">
          {[
            ["Create", "Name it. Paste addresses. The total splits equally."],
            ["Fund", "You send the pool plus the fee. They are not the same number."],
            ["Distribute", "Each address is paid once."],
            ["Verify", "The Arc transaction is the record."],
          ].map(([t, d]) => (
            <li key={t} className="rounded-3xl border border-ink/10 bg-panel p-5">
              <h3 className="text-2xl font-bold">{t}</h3>
              <p className="mt-2 text-sm text-mute">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-20">
        <p className="text-sm text-mute">What you can run today</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {PILLS.map((pill) => (
            <span key={pill} className="rounded-full border border-ink/10 bg-panel px-4 py-2 text-sm">{pill}</span>
          ))}
        </div>
        <Link href="/distributions" className="btn-primary mt-6 inline-flex">Start on Arc testnet</Link>
      </section>
    </main>
  );
}
