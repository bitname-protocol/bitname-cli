declare module 'electrum-client' {
    type header = {
        block_height: number,
        version: number,
        prev_block_hash: string,
        merkle_root: string,
        timestamp: number,
        bits: number,
        nonce: number,
    }

    type utxo = {
        tx_pos: number,
        value: number,
        tx_hash: string,
        height: number
    }

    class ElectrumClient {
        constructor(port: number, host: string, protocol: string, options?: any);

        public blockchainHeaders_subscribe(): Promise<header>;
        public blockchainEstimatefee(num: number): Promise<number>;
        public blockchainAddress_listunspent(address: string): Promise<utxo[]>;
        public blockchainTransaction_get(tx_hash: string, height?: number): Promise<string>;

        public connect(): Promise<void>;
        public close(): Promise<void>;

        public server_version(client_name: string, protocol_ver: string): Promise<[string, string]>;
    }

    export = ElectrumClient;
}
