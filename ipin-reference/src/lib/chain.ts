import { defineChain } from "viem";
import { arbitrumSepolia, avalancheFuji, baseSepolia, optimismSepolia, polygonAmoy, sepolia } from "viem/chains";

export const ARC_TESTNET_ID = 5042002;

export const arcTestnet = defineChain({
  id: ARC_TESTNET_ID,
  name: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.testnet.arc.network"] },
  },
  blockExplorers: {
    default: { name: "Arcscan", url: "https://testnet.arcscan.app" },
  },
});

export { arbitrumSepolia, avalancheFuji, baseSepolia, optimismSepolia, polygonAmoy, sepolia };

export const USDC = "0x3600000000000000000000000000000000000000" as const;
export const EURC = "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a" as const;
export const EXPLORER = "https://testnet.arcscan.app";
export const FAUCET = "https://faucet.circle.com";
export const RPC = "https://rpc.testnet.arc.network";
export const DEPLOYER = "0xc28ad0564edf25b517fae206a84063b5a0b2489a" as const;

export function explorerAddress(addr: string) {
  return `${EXPLORER}/address/${addr}`;
}

export function explorerTx(hash: string) {
  return `${EXPLORER}/tx/${hash}`;
}
