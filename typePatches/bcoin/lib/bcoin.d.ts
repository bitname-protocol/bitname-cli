declare module 'bcoin' {
    const script: any;
    const output: any;
    const mtx: any;
    const amount: any;
    const keyring: any;
    const coin: any;
    const util: any;
    const crypto: any;
    const hd: any;

    class address {
        toBase58(string): string;
        static fromScript(string): address;
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
