import { getAddress, isAddress, zeroAddress } from "viem";

export const IPIN_TESTNET = "0x6956dB4D60961F51E786a82dB1e5b3DE2608d222" as const;

export function ipinAddress() {
  const raw = process.env.NEXT_PUBLIC_IPIN_ADDRESS || IPIN_TESTNET;
  if (!raw || !isAddress(raw) || getAddress(raw) === zeroAddress) return undefined;
  return getAddress(raw);
}
