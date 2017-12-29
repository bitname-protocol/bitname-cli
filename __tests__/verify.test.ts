import { verifyLockTX } from '../lib/verify';
import { genRedeemScript, genP2shAddr, genLockTx } from '../lib/txs';
import {
    keyring as KeyRing,
    coin as Coin,
    tx as TX,
    address as Address,
} from 'bcoin';

import * as fs from 'fs';
import * as path from 'path';

describe('transaction verification', () => {
    it('verifies valid locking tx', () => {
        const txDataPath = path.resolve(__dirname, 'data', 'valid_lock_tx.tx');
        const txData = fs.readFileSync(txDataPath).toString('utf8');

        const tx = TX.fromRaw(txData, 'hex');

        const servicePubKey = Buffer.from('02450e93fa1d4ec9370f885e48d9ada1559519fcfe0ca7def8a443865fd2c86a30', 'hex');

        expect(verifyLockTX(tx, servicePubKey)).toBe(true);
    });

    it('verifies generated locking txs', () => {
        const wif = 'cNJFgo1driFnPcBdBX8BrJrpxchBWXwXCvNH5SoSkdcF6JXXwHMm';
        const ring = KeyRing.fromSecret(wif);

        const testCoin = {
            version: 1,
            height: -1,
            value: 100000000,
            hash: '453bbd02d4ef04be090ec79691e7f1749ac14141456c3394a513055fbc904bac',
        };

        const coins = [new Coin(testCoin)];
        const upfrontFee = 1000000;
        const delayFee = 1000000;
        const feeRate = 1;

        const tx = genLockTx(coins, 'testName', upfrontFee, delayFee, feeRate, ring, ring.getPublicKey(), 5);

        expect(verifyLockTX(tx, ring.getPublicKey())).toBe(true);
    });
});
