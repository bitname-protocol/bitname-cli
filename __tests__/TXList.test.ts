import * as path from 'path';
import * as fs from 'fs';

import {
    tx as TX,
} from 'bcoin';

import TXList from '../lib/TXList';

describe('TXList class', () => {
    it('Correctly stores txids', () => {
        const txDataPath = path.resolve(__dirname, 'data');

        const randTxPath = path.resolve(txDataPath, '04accc0d.tx');
        const randTxData = fs.readFileSync(randTxPath).toString('utf8');
        const randTx = TX.fromRaw(randTxData, 'hex');
        const randTxSpent = [false];

        const lockTxPath = path.resolve(txDataPath, 'valid_lock_tx.tx');
        const lockTxData = fs.readFileSync(lockTxPath).toString('utf8');
        const lockTx = TX.fromRaw(lockTxData, 'hex');
        const lockTxSpent = [false, false, false, true, false];

        const list = new TXList([randTx, lockTx], [randTxSpent, lockTxSpent]);

        const txids = [
            '04accc0dce3a7ff28af27de7d63f55834a563bcfa5e62b746785a6e5e3c2576f',
            '9464e553907a85188e28e0ace9bfa10e61a9c5b8aa4be826770e6ce47e92fe62',
        ];

        expect(list.getTxids()).toEqual(txids);
    });
});
