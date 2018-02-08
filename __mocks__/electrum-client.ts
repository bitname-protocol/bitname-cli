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
}

export = ElectrumClient;
