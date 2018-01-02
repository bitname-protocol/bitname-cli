import {
    script as Script,
    coin as Coin,
    address as Address,
    util,
    tx as TX,
} from 'bcoin';

import CustomSet from './CustomSet';
import TXList from './TXList';

const revHex = util.revHex;

import fetch from 'node-fetch';

import { config } from '../config';
const NETWORK = config.network;

import { fetchUnspentTX, fetchAllTX, fetchMetadata, fetchTX } from './netUtils';

async function getFeesSatoshiPerKB(): Promise<number> {
    const data = await fetchMetadata();

    return data.medium_fee_per_kb;
}

async function getBlockHeight() {
    const data = await fetchMetadata();

    return data.height;
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

async function getAllTX(addr: Address): Promise<TXList> {
    const txData = await fetchAllTX(addr);

    const confirmedOnly = txData.filter((data) => data.block_height > 0);

    const txs: TX[] = confirmedOnly.map((tx) => TX.fromRaw(Buffer.from(tx.hex, 'hex')));

    const outputsSpent: boolean[][] = confirmedOnly.map((tx) => {
        return tx.outputs.map((out: object) => out.hasOwnProperty('spent_by'));
    });

    const heights: number[] = confirmedOnly.map((tx) => tx.block_height);

    return new TXList(txs, outputsSpent, heights);
}

async function getTX(txid: string): Promise<TX> {
    const txData = await fetchTX(txid);

    const hex = txData.hex;

    return TX.fromRaw(Buffer.from(hex, 'hex'));
}

export {
    getFeesSatoshiPerKB,
    getBlockHeight,
    fundTx,
    getAllTX,
    getTX,
};
