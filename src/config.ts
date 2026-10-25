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

const arcRpcs = arc.rpcUrls.default.http

export const config = createConfig({
  chains: [arc, mainnet],
  connectors: [
    injected({ shimDisconnect: true }),
  ],
  transports: {
    [arc.id]: fallback([...arcRpcs.map(url => http(url))]),
    [mainnet.id]: http(),
  },
})
