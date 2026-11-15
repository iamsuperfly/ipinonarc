/**
 * wagmi configuration
 */

import { http, fallback, createConfig } from 'wagmi'
import { mainnet } from 'wagmi/chains'
import { arc } from 'viem/chains'
import { injected } from 'wagmi/connectors'

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
