import { address as Address } from 'bcoin';
import fetch from 'node-fetch';

async function fetchUnspentTX(addr: Address): Promise<any> {
    const url = `https://testnet-api.smartbit.com.au/v1/blockchain/address/${addr}/unspent?limit=1000`;

    const resp = await fetch(url);
    return resp.json();
}

export {fetchUnspentTX};
