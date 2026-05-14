import { ethers } from "ethers";
import { config } from "../config.js";
const providers = new Map();
const healthStatus = new Map();
export function getProvider(chain) {
    const rpcUrl = config.rpc[chain];
    if (!rpcUrl)
        return null;
    if (!providers.has(chain)) {
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        providers.set(chain, provider);
        healthStatus.set(chain, true);
    }
    return providers.get(chain);
}
export async function checkProviderHealth(chain) {
    try {
        const provider = getProvider(chain);
        if (!provider)
            return false;
        await provider.getBlockNumber();
        healthStatus.set(chain, true);
        return true;
    }
    catch {
        healthStatus.set(chain, false);
        return false;
    }
}
export async function getBlockNumber(chain) {
    try {
        const provider = getProvider(chain);
        if (!provider)
            return null;
        return await provider.getBlockNumber();
    }
    catch {
        return null;
    }
}
export async function getGasPrice(chain) {
    try {
        const provider = getProvider(chain);
        if (!provider)
            return null;
        return await provider.getFeeData().then((f) => f.gasPrice ?? null);
    }
    catch {
        return null;
    }
}
export function getHealthStatus(chain) {
    return healthStatus.get(chain) ?? false;
}
//# sourceMappingURL=rpc-provider.js.map