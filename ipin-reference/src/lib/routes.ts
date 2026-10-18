import type { Address } from "viem";
import { arbitrumSepolia, avalancheFuji, baseSepolia, optimismSepolia, polygonAmoy, sepolia } from "@/lib/chain";

export const TOKEN_MESSENGER = "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA" as const;

export const SELL_ROUTES = [
  { id: "eth", name: "Ethereum", domain: 0, chain: sepolia, usdc: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238" as Address },
  { id: "base", name: "Base", domain: 6, chain: baseSepolia, usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as Address },
  { id: "arb", name: "Arbitrum", domain: 3, chain: arbitrumSepolia, usdc: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d" as Address },
  { id: "op", name: "Optimism", domain: 2, chain: optimismSepolia, usdc: "0x5fd84259d66Cd46123540766Be93DFE6D43130D7" as Address },
  { id: "polygon", name: "Polygon", domain: 7, chain: polygonAmoy, usdc: "0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582" as Address },
  { id: "avax", name: "Avalanche", domain: 1, chain: avalancheFuji, usdc: "0x5425890298aed601595a70AB815c96711a31Bc65" as Address },
] as const;

export type SellRouteId = (typeof SELL_ROUTES)[number]["id"];
