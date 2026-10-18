import { encodeFunctionData, pad, type Address, type Hex } from "viem";

export const CCTP_DOMAIN_ARC = 26;
export const CCTP_DOMAIN_SEPOLIA = 0;
export const CCTP_DOMAIN_BASE_SEPOLIA = 6;

export const TOKEN_MESSENGER = "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA" as const;
export const MESSAGE_TRANSMITTER = "0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275" as const;

export const USDC_SEPOLIA = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238" as const;
export const USDC_BASE_SEPOLIA = "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as const;

export const IRIS = "https://iris-api-sandbox.circle.com";

export const tokenMessengerAbi = [
  {
    type: "function",
    name: "depositForBurn",
    stateMutability: "nonpayable",
    inputs: [
      { name: "amount", type: "uint256" },
      { name: "destinationDomain", type: "uint32" },
      { name: "mintRecipient", type: "bytes32" },
      { name: "burnToken", type: "address" },
      { name: "destinationCaller", type: "bytes32" },
      { name: "maxFee", type: "uint256" },
      { name: "minFinalityThreshold", type: "uint32" },
    ],
    outputs: [{ name: "nonce", type: "uint64" }],
  },
] as const;

export const messageTransmitterAbi = [
  {
    type: "function",
    name: "receiveMessage",
    stateMutability: "nonpayable",
    inputs: [
      { name: "message", type: "bytes" },
      { name: "attestation", type: "bytes" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const;

export function toBytes32Address(addr: Address): Hex {
  return pad(addr, { size: 32 });
}

export function burnCalldata(args: {
  amount: bigint;
  mintRecipient: Address;
  burnToken: Address;
}) {
  return encodeFunctionData({
    abi: tokenMessengerAbi,
    functionName: "depositForBurn",
    args: [
      args.amount,
      CCTP_DOMAIN_ARC,
      toBytes32Address(args.mintRecipient),
      args.burnToken,
      toBytes32Address("0x0000000000000000000000000000000000000000"),
      0n,
      2000,
    ],
  });
}

export type IrisMessage = {
  message?: string;
  attestation?: string;
  status?: string;
};

export async function fetchAttestation(sourceDomain: number, txHash: string): Promise<IrisMessage | null> {
  const url = `${IRIS}/v2/messages/${sourceDomain}?transactionHash=${txHash}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const json = (await res.json()) as { messages?: IrisMessage[] };
  return json.messages?.[0] ?? null;
}
