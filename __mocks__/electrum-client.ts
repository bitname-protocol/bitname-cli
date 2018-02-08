class ElectrumClient {
    constructor(port: number, host: string, protocol: string, options?: any) {
        return;
    }

    public async connect() {
        return;
    }

    public async close() {
        return;
    }

    public async server_version(clientName: string, protocolVer: string) {
        return ['ElectrumX 1.0.18', '1.1'];
    }

    public async blockchainEstimatefee(num: number) {
        return 0.00000100;
    }

    public async blockchainHeaders_subscribe() {
        return {
            block_height: 1280175,
            version: 536870912,
            prev_block_hash: '0000000000002e946a704c8b5dc7d6f8479fda2a254f765e6bda2ea889d529b0',
            merkle_root: '612fe23f3ae51b8ffcf59b92ea36f28371dd0718c7b0691537864ae200aaf948',
            timestamp: 1518082219,
            bits: 486604799,
            nonce: 532817604,
        };
    }
}

export = ElectrumClient;
