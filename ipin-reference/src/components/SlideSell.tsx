"use client";

import { useRef, useState } from "react";

export function SlideSell({ disabled, onSell }: { disabled?: boolean; onSell: () => void }) {
  const track = useRef<HTMLDivElement>(null);
  const [x, setX] = useState(0);
  const dragging = useRef(false);

  function move(clientX: number) {
    const box = track.current?.getBoundingClientRect();
    if (!box) return;
    const next = Math.min(Math.max(clientX - box.left - 28, 0), box.width - 56);
    setX(next);
    if (next > box.width - 72) {
      dragging.current = false;
      setX(0);
      onSell();
    }
  }

  return (
    <div
      ref={track}
      className="relative h-14 overflow-hidden rounded-full bg-laterite md:hidden"
      onPointerDown={(e) => {
        if (disabled) return;
        dragging.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (dragging.current) move(e.clientX);
      }}
      onPointerUp={() => {
        dragging.current = false;
        setX(0);
      }}
    >
      <span className="pointer-events-none absolute inset-0 grid place-items-center text-sm font-semibold text-paper">Slide to sell</span>
      <span className="absolute top-1 grid h-12 w-12 place-items-center rounded-full bg-paper text-laterite" style={{ left: 4 + x }}>
        →
      </span>
    </div>
  );
}
