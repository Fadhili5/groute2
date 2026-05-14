import { ethers } from "ethers";
import { config } from "../config.js";

type ChainName = keyof typeof config.rpc;

const providers = new Map<string, ethers.JsonRpcProvider>();
const healthStatus = new Map<string, boolean>();

export function getProvider(chain: string): ethers.JsonRpcProvider | null {
  const rpcUrl = (config.rpc as any)[chain];
  if (!rpcUrl) return null;
  if (!providers.has(chain)) {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    providers.set(chain, provider);
    healthStatus.set(chain, true);
  }
  return providers.get(chain)!;
}

export async function checkProviderHealth(chain: string): Promise<boolean> {
  try {
    const provider = getProvider(chain);
    if (!provider) return false;
    await provider.getBlockNumber();
    healthStatus.set(chain, true);
    return true;
  } catch {
    healthStatus.set(chain, false);
    return false;
  }
}

export async function getBlockNumber(chain: string): Promise<number | null> {
  try {
    const provider = getProvider(chain);
    if (!provider) return null;
    return await provider.getBlockNumber();
  } catch {
    return null;
  }
}

export async function getGasPrice(chain: string): Promise<bigint | null> {
  try {
    const provider = getProvider(chain);
    if (!provider) return null;
    return await provider.getFeeData().then((f) => f.gasPrice ?? null);
  } catch {
    return null;
  }
}

export function getHealthStatus(chain: string): boolean {
  return healthStatus.get(chain) ?? false;
}
