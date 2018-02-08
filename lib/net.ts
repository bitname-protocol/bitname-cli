import {
    script as Script,
    coin as Coin,
    address as Address,
    util,
    tx as TX,
    amount as Amount,
} from 'bcoin';

import ElectrumClient = require('electrum-client');

import CustomSet from './CustomSet';
import TXList from './TXList';

const revHex = util.revHex;

import { fetchUnspentTX, fetchAllTX, fetchMetadata, fetchTX, fetchPostTX } from './netUtils';

function selectServer(network: string): [string, number] {
    if (network === 'testnet') {
        return ['testnet.qtornado.com', 51002];
    } else if (network === 'main') {
        return ['bitcoins.sk', 50002];
    } else {
        throw new Error(`Unknown network '${network}'`);
    }
}

/**
 * Get the estimated fee to have a transaction confirmed in 2 blocks in sat/kb
 * @param network The network from which to get info. Currently either 'main' or 'testnet'
 * @returns The estimated fee in sat/kb
 */
async function getFeesSatoshiPerKB(network: string): Promise<number> {
    const [server, port] = selectServer(network);

    const ecl = new ElectrumClient(port, server, 'tls');
    await ecl.connect();

    // Must use protocol >= 1.1
    await ecl.server_version('3.0.5', '1.1');

    const feeRate = await ecl.blockchainEstimatefee(2);

    // Electrum returns BTC/kb, and we want sat/kb
    const feeRateSat = Amount.fromBTC(feeRate).toSatoshis(true) as number;

    await ecl.close();

    return feeRateSat;
}

async function getBlockHeight(network: string): Promise<number> {
    const [server, port] = selectServer(network);

    const ecl = new ElectrumClient(port, server, 'tls');
    await ecl.connect();

    // Must use protocol >= 1.1
    await ecl.server_version('3.0.5', '1.1');

    const data = await ecl.blockchainHeaders_subscribe();

    await ecl.close();

    return data.block_height;
}

async function fundTx(addr: Address, target: number, network: string): Promise<Coin[]> {
    const coins: Coin[] = [];

    const data = await fetchUnspentTX(addr, network);

    // console.log(data);

    const txs = data.txrefs;

    if (typeof txs === 'undefined') {
        throw new Error(`No unspent txs found for ${addr}`);
    }

    txs.sort((a: number, b: number) => {
        return a - b;
    });

    let totalVal = 0;

    const set = new CustomSet();

    for (const tx of txs) {
        if (set.has(tx.tx_hash)) {
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

async function getAllTX(addr: Address, network: string): Promise<TXList> {
    const txData = await fetchAllTX(addr, network);

    const confirmedOnly = txData.filter((data) => data.block_height > 0);

    const txs: TX[] = confirmedOnly.map((tx) => TX.fromRaw(Buffer.from(tx.hex, 'hex')));

    const outputsSpent: boolean[][] = confirmedOnly.map((tx) => {
        return tx.outputs.map((out: object) => out.hasOwnProperty('spent_by'));
    });

    const heights: number[] = confirmedOnly.map((tx) => tx.block_height);

    return new TXList(txs, outputsSpent, heights);
}

async function getTX(txid: string, network: string): Promise<TX> {
    const txData = await fetchTX(txid, network);

    const hex = txData.hex;

    return TX.fromRaw(Buffer.from(hex, 'hex'));
}

async function postTX(tx: TX, network: string): Promise<void> {
    await fetchPostTX(tx.toRaw().toString('hex'), network);
}

export {
    getFeesSatoshiPerKB,
    getBlockHeight,
    fundTx,
    getAllTX,
    getTX,
    postTX,
};
