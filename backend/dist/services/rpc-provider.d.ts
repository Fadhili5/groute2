import { ethers } from "ethers";
export declare function getProvider(chain: string): ethers.JsonRpcProvider | null;
export declare function checkProviderHealth(chain: string): Promise<boolean>;
export declare function getBlockNumber(chain: string): Promise<number | null>;
export declare function getGasPrice(chain: string): Promise<bigint | null>;
export declare function getHealthStatus(chain: string): boolean;
//# sourceMappingURL=rpc-provider.d.ts.map