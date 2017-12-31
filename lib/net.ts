import {
    script as Script,
    coin as Coin,
    address as Address,
    util,
    tx as TX,
} from 'bcoin';

import CustomSet from './CustomSet';

const revHex = util.revHex;

import fetch from 'node-fetch';

import { config } from '../config';
const NETWORK = config.network;

import { fetchUnspentTX, fetchAllTX } from './netUtils';

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

    const data = await fetchUnspentTX(addr);

    // console.log(data);

    const txs = data.txrefs;

    if (typeof txs === 'undefined') {
        throw new Error(`No unspent txs found for ${addr}`);
    }

    const addrString = addr.toBase58(NETWORK);

    txs.sort((a: number, b: number) => {
        return a - b;
    });

    let totalVal = 0;

    const set = new CustomSet();

    for (const tx of txs) {
        if (set.has(tx.tx_hash)) {
            console.log('Duplicate tx hash found', tx.tx_hash);
            continue;
        }
        set.add(tx.tx_hash);

        const coinOpts = {
            version: 1,
            height: -1,
            value: tx.value,
            script: Script.fromRaw(tx.script, 'hex'),
            hash: revHex(tx.tx_hash),
            index: tx.tx_output_n,
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

async function getAllTX(addr: Address): Promise<[TX[], boolean[][]]> {
    const txData = await fetchAllTX(addr);

    const txs: TX[] = txData.map((tx) => TX.fromRaw(Buffer.from(tx.hex, 'hex')));

    const outputsSpent: boolean[][] = txData.map((tx) => {
        return tx.outputs.map((out: object) => out.hasOwnProperty('spent_by'));
    });

    return [txs, outputsSpent];
}

export {
    getFeesSatoshiPerKB,
    fundTx,
    getAllTX,
};
