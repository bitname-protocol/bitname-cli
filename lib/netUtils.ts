import { address as Address } from 'bcoin';
import fetch from 'node-fetch';

import { config } from '../config';
const NETWORK = config.network;

async function fetchUnspentTX(addr: Address): Promise<any> {
    let netSuffix = 'main';
    if (NETWORK === 'testnet') {
        netSuffix = 'test3';
    }

    const url = `https://api.blockcypher.com/v1/btc/${netSuffix}/addrs/${addr}?unspentOnly=true&includeScript=true`;

    const resp = await fetch(url);
    return resp.json();
}

async function fetchAllTX(addr: Address): Promise<any[]> {
    let netSuffix = 'main';
    if (NETWORK === 'testnet') {
        netSuffix = 'test3';
    }

    const baseURL = `https://api.blockcypher.com/v1/btc/${netSuffix}/addrs/${addr}/full?includeHex=true&limit=50`;

    let curResp = await fetch(baseURL);
    let curData = await curResp.json();

    let data = curData.txs;

    let reqs = 1;

    while (curData.hasOwnProperty('hasMore')) {
        const lastHeight = curData.txs[curData.txs.length - 1].block_height;
        const url = `${baseURL}&before=${lastHeight}`;
        curResp = await fetch(baseURL);
        curData = await curResp.json();

        // data.push(curData);
        data = data.concat(curData.txs);
        reqs += 1;
    }

    return data;
}

async function fetchMetadata() {
    let netSuffix = 'main';
    if (NETWORK === 'testnet') {
        netSuffix = 'test3';
    }
    const url = `https://api.blockcypher.com/v1/btc/${netSuffix}`;

    const resp = await fetch(url);
    const data = await resp.json();

    return data;
}

export {
    fetchUnspentTX,
    fetchAllTX,
    fetchMetadata,
};
