declare module 'bcoin' {
    class address {
        toBase58(network: string): string;
        static fromBase58(address: string): address;
        static fromScript(script: script): address;
        static fromPubkeyhash(hash: Buffer, network?: string): address;
        static fromScripthash(hash: Buffer, network?: string): address;
    }

    class hd {
        static fromSeed(data: Buffer, network: string): hd;
        derivePath(path: string): hd;
    }

    class util {
        static revHex<T extends Hash>(hex: T): T;
    }

    interface AddrResult {
        hrp: string,
        version: number,
        hash: Buffer;
    }

    class bech32 {
        decode(str: string): AddrResult;
        encode(hrp: string, version: number, data: Buffer): string;
    }

    class utils {
        static bech32: bech32;
    }

    class secp256k1 {
        publicKeyVerify(key: Buffer): boolean;
    }

    class scrypt {
        derive(key: Buffer, salt: Buffer, N: number, r: number, p: number, len: number): Buffer;
        deriveAsync(key: Buffer, salt: Buffer, N: number, r: number, p: number, len: number): Promise<Buffer>;
    }

    class crypto {
        static sha256(data: Buffer): Buffer;
        static hash256(data: Buffer): Buffer;
        static hash160(data: Buffer): Buffer;
        static secp256k1: secp256k1;
        static scrypt: scrypt;
    }

    type Hash = Buffer | string;
    type Amount = number;

    class amount {
        constructor(value: string | number, unit?: string, num?: boolean);

        static fromBTC(value: number | string, num?: boolean): amount;

        toSatoshis(num?: boolean): string | Amount;
    }

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

        public static fromTX(tx: tx, index: number, height: number): coin;
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

    interface IScriptCode {
        value: number,
        data: Buffer,
    }

    class script {
        code: IScriptCode[];
        raw: Buffer | null;
        length: number;
        static hashType: SighashType;

        constructor(code?: Buffer | any[] | object | NakedScript | null);
        static fromAddress(addr: address): script;
        static fromNulldata(data: Buffer): script;
        static fromScripthash(hash: Hash): script;
        static fromRaw(data: Buffer | string, enc?: string): script;
        static fromMultisig(m: number, n: number, keys: Buffer[]): script;
        hash160(data?: string): Hash;

        pushSym(sym: string): script;
        pushData(data: Buffer): script;
        pushInt(num: number): script;
        insertData(index: number, data: Buffer): script;
        compile(): script;

        toRaw(): Buffer;
        isNulldata(minimal?: boolean): boolean;
        isScripthash(minimal?: boolean): boolean;
        isPubkeyhash(minimal?: boolean): boolean;

        insertData(index: number, data: Buffer): script;
        remove(index: number): IScriptCode;
        toASM(decode?: boolean): string;
        getAddress(): address | null;
    }

    // TODO: Define these
    type Witness = any;

    class outpoint {
        constructor(hash?: Hash, index?: number);

        public hash: Hash;
        public index: number;
    }

    interface NakedInput {
        prevout?: outpoint;
        script?: NakedScript;
        sequence?: number;
        witness?: Witness;
    }

    class input {
        constructor(options?: NakedInput);
        static fromTX(tx: tx, index: number): input;

        script: script;
        prevout: outpoint;
    }

    interface NakedOutput {
        value: Amount;
        script: NakedScript;
    }

    class output {
        value: Amount;
        script: script;
        constructor(options: NakedOutput);

        static fromScript(script: script | address, value: Amount): output;

        getAddress(): address;
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
        static fromRaw(data: Buffer | string, enc?: string): tx;

        toRaw(): Buffer;

        hash(enc?: string): Hash;
        txid(): Hash;

        inputs: input[];
        outputs: output[];
    }

    class mtx extends tx {
        static fromRaw(data: Buffer | string, enc?: string): mtx;
        addCoin(coin: coin): input;
        addOutput(script: address | script | output | Object, value?: Amount): output;
        scriptInput(index: number, coin: coin | output, ring: keyring): boolean;
        subtractFee(fee: Amount): void;
        subtractIndex(index: number, fee: Amount): void;
        signInput(index: number, coin: coin | output, ring: keyring, type: number): boolean;
        toTX(): tx;
        static fromOptions(options: NakedTX): mtx;

        addTX(tx: tx, index: number, height?: number): input;
        signature(index: number, prev: script, value: Amount, privKey: Buffer, type: number, version: number): Buffer;
        setSequence(index: number, locktime: number, seconds?: boolean): void;
        setLocktime(locktime: number): void;
    }

    interface KeyRingOpts {
    }

    type Base58String = string;

    class keyring {
        public network: string;
        static fromOptions(options: KeyRingOpts | hd, network: string): keyring;

        getAddress(): address;
        toSecret(network?: string): Base58String;
        getPrivateKey(enc?: string): Buffer;
        getPublicKey(enc?: string): Buffer;

        static fromSecret(secret: Base58String): keyring;
        static generate(network?: string): keyring;
    }

    export {
        script,
        address,
        input,
        output,
        tx,
        mtx,
        Amount,
        amount,
        keyring,
        coin,
        util,
        crypto,
        hd,
        utils,
    };

    // export {address} from './address';
}
