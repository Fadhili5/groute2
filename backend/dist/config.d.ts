import "dotenv/config";
export declare const config: {
    port: number;
    nodeEnv: string;
    redis: {
        url: string;
    };
    database: {
        url: string;
    };
    rpc: {
        ethereum: string;
        arbitrum: string;
        base: string;
        solana: string;
        avalanche: string;
        bnb: string;
    };
    contracts: {
        intentRouter: string;
        fragmentVault: string;
        routeRegistry: string;
        settlementVerifier: string;
    };
    zerog: {
        computeEndpoint: string;
        storageEndpoint: string;
        daEndpoint: string;
    };
};
//# sourceMappingURL=config.d.ts.map