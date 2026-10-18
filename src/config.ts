/**
 * wagmi configuration
 * Built with Arc Studio — https://studio.arc.io
 */

import { http, createConfig } from 'wagmi'
import { mainnet } from 'wagmi/chains'
import { arcTestnet } from 'viem/chains'
import { injected } from 'wagmi/connectors'
import { registerChain } from './tracing'

// Pre-register chain RPC URLs so trace events show correct chain names immediately
registerChain(arcTestnet.id, arcTestnet.rpcUrls.default.http[0])

export const config = createConfig({
  chains: [arcTestnet, mainnet],
  connectors: [
    // Directly grabs window.ethereum — picks up Rabby, MetaMask, and any
    // other injected extension without relying on ConnectKit's chain registry.
    injected({ shimDisconnect: true }),
  ],
  transports: {
    [arcTestnet.id]: http(),
    [mainnet.id]: http(),
  },
})
