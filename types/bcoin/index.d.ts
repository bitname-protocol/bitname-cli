declare module 'bcoin' {
    const keyring: any;

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
    type amount = number;

    interface NakedCoin {
        version?: number;
        height?: number;
        value?: amount;
        script?: script;
        coinbase?: boolean;
        hash?: Hash;
        index?: number;
    }

    class coin implements NakedCoin {
        constructor(opts: coin | NakedCoin);

        version: number;
        height: number;
        value: amount;
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

    // TODO: Define these
    type Outpoint = any;
    type Witness = any;

    interface NakedInput {
        prevout?: Outpoint;
        script?: NakedScript;
        sequence?: number;
        witness?: Witness;
    }

    class input {
        constructor(options?: NakedInput);

        script: script;
    }

    interface NakedOutput {
        value: amount;
        script: NakedScript;
    }

    class output {
        value: amount;
        script: script;
        constructor(options: NakedOutput);

        static fromScript(script: script | address, value: amount): output;
    }

    interface NakedTX {
        version?: number;
        flag?: number;
        inputs?: NakedInput[];
        outputs?: output[];
        locktime?: number;
    }

    class tx {
        constructor(options?: NakedTX);

        getVirtualSize(): number;

        static fromOptions(options: NakedTX): tx;

        toRaw(): Buffer;

        inputs: input[];
        outputs: output[];
    }

    class mtx extends tx {
        addCoin(coin: coin): input;
        addOutput(script: address | script | output | Object, value?: amount): output;
        scriptInput(index: number, coin: coin | output, ring: any): boolean; // ring should be KeyRing
        subtractFee(fee: amount, index?: number): void;
        signInput(index: number, coin: coin | output, ring: any, type: number): boolean;
        toTX(): tx;
        static fromOptions(options: NakedTX): mtx;

        addTX(tx: tx, index: number, height?: number): input;
        signature(index: number, prev: script, value: amount, privKey: Buffer, type: number, version: number): Buffer;
    }

    export {
        script,
        address,
        output,
        tx,
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
