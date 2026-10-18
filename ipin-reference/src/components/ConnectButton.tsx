"use client";

import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { ARC_TESTNET_ID } from "@/lib/chain";
import { shortAddr } from "@/lib/format";

export function ConnectButton({ className = "" }: { className?: string }) {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();

  if (isConnected && chainId !== ARC_TESTNET_ID) {
    return (
      <button
        type="button"
        className={`btn-primary ${className}`}
        onClick={() => switchChain({ chainId: ARC_TESTNET_ID })}
      >
        Switch to Arc testnet
      </button>
    );
  }

  if (isConnected && address) {
    return (
      <button type="button" className={`btn-ghost font-mono text-sm ${className}`} onClick={() => disconnect()}>
        {shortAddr(address)}
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`btn-primary ${className}`}
      disabled={isPending}
      onClick={() => connect({ connector: connectors[0] })}
    >
      {isPending ? "Opening wallet…" : "Connect wallet"}
    </button>
  );
}
