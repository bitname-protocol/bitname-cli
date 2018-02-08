declare module 'electrum-client' {
    class ElectrumClient {
        constructor(port: number, host: string, protocol: string, options?: any);

        public blockchainHeaders_subscribe(): any;
        public blockchainEstimatefee(num: number): Promise<number>;

        public connect(): Promise<void>;
        public close(): Promise<void>;

        public server_version(client_name: string, protocol_ver: string): Promise<[string, string]>;
    }

    export = ElectrumClient;
}
