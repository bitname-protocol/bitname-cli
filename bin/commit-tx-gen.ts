import {
    errorNoFees,
    error,
    errorCantPush,
} from './errors';

import { genCommitTx } from '../lib/txs';
import { fundTx, getFeesSatoshiPerKB, postTX } from '../lib/net';

import {
    keyring as KeyRing,
    coin as Coin,
    tx as TX,
} from 'bcoin';

export async function onlineCommitTx(servicePubKey: Buffer,
                                     net: string,
                                     wifData: string,
                                     name: string,
                                     locktime: number,
                                     push: boolean): Promise<TX> {
    // const wifData = fs.readFileSync(path.resolve(argv.wif), 'utf8');
    const ring = KeyRing.fromSecret(wifData.trim());

    const addr = ring.getAddress();

    let feeRate: number;
    try {
        feeRate = await getFeesSatoshiPerKB(net);
    } catch (err) {
        return errorNoFees();
    }

    const commitFee = 500000;
    const registerFee = 500000;
    const escrowFee = 1000000;

    // Fund up to a 2 KB transaction
    let coins: Coin[];
    try {
        coins = await fundTx(addr, commitFee + registerFee + escrowFee + 8 * feeRate, net);
    } catch (err) {
        return error('Could not fund the transaction');
    }

    try {
        const commitTx = genCommitTx(coins,
                                     name,
                                     locktime,
                                     commitFee,
                                     registerFee,
                                     escrowFee,
                                     feeRate,
                                     ring,
                                     servicePubKey);
        // const txidStr = chalk`{green ${util.revHex(commitTx.hash('hex')) as string}}`;

        if (push) {
            try {
                await postTX(commitTx, net);
            } catch (err) {
                return errorCantPush();
            }
        }

        return commitTx;
    } catch (err) {
        return error('Could not generate transaction: ' + err.message);
    }
}
