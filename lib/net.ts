import {
    script as Script,
    coin as Coin,
    address as Address,
    util,
    tx as TX,
    amount as Amount,
} from 'bcoin';

import ElectrumClient = require('electrum-client');

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

/**
 * Get the current block height of the specified network
 * @param network The network for which to check the height
 * @returns The current block height
 */
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

/**
 * Given a target value, generate a list of Coins that provide sufficient funding for this
 * @param addr The controlling address to check
 * @param target The target value to reach
 * @param network The network on which the transaction will occur
 * @returns A list of Coins with total value greater than or equal to target
 */
async function fundTx(addr: Address, target: number, network: string): Promise<Coin[]> {
    const coins: Coin[] = [];

    const [server, port] = selectServer(network);

    const ecl = new ElectrumClient(port, server, 'tls');
    await ecl.connect();

    // Must use protocol >= 1.1
    await ecl.server_version('3.0.5', '1.1');

    const txs = await ecl.blockchainAddress_listunspent(addr.toBase58(network));

    if (txs.length === 0) {
        await ecl.close();
        throw new Error(`No unspent txs found for ${addr}`);
    }

    // Sort txs by largest value first
    txs.sort((a, b) => {
        return b.value - a.value;
    });

    let totalVal = 0;

    for (const tx of txs) {
        // Now get the full tx for each utxo
        const rawTx  = await ecl.blockchainTransaction_get(tx.tx_hash);
        const fullTx = TX.fromRaw(rawTx, 'hex');

        // Create a Coin referencing the given output number
        const coin = Coin.fromTX(fullTx, tx.tx_pos, tx.height);
        coins.push(coin);

        totalVal += tx.value;

        if (totalVal >= target) {
            break;
        }
    }

    await ecl.close();

    // Error if all utxos checked and still not enough funds
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

/**
 * Get a full tx by its txid
 * @param txid The little-endian txid for which to search
 * @param network The network on which the tx took place
 * @returns A TX object for this tx
 * @throws If the txid is not found
 */
async function getTX(txid: string, network: string): Promise<TX> {
    const [server, port] = selectServer(network);

    const ecl = new ElectrumClient(port, server, 'tls');
    await ecl.connect();

    // Must use protocol >= 1.1
    await ecl.server_version('3.0.5', '1.1');

    const rawTx = await ecl.blockchainTransaction_get(txid);
    const fullTx = TX.fromRaw(rawTx, 'hex');

    await ecl.close();

    return fullTx;
}

/**
 * Publish a signed tx to the network
 * @param tx The raw transaction to publish
 * @param network The network to which to publish
 * @throws If publishing encountered an error
 */
async function postTX(tx: TX, network: string): Promise<void> {
    const [server, port] = selectServer(network);

    const ecl = new ElectrumClient(port, server, 'tls');
    await ecl.connect();

    // Must use protocol >= 1.1
    await ecl.server_version('3.0.5', '1.1');

    const rawTx = tx.toRaw().toString('hex');

    try {
        await ecl.blockchainTransaction_broadcast(rawTx);
    } finally {
        await ecl.close();
    }
}

export {
    getFeesSatoshiPerKB,
    getBlockHeight,
    fundTx,
    getAllTX,
    getTX,
    postTX,
};
