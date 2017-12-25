import {
    script as Script,
    coin as Coin,
    address as Address,
    util,
} from 'bcoin';

const revHex = util.revHex;

import fetch from 'node-fetch';

import { config } from '../config';
const NETWORK = config.network;

async function getFeesSatoshiPerKB() {
    let netSuffix = 'main';
    if (NETWORK === 'testnet') {
        netSuffix = 'test3';
    }
    const url = `https://api.blockcypher.com/v1/btc/${netSuffix}`;

    const resp = await fetch(url);
    const data = await resp.json();

    return data.medium_fee_per_kb;
}

async function fundTx(addr: Address, target: number): Promise<Coin[]> {
    const coins: Coin[] = [];

    const url = `https://testnet-api.smartbit.com.au/v1/blockchain/address/${addr}/unspent?limit=1000`;

    const resp = await fetch(url);
    const data = await resp.json();

    const txs = data.unspent;

    if (typeof txs === 'undefined') {
        throw new Error(`No unspent txs found for ${addr}`);
    }

    const addrString = addr.toBase58(NETWORK);

    txs.sort((a: number, b: number) => {
        return a - b;
    });

    let totalVal = 0;

    for (const tx of txs) {
        const coinOpts = {
            version: 1,
            height: -1,
            value: tx.value_int,
            script: Script.fromAddress(addr),
            hash: revHex(tx.txid),
            index: tx.n,
        };

        coins.push(new Coin(coinOpts));

        totalVal += coinOpts.value;

        if (totalVal >= target) {
            break;
        }
    }

    return coins;
}

export { getFeesSatoshiPerKB, fundTx };