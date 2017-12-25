declare module 'bcoin' {
    const script: any;
    const output: any;
    const mtx: any;
    const amount: any;
    const keyring: any;
    // const coin: any;
    // const util: any;
    // const crypto: any;

    class address {
        toBase58(network: string): string;
        static fromScript(script: string): address;
    }

    class hd {
        static fromSeed(data: Buffer, network: string): hd;
        derivePath(path: string): hd;
    }

    class util {
        static revHex<T extends Hash>(hex: T): T;
    }

    class crypto {
        static sha256(data: Buffer): Buffer;
    }

    type Hash = Buffer | string;

    interface NakedCoin {
        version?: number;
        height?: number;
        value?: number; // Should be Amount
        script?: any;
        coinbase?: boolean;
        hash?: Hash;
        index?: number;
    }

    class coin implements NakedCoin {
        constructor(opts: coin | NakedCoin);

        version: number;
        height: number;
        value: number; // Should be Amount
        script: any;
        coinbase: boolean;
        hash: Hash;
        index: number;
    }

    export {
        script,
        address,
        output,
        mtx,
        amount,
        keyring,
        coin,
        util,
        crypto,
        hd,
    };

    // export {address} from './address';
}
