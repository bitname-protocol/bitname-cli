declare module 'bcoin' {
    // const script: any;
    const output: any;
    const mtx: any;
    const amount: any;
    const keyring: any;
    // const coin: any;
    // const util: any;
    // const crypto: any;

    class address {
        toBase58(network: string): string;
        static fromScript(script: script): address;
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
    type Amount = number;

    interface NakedCoin {
        version?: number;
        height?: number;
        value?: Amount;
        script?: script;
        coinbase?: boolean;
        hash?: Hash;
        index?: number;
    }

    class coin implements NakedCoin {
        constructor(opts: coin | NakedCoin);

        version: number;
        height: number;
        value: Amount;
        script: script;
        coinbase: boolean;
        hash: Hash;
        index: number;
    }

    type NakedScript = {
        raw: Buffer;
        code: any[];
    }

    interface SighashType {
        ALL: number;
        NONE: number;
        SINGLE: number;
        ANYONECANPAY: number;
    }

    class script {
        code: any[];
        raw: Buffer | null;
        length: number;
        static hashType: SighashType;

        constructor(code?: Buffer | any[] | object | NakedScript | null);
        static fromAddress(addr: address): script;
        static fromNulldata(data: Buffer): script;
        static fromScripthash(hash: Hash): script;
        hash160(data?: string): Hash;

        pushSym(sym: string): script;
        pushData(data: Buffer): script;
        pushInt(num: number): script;
        compile(): script;

        toRaw(): Buffer;
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
