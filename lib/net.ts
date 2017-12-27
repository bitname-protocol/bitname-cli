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

import { fetchUnspentTX } from './netUtils';

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

// async function fundTx(addr: Address, target: number): Promise<Coin[]> {
//     const coins: Coin[] = [];

//     let netSuffix = 'main';
//     if (NETWORK === 'testnet') {
//         netSuffix = 'test3';
//     }

//     const url = `https://api.blockcypher.com/v1/btc/${netSuffix}/addrs/${addr}?unspentOnly=true`;

//     const resp = await fetch(url);
//     const data = await resp.json();

//     const txs = data.txrefs;
// }

async function fundTx(addr: Address, target: number): Promise<Coin[]> {
    const coins: Coin[] = [];

    const data = await fetchUnspentTX(addr);

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

    if (totalVal < target) {
        throw new Error('Insufficient funds available');
    }

    return coins;
}

export { getFeesSatoshiPerKB, fundTx };
