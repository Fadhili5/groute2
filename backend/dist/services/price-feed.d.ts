export declare function getTokenPrice(symbol: string): Promise<number | null>;
export declare function getTokenPrices(symbols: string[]): Promise<Record<string, number | null>>;
export declare function getCachedPrices(): Record<string, {
    price: number;
    age: number;
}>;
//# sourceMappingURL=price-feed.d.ts.map