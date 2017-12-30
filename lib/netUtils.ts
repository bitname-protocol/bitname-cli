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

export {fetchUnspentTX};
