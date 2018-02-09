import {
    tx as TX,
} from 'bcoin';

interface IUtxo {
    tx_pos: number;
    value: number;
    tx_hash: string;
    height: number;
}

// tslint:disable-next-line:no-var-requires
const unspentTxs: {[hash: string]: string} = require('./unspent_txs.json');
// tslint:disable-next-line:no-var-requires
const unspentShort: {[addr: string]: IUtxo[]} = require('./unspent.json');

const broadcast = jest.fn().mockImplementation(async (rawtx: string) => {
    try {
        const tx = TX.fromRaw(rawtx, 'hex');

        if (tx.txid() === 'd21633ba23f70118185227be58a63527675641ad37967e2aa461559f577aec43') {
            throw new Error('blank tx');
        }

        return tx.txid();
    } catch (e) {
        throw {
            message: 'the transaction was rejected by network rules.\n\nTX decode failed\n[69]',
            code: -1,
        };
    }
});

class ElectrumClient {
    // tslint:disable-next-line:variable-name
    public blockchainTransaction_broadcast = broadcast;

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

    public async blockchainAddress_listunspent(address: string): Promise<IUtxo[]> {
        if (!(address in unspentShort)) {
            return [];
        }

        return unspentShort[address];
    }
    public async blockchainTransaction_get(txHash: string, height?: number): Promise<string> {
        if (!(txHash in unspentTxs)) {
            throw {
                // tslint:disable-next-line:max-line-length
                message: 'daemon error: {\'code\': -5, \'message\': \'No such mempool or blockchain transaction. Use gettransaction for wallet transactions.\'}',
                code: -1,
            };
        }

        return unspentTxs[txHash];
    }
}

export = ElectrumClient;
