import { http, createConfig } from "wagmi";
import { injected } from "wagmi/connectors";
import { arcTestnet, arbitrumSepolia, avalancheFuji, baseSepolia, optimismSepolia, polygonAmoy, sepolia } from "./chain";

export const config = createConfig({
  chains: [arcTestnet, baseSepolia, sepolia, arbitrumSepolia, optimismSepolia, polygonAmoy, avalancheFuji],
  connectors: [injected()],
  transports: {
    [arcTestnet.id]: http(arcTestnet.rpcUrls.default.http[0]),
    [baseSepolia.id]: http(),
    [sepolia.id]: http(),
    [arbitrumSepolia.id]: http(),
    [optimismSepolia.id]: http(),
    [polygonAmoy.id]: http(),
    [avalancheFuji.id]: http(),
  },
  ssr: true,
});
