import {
    script as Script,
    coin as Coin,
    address as Address,
    util,
} from 'bcoin';

import * as fs from 'fs';

import * as path from 'path';

async function fetchUnspentTX(addr: Address): Promise<any> {
    return new Promise((resolve, reject) => {
        fs.readFile(path.resolve(__dirname, '__mockData__', 'blockcypher_utxos.json'), 'utf8', (err, data) => {
            if (err) {
                reject(err);
            }

            resolve(JSON.parse(data));
        });
    });
}

export {fetchUnspentTX};
