/**
 * wagmi configuration
 * Built with Arc Studio — https://studio.arc.io
 */

import { http, fallback, createConfig, webSocket } from 'wagmi'
import { mainnet } from 'wagmi/chains'
import { arcTestnet } from 'viem/chains'
import { injected } from 'wagmi/connectors'
import { registerChain } from './tracing'

// Pre-register chain RPC URLs so trace events show correct chain names immediately
registerChain(arcTestnet.id, arcTestnet.rpcUrls.default.http[0])

// All Arc Testnet RPC endpoints — wagmi tries each in order on failure
const arcRpcs = arcTestnet.rpcUrls.default.http
const arcWsRpcs = arcTestnet.rpcUrls.default.webSocket ?? []

export const config = createConfig({
  chains: [arcTestnet, mainnet],
  connectors: [
    // Directly grabs window.ethereum — picks up Rabby, MetaMask, and any
    // other injected extension without relying on ConnectKit's chain registry.
    injected({ shimDisconnect: true }),
  ],
  transports: {
    // WebSocket first for instant receipt events; HTTP fallbacks for environments
    // where WS is blocked (some mobile browsers / firewalls)
    [arcTestnet.id]: fallback([
      ...(arcWsRpcs.length > 0 ? [webSocket(arcWsRpcs[0])] : []),
      ...arcRpcs.map(url => http(url)),
    ]),
    [mainnet.id]: http(),
  },
})
