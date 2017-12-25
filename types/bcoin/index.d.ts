declare module 'bcoin' {
    const script: any;
    const output: any;
    const mtx: any;
    const amount: any;
    const keyring: any;
    // const coin: any;
    const util: any;
    // const crypto: any;

    class address {
        toBase58(network: string): string;
        static fromScript(script: string): address;
    }

    class hd {
        static fromSeed(data: Buffer, network: string): hd;
        derivePath(path: string): hd;
    }

    class crypto {
        static sha256(data: Buffer): Buffer;
    }

    interface CoinOpts {
        version: number;
        height: number;
        value: number;
        script: any;
        hash: Buffer;
        index: number;
    }

    class coin implements CoinOpts {
        constructor(opts: CoinOpts);

        version: number;
        height: number;
        value: number;
        script: any;
        hash: Buffer;
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
