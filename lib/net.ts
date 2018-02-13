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

interface IServerList {
    [url: string]: {
        t?: string;
        s?: string;
        pruning?: string;
        version?: string;
    };
}

// tslint:disable-next-line:no-var-requires
const servers: IServerList = require('../data/servers.json');
// tslint:disable-next-line:no-var-requires
const testServers: IServerList = require('../data/servers_testnet.json');

/**
 * Return an appropriate list of default servers for a given network
 * @param network The current network
 * @returns A list of electrum servers
 */
function getServerList(network: string): IServerList {
    if (network === 'testnet') {
        return JSON.parse(JSON.stringify(testServers));
    } else if (network === 'main') {
        return JSON.parse(JSON.stringify(servers));
    } else {
        throw new Error(`Unknown network '${network}'`);
    }
}

/**
 * In-place shuffle an array
 *
 * From https://stackoverflow.com/a/6274381/721868
 * @param a The array to shuffle
 * @returns The shuffled array
 */
function shuffle(a: any[]) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

/**
 * Select a server at random from a given list of servers
 * @param serverList The list of servers to select from
 * @returns A tuple of the server's url and ssl port number
 */
function selectRandomServer(serverList: IServerList): [string, number] {
    const keys = shuffle(Object.keys(serverList));

    for (const randKey of keys) {
        const randServer = serverList[randKey];

        if (typeof(randServer.s) === 'undefined') {
            continue;
        }

        return [randKey, Number.parseInt(randServer.s)];
    }

    throw new Error('No valid servers');
}

/**
 * Randomly select a server and attempt to connect to it
 * @param network The current network
 * @returns A connected server
 */
async function serverConnect(network: string): Promise<ElectrumClient> {
    const serverList = getServerList(network);

    for (let i = 0; i < 5; ++i) {
        const [url, port] = selectRandomServer(serverList);

        const ecl = new ElectrumClient(port, url, 'tls');

        try {
            await ecl.connect();

            // Must use protocol >= 1.1
            await ecl.server_version('3.0.5', '1.1');

            // Must support fee estimation
            const feeRate = await ecl.blockchainEstimatefee(2);
            if (feeRate < 0) {
                throw new Error('Server does not support fee estimation');
            }

            return ecl;
        } catch (e) {
            await ecl.close();
            delete serverList[url];
        }
    }

    throw new Error('Could not connect to a server');
}

// TODO: Define a class that manages server connections

/**
 * Get the estimated fee to have a transaction confirmed in 2 blocks in sat/kb
 * @param network The network from which to get info. Currently either 'main' or 'testnet'
 * @returns The estimated fee in sat/kb
 */
async function getFeesSatoshiPerKB(network: string): Promise<number> {
    const ecl = await serverConnect(network);

    const feeRate = await ecl.blockchainEstimatefee(2);

    if (feeRate < 0) {
        await ecl.close();
        throw new Error('Bad fee rate');
    }

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
    const ecl = await serverConnect(network);

    const data = await ecl.blockchainHeaders_subscribe();

    await ecl.close();

    return data.block_height;
}

function addrToScriptHash(addr: Address): string {
    const script = Script.fromAddress(addr);
    const origHash = script.sha256('hex') as string;
    return revHex(origHash);
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

    const ecl = await serverConnect(network);

    const hash = addrToScriptHash(addr);
    const txs = await ecl.blockchainScripthash_listunspent(addrToScriptHash(addr));

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

/**
 * Get all transactions with a given address as an input or output
 * @param addr The address to query
 * @param network The network about which to get information
 * @returns A TXList containing all of these transactions
 */
async function getAllTX(addr: Address, network: string): Promise<TXList> {
    const ecl = await serverConnect(network);

    const origTxs = await ecl.blockchainAddress_getHistory(addr.toBase58(network));

    const confirmedOnly = origTxs.filter((data) => data.height > 0);

    const txs: TX[] = await Promise.all(confirmedOnly.map(async (tx) => {
        const rawTx  = await ecl.blockchainTransaction_get(tx.tx_hash);
        const fullTx = TX.fromRaw(rawTx, 'hex');

        return fullTx;
    }));

    const unspents: {[addr: string]: {[txidOutput: string]: boolean}} = {};

    // Iterate over all txs
    const outputsSpent: boolean[][] = await Promise.all(txs.map(async (tx) => {
        // Iterate over each output
        return await Promise.all(tx.outputs.map(async (out, ind) => {
            const outAddrObj = out.getAddress();
            if (outAddrObj === null) {
                return false;
            }

            const outAddr = outAddrObj.toBase58(network);

            // If the utxos for this address aren't yet known, fetch and add them
            if (!(outAddr in unspents)) {
                // Due to async nature of await, must add this or there is a race condition
                unspents[outAddr] = {};
                const remoteUtxos = await ecl.blockchainAddress_listunspent(outAddr);

                unspents[outAddr] = remoteUtxos.reduce((acc, cur) => {
                    acc[cur.tx_hash + ':' + cur.tx_pos] = true;
                    return acc;
                }, {} as {[txidOutput: string]: boolean});
            }

            return !((tx.txid() + ':' + ind) in unspents[outAddr]);
        }));
    }));

    const heights = confirmedOnly.map((tx) => tx.height);

    await ecl.close();

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
    const ecl = await serverConnect(network);

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
    const ecl = await serverConnect(network);

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
