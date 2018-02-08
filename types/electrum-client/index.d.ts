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

    class ElectrumClient {
        constructor(port: number, host: string, protocol: string, options?: any);

        public blockchainHeaders_subscribe(): Promise<header>;
        public blockchainEstimatefee(num: number): Promise<number>;

        public connect(): Promise<void>;
        public close(): Promise<void>;

        public server_version(client_name: string, protocol_ver: string): Promise<[string, string]>;
    }

    export = ElectrumClient;
}
