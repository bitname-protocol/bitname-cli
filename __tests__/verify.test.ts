import { verifyLockTX } from '../lib/verify';
import { genRedeemScript, genP2shAddr, genLockTx } from '../lib/txs';
import {
    keyring as KeyRing,
    coin as Coin,
    tx as TX,
    mtx as MTX,
    address as Address,
    script as Script,
    output as Output,
} from 'bcoin';

import * as fs from 'fs';
import * as path from 'path';

describe('transaction verification', () => {
    it('verifies valid locking tx', () => {
        const txDataPath = path.resolve(__dirname, 'data', 'valid_lock_tx.tx');
        const txData = fs.readFileSync(txDataPath).toString('utf8');

        const tx = TX.fromRaw(txData, 'hex');

        const servicePubKey = Buffer.from('036d6e6cf57a88d39fee39b88721dcd5afbb18e5d078888293eaf5eee2fbc4cd36', 'hex');

        expect(verifyLockTX(tx, servicePubKey)).toBe(true);
    });

    it('fails on bad lock script format', () => {
        const txDataPath = path.resolve(__dirname, 'data', 'valid_lock_tx.tx');
        const txData = fs.readFileSync(txDataPath).toString('utf8');
        const mtx = MTX.fromRaw(txData, 'hex');

        const servicePubKey = Buffer.from('036d6e6cf57a88d39fee39b88721dcd5afbb18e5d078888293eaf5eee2fbc4cd36', 'hex');
        const otherKey = Buffer.from('02a1633cafcc01ebfb6d78e39f687a1f0995c62fc95f51ead10a02ee0be551b5dc', 'hex');

        // Generate a script of any other kind
        const newScript = Script.fromMultisig(1, 2, [servicePubKey, otherKey]);

        const oldVal = mtx.outputs[3].value;

        // This new output will also be a P2SH, so we're sure it's not just checking for that
        const newOutput = Output.fromScript(newScript.getAddress(), oldVal);

        mtx.outputs[3] = newOutput;

        const tx = mtx.toTX();

        expect(verifyLockTX(tx, servicePubKey)).toBe(false);
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
