/**
 * wagmi configuration
 * Built with Arc Studio — https://studio.arc.io
 */

import { http, fallback, createConfig } from 'wagmi'
import { mainnet } from 'wagmi/chains'
import { arc } from 'viem/chains'
import { injected } from 'wagmi/connectors'
import { registerChain } from './tracing'

// Pre-register chain RPC URLs so trace events show correct chain names immediately
registerChain(arc.id, arc.rpcUrls.default.http[0])

// Arc Mainnet only exposes HTTP RPCs — no WebSocket in viem/chains
const arcRpcs = arc.rpcUrls.default.http

export const config = createConfig({
  chains: [arc, mainnet],
  connectors: [
    // Directly grabs window.ethereum — picks up Rabby, MetaMask, and any
    // other injected extension without relying on ConnectKit's chain registry.
    injected({ shimDisconnect: true }),
  ],
  transports: {
    [arc.id]: fallback([...arcRpcs.map(url => http(url))]),
    [mainnet.id]: http(),
  },
})
