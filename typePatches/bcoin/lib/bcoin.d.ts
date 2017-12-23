declare module 'bcoin' {
    interface bcoin_t {
        script: any,
        address: any,
        output: any,
        mtx: any,
        amount: any,
        keyring: any,
        coin: any,
        util: any,
        crypto: any,
        hd: any,
    }
    const bcoin: bcoin_t;
    export = bcoin;
}
