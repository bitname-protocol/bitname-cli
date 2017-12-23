declare module 'bcoin' {
    const script: any;
    const output: any;
    const mtx: any;
    const amount: any;
    const keyring: any;
    const coin: any;
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
