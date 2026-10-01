"use client";

import { createClient } from "genlayer-js";
import { studioDevnet } from "genlayer-js/chains";
import { createWalletClient, custom, type WalletClient } from "viem";

export const GENLAYER_CHAIN_ID = parseInt(
  import.meta.env.VITE_GENLAYER_CHAIN_ID || "61997",
  10
);
export const GENLAYER_CHAIN_ID_HEX = `0x${GENLAYER_CHAIN_ID.toString(16).toUpperCase()}`;

export const GENLAYER_NETWORK = {
  chainId: GENLAYER_CHAIN_ID_HEX,
  chainName: import.meta.env.VITE_GENLAYER_CHAIN_NAME || "GenLayer Studio",
  nativeCurrency: {
    name: import.meta.env.VITE_GENLAYER_SYMBOL || "GEN",
    symbol: import.meta.env.VITE_GENLAYER_SYMBOL || "GEN",
    decimals: 18,
  },
  rpcUrls: [
    import.meta.env.VITE_GENLAYER_RPC_URL || "https://studio-dev.genlayer.com/api",
  ],
  blockExplorerUrls: [] as string[],
};

interface EthereumProvider {
  isMetaMask?: boolean;
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  on: (event: string, handler: (...args: any[]) => void) => void;
  removeListener: (event: string, handler: (...args: any[]) => void) => void;
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export function getStudioUrl(): string {
  return (
    import.meta.env.VITE_GENLAYER_RPC_URL || "https://studio-dev.genlayer.com/api"
  );
}

export function getContractAddress(): string {
  return import.meta.env.VITE_CONTRACT_ADDRESS || "";
}

export function isMetaMaskInstalled(): boolean {
  if (typeof window === "undefined") return false;
  return !!window.ethereum?.isMetaMask;
}

export function getEthereumProvider(): EthereumProvider | null {
  if (typeof window === "undefined") return null;
  return window.ethereum || null;
}

export async function requestAccounts(): Promise<string[]> {
  const provider = getEthereumProvider();
  if (!provider) throw new Error("MetaMask is not installed");
  try {
    return await provider.request({ method: "eth_requestAccounts" });
  } catch (error: any) {
    if (error.code === 4001) throw new Error("User rejected the connection request");
    throw new Error(`Failed to connect to MetaMask: ${error.message}`);
  }
}

export async function getAccounts(): Promise<string[]> {
  const provider = getEthereumProvider();
  if (!provider) return [];
  try {
    return await provider.request({ method: "eth_accounts" });
  } catch (error) {
    console.error("Error getting accounts:", error);
    return [];
  }
}

export async function getCurrentChainId(): Promise<string | null> {
  const provider = getEthereumProvider();
  if (!provider) return null;
  try {
    return await provider.request({ method: "eth_chainId" });
  } catch (error) {
    console.error("Error getting chain ID:", error);
    return null;
  }
}

export async function addGenLayerNetwork(): Promise<void> {
  const provider = getEthereumProvider();
  if (!provider) throw new Error("MetaMask is not installed");
  try {
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [GENLAYER_NETWORK],
    });
  } catch (error: any) {
    if (error.code === 4001) throw new Error("User rejected adding the network");
    throw new Error(`Failed to add GenLayer network: ${error.message}`);
  }
}

export async function switchToGenLayerNetwork(): Promise<void> {
  const provider = getEthereumProvider();
  if (!provider) throw new Error("MetaMask is not installed");
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: GENLAYER_CHAIN_ID_HEX }],
    });
  } catch (error: any) {
    if (error.code === 4902) await addGenLayerNetwork();
    else if (error.code === 4001) throw new Error("User rejected switching the network");
    else throw new Error(`Failed to switch network: ${error.message}`);
  }
}

export async function isOnGenLayerNetwork(): Promise<boolean> {
  const chainId = await getCurrentChainId();
  if (!chainId) return false;
  return parseInt(chainId, 16) === GENLAYER_CHAIN_ID;
}

export async function connectMetaMask(): Promise<string> {
  if (!isMetaMaskInstalled()) throw new Error("MetaMask is not installed");
  const accounts = await requestAccounts();
  if (!accounts?.length) throw new Error("No accounts found");
  if (!(await isOnGenLayerNetwork())) await switchToGenLayerNetwork();
  return accounts[0];
}

export async function switchAccount(): Promise<string> {
  const provider = getEthereumProvider();
  if (!provider) throw new Error("MetaMask is not installed");
  try {
    await provider.request({
      method: "wallet_requestPermissions",
      params: [{ eth_accounts: {} }],
    });
    const accounts = await provider.request({ method: "eth_accounts" });
    if (!accounts?.length) throw new Error("No account selected");
    return accounts[0];
  } catch (error: any) {
    if (error.code === 4001) throw new Error("User rejected account switch");
    if (error.code === -32002) throw new Error("Account switch request already pending");
    throw new Error(`Failed to switch account: ${error.message}`);
  }
}

export function createMetaMaskWalletClient(): WalletClient | null {
  const provider = getEthereumProvider();
  if (!provider) return null;
  try {
    return createWalletClient({
      chain: studioDevnet as any,
      transport: custom(provider),
    });
  } catch (error) {
    console.error("Error creating wallet client:", error);
    return null;
  }
}

/**
 * The single place in the whole app that constructs a GenLayer client.
 * DuelMarket.ts and LineCall.ts should both call this rather than
 * building their own createClient(...) config, so there is exactly one
 * source of truth for chain, endpoint, and the signing provider.
 *
 * Passing provider explicitly (not just the account address) is what
 * ties the client's write path to the actual connected MetaMask
 * transport instead of leaving it to infer one.
 */
export function createGenLayerClient(address?: string) {
  const provider = getEthereumProvider();
  const config: any = { chain: studioDevnet, endpoint: getStudioUrl() };
  if (address) {
    config.account = address as `0x${string}`;
    if (provider) {
      config.provider = provider;
    }
  }
  try {
    return createClient(config);
  } catch (error) {
    console.error("Error creating GenLayer client:", error);
    return createClient({ chain: studioDevnet, endpoint: getStudioUrl() });
  }
}

export async function getClient() {
  const accounts = await getAccounts();
  return createGenLayerClient(accounts[0]);
}


// "use client";

// import { createClient } from "genlayer-js";
// import { studioDevnet } from "genlayer-js/chains";
// import { createWalletClient, custom, type WalletClient } from "viem";

// export const GENLAYER_CHAIN_ID = parseInt(
//   import.meta.env.VITE_GENLAYER_CHAIN_ID || "61997",
//   10
// );
// export const GENLAYER_CHAIN_ID_HEX = `0x${GENLAYER_CHAIN_ID.toString(16).toUpperCase()}`;

// export const GENLAYER_NETWORK = {
//   chainId: GENLAYER_CHAIN_ID_HEX,
//   chainName: import.meta.env.VITE_GENLAYER_CHAIN_NAME || "GenLayer Studio",
//   nativeCurrency: {
//     name: import.meta.env.VITE_GENLAYER_SYMBOL || "GEN",
//     symbol: import.meta.env.VITE_GENLAYER_SYMBOL || "GEN",
//     decimals: 18,
//   },
//   rpcUrls: [
//     import.meta.env.VITE_GENLAYER_RPC_URL || "https://studio-dev.genlayer.com/api",
//   ],
//   blockExplorerUrls: [] as string[],
// };

// interface EthereumProvider {
//   isMetaMask?: boolean;
//   request: (args: { method: string; params?: any[] }) => Promise<any>;
//   on: (event: string, handler: (...args: any[]) => void) => void;
//   removeListener: (event: string, handler: (...args: any[]) => void) => void;
// }

// declare global {
//   interface Window {
//     ethereum?: EthereumProvider;
//   }
// }

// export function getStudioUrl(): string {
//   return (
//     import.meta.env.VITE_GENLAYER_RPC_URL || "https://studio-dev.genlayer.com/api"
//   );
// }

// export function getContractAddress(): string {
//   return import.meta.env.VITE_CONTRACT_ADDRESS || "";
// }

// export function isMetaMaskInstalled(): boolean {
//   if (typeof window === "undefined") return false;
//   return !!window.ethereum?.isMetaMask;
// }

// export function getEthereumProvider(): EthereumProvider | null {
//   if (typeof window === "undefined") return null;
//   return window.ethereum || null;
// }

// export async function requestAccounts(): Promise<string[]> {
//   const provider = getEthereumProvider();
//   if (!provider) throw new Error("MetaMask is not installed");
//   try {
//     return await provider.request({ method: "eth_requestAccounts" });
//   } catch (error: any) {
//     if (error.code === 4001) throw new Error("User rejected the connection request");
//     throw new Error(`Failed to connect to MetaMask: ${error.message}`);
//   }
// }

// export async function getAccounts(): Promise<string[]> {
//   const provider = getEthereumProvider();
//   if (!provider) return [];
//   try {
//     return await provider.request({ method: "eth_accounts" });
//   } catch (error) {
//     console.error("Error getting accounts:", error);
//     return [];
//   }
// }

// export async function getCurrentChainId(): Promise<string | null> {
//   const provider = getEthereumProvider();
//   if (!provider) return null;
//   try {
//     return await provider.request({ method: "eth_chainId" });
//   } catch (error) {
//     console.error("Error getting chain ID:", error);
//     return null;
//   }
// }

// export async function addGenLayerNetwork(): Promise<void> {
//   const provider = getEthereumProvider();
//   if (!provider) throw new Error("MetaMask is not installed");
//   try {
//     await provider.request({
//       method: "wallet_addEthereumChain",
//       params: [GENLAYER_NETWORK],
//     });
//   } catch (error: any) {
//     if (error.code === 4001) throw new Error("User rejected adding the network");
//     throw new Error(`Failed to add GenLayer network: ${error.message}`);
//   }
// }

// export async function switchToGenLayerNetwork(): Promise<void> {
//   const provider = getEthereumProvider();
//   if (!provider) throw new Error("MetaMask is not installed");
//   try {
//     await provider.request({
//       method: "wallet_switchEthereumChain",
//       params: [{ chainId: GENLAYER_CHAIN_ID_HEX }],
//     });
//   } catch (error: any) {
//     if (error.code === 4902) await addGenLayerNetwork();
//     else if (error.code === 4001) throw new Error("User rejected switching the network");
//     else throw new Error(`Failed to switch network: ${error.message}`);
//   }
// }

// export async function isOnGenLayerNetwork(): Promise<boolean> {
//   const chainId = await getCurrentChainId();
//   if (!chainId) return false;
//   return parseInt(chainId, 16) === GENLAYER_CHAIN_ID;
// }

// export async function connectMetaMask(): Promise<string> {
//   if (!isMetaMaskInstalled()) throw new Error("MetaMask is not installed");
//   const accounts = await requestAccounts();
//   if (!accounts?.length) throw new Error("No accounts found");
//   if (!(await isOnGenLayerNetwork())) await switchToGenLayerNetwork();
//   return accounts[0];
// }

// export async function switchAccount(): Promise<string> {
//   const provider = getEthereumProvider();
//   if (!provider) throw new Error("MetaMask is not installed");
//   try {
//     await provider.request({
//       method: "wallet_requestPermissions",
//       params: [{ eth_accounts: {} }],
//     });
//     const accounts = await provider.request({ method: "eth_accounts" });
//     if (!accounts?.length) throw new Error("No account selected");
//     return accounts[0];
//   } catch (error: any) {
//     if (error.code === 4001) throw new Error("User rejected account switch");
//     if (error.code === -32002) throw new Error("Account switch request already pending");
//     throw new Error(`Failed to switch account: ${error.message}`);
//   }
// }

// export function createMetaMaskWalletClient(): WalletClient | null {
//   const provider = getEthereumProvider();
//   if (!provider) return null;
//   try {
//     return createWalletClient({
//       chain: studioDevnet as any,
//       transport: custom(provider),
//     });
//   } catch (error) {
//     console.error("Error creating wallet client:", error);
//     return null;
//   }
// }

// export function createGenLayerClient(address?: string) {
//   const config: any = { chain: studioDevnet, endpoint: getStudioUrl() };
//   if (address) config.account = address as `0x${string}`;
//   try {
//     return createClient(config);
//   } catch (error) {
//     console.error("Error creating GenLayer client:", error);
//     return createClient({ chain: studioDevnet, endpoint: getStudioUrl() });
//   }
// }


// export async function getClient() {
//   const accounts = await getAccounts();
//   return createGenLayerClient(accounts[0]);
// }