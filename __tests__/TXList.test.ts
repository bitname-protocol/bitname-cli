import * as path from 'path';
import * as fs from 'fs';

import {
    tx as TX,
} from 'bcoin';

import TXList from '../lib/TXList';

describe('TXList class', () => {
    it('correctly stores txids', () => {
        const txDataPath = path.resolve(__dirname, 'data');

        const randTxPath = path.resolve(txDataPath, '04accc0d.tx');
        const randTxData = fs.readFileSync(randTxPath, 'utf8').trim();
        const randTx = TX.fromRaw(randTxData, 'hex');
        const randTxSpent = [true];

        const lockTxPath = path.resolve(txDataPath, 'valid_lock_tx.tx');
        const lockTxData = fs.readFileSync(lockTxPath, 'utf8').trim();
        const lockTx = TX.fromRaw(lockTxData, 'hex');
        const lockTxSpent = [false, true, false];

        const list = new TXList([randTx, lockTx], [randTxSpent, lockTxSpent], [1, 1]);

        const txids = [
            '04accc0dce3a7ff28af27de7d63f55834a563bcfa5e62b746785a6e5e3c2576f',
            '329cfdb3e05cf2e468b9b5e5b8d7499d720e49fa8876f2ab5b2a6640987085fb',
        ];

        expect(list.getTxids()).toEqual(txids);
    });

    it('correctly stores txs by txid', () => {
        const txDataPath = path.resolve(__dirname, 'data');

        const randTxPath = path.resolve(txDataPath, '04accc0d.tx');
        const randTxData = fs.readFileSync(randTxPath, 'utf8').trim();
        const randTx = TX.fromRaw(randTxData, 'hex');
        const randTxSpent = [true];

        const lockTxPath = path.resolve(txDataPath, 'valid_lock_tx.tx');
        const lockTxData = fs.readFileSync(lockTxPath, 'utf8').trim();
        const lockTx = TX.fromRaw(lockTxData, 'hex');
        const lockTxSpent = [false, true, false];

        const list = new TXList([randTx, lockTx], [randTxSpent, lockTxSpent], [1, 1]);

        const txids = [
            '04accc0dce3a7ff28af27de7d63f55834a563bcfa5e62b746785a6e5e3c2576f',
            '329cfdb3e05cf2e468b9b5e5b8d7499d720e49fa8876f2ab5b2a6640987085fb',
        ];

        const retTxs = txids.map((txid) => list.getTX(txid));

        expect(retTxs).toEqual([randTx, lockTx]);
    });

    it('correctly stores output spent info', () => {
        const txDataPath = path.resolve(__dirname, 'data');

        const randTxPath = path.resolve(txDataPath, '04accc0d.tx');
        const randTxData = fs.readFileSync(randTxPath, 'utf8').trim();
        const randTx = TX.fromRaw(randTxData, 'hex');
        const randTxSpent = [true];

        const lockTxPath = path.resolve(txDataPath, 'valid_lock_tx.tx');
        const lockTxData = fs.readFileSync(lockTxPath, 'utf8').trim();
        const lockTx = TX.fromRaw(lockTxData, 'hex');
        const lockTxSpent = [false, true, false];

        const list = new TXList([randTx, lockTx], [randTxSpent, lockTxSpent], [1, 1]);

        const txids = [
            '04accc0dce3a7ff28af27de7d63f55834a563bcfa5e62b746785a6e5e3c2576f',
            '329cfdb3e05cf2e468b9b5e5b8d7499d720e49fa8876f2ab5b2a6640987085fb',
        ];

        const retRandTxSpent = randTx.outputs.map((output, ind) => list.getOutputSpent(txids[0], ind));
        expect(retRandTxSpent).toEqual(randTxSpent);

        const retLockTxSpent = lockTx.outputs.map((output, ind) => list.getOutputSpent(txids[1], ind));
        expect(retLockTxSpent).toEqual(lockTxSpent);
    });

    it('correctly stores height info', () => {
        const txDataPath = path.resolve(__dirname, 'data');

        const randTxPath = path.resolve(txDataPath, '04accc0d.tx');
        const randTxData = fs.readFileSync(randTxPath, 'utf8').trim();
        const randTx = TX.fromRaw(randTxData, 'hex');
        const randTxSpent = [true];

        const lockTxPath = path.resolve(txDataPath, 'valid_lock_tx.tx');
        const lockTxData = fs.readFileSync(lockTxPath, 'utf8').trim();
        const lockTx = TX.fromRaw(lockTxData, 'hex');
        const lockTxSpent = [false, true, false];

        const heights = [1, 2];

        const list = new TXList([randTx, lockTx], [randTxSpent, lockTxSpent], heights);

        const txids = [
            '04accc0dce3a7ff28af27de7d63f55834a563bcfa5e62b746785a6e5e3c2576f',
            '329cfdb3e05cf2e468b9b5e5b8d7499d720e49fa8876f2ab5b2a6640987085fb',
        ];

        const actualHeights = txids.map((txid) => list.getHeight(txid));

        expect(actualHeights).toEqual(heights);
    });

    it('throws on bad spent length', () => {
        const txDataPath = path.resolve(__dirname, 'data');

        const randTxPath = path.resolve(txDataPath, '04accc0d.tx');
        const randTxData = fs.readFileSync(randTxPath, 'utf8').trim();
        const randTx = TX.fromRaw(randTxData, 'hex');
        const randTxSpent = [true];

        const lockTxPath = path.resolve(txDataPath, 'valid_lock_tx.tx');
        const lockTxData = fs.readFileSync(lockTxPath, 'utf8').trim();
        const lockTx = TX.fromRaw(lockTxData, 'hex');
        const lockTxSpent = [false, false, false, true, false];

        expect(() => {
            return new TXList([randTx, lockTx], [randTxSpent], [1, 1]);
        }).toThrow('Lists of TXs, spent outputs, and heights must be of same length');
    });

    it('throws on bad heights length', () => {
        const txDataPath = path.resolve(__dirname, 'data');

        const randTxPath = path.resolve(txDataPath, '04accc0d.tx');
        const randTxData = fs.readFileSync(randTxPath, 'utf8').trim();
        const randTx = TX.fromRaw(randTxData, 'hex');
        const randTxSpent = [true];

        const lockTxPath = path.resolve(txDataPath, 'valid_lock_tx.tx');
        const lockTxData = fs.readFileSync(lockTxPath, 'utf8').trim();
        const lockTx = TX.fromRaw(lockTxData, 'hex');
        const lockTxSpent = [false, true, false];

        expect(() => {
            return new TXList([randTx, lockTx], [randTxSpent, lockTxSpent], [1]);
        }).toThrow('Lists of TXs, spent outputs, and heights must be of same length');
    });

    it('throws on bad output length', () => {
        const txDataPath = path.resolve(__dirname, 'data');

        const randTxPath = path.resolve(txDataPath, '04accc0d.tx');
        const randTxData = fs.readFileSync(randTxPath, 'utf8').trim();
        const randTx = TX.fromRaw(randTxData, 'hex');
        const randTxSpent = [true];

        const lockTxPath = path.resolve(txDataPath, 'valid_lock_tx.tx');
        const lockTxData = fs.readFileSync(lockTxPath, 'utf8').trim();
        const lockTx = TX.fromRaw(lockTxData, 'hex');
        const lockTxSpent = [false, false, false, true, false, true];

        const hash = '329cfdb3e05cf2e468b9b5e5b8d7499d720e49fa8876f2ab5b2a6640987085fb';

        expect(() => {
            return new TXList([randTx, lockTx], [randTxSpent, lockTxSpent], [1, 1]);
        }).toThrow(`Bad outputs for tx ${hash}; got 6, expected 3`);
    });

    it('throws on bad txid in TX lookup', () => {
        const txDataPath = path.resolve(__dirname, 'data');

        const randTxPath = path.resolve(txDataPath, '04accc0d.tx');
        const randTxData = fs.readFileSync(randTxPath, 'utf8').trim();
        const randTx = TX.fromRaw(randTxData, 'hex');
        const randTxSpent = [true];

        const lockTxPath = path.resolve(txDataPath, 'valid_lock_tx.tx');
        const lockTxData = fs.readFileSync(lockTxPath, 'utf8').trim();
        const lockTx = TX.fromRaw(lockTxData, 'hex');
        const lockTxSpent = [false, true, false];

        const list = new TXList([randTx, lockTx], [randTxSpent, lockTxSpent], [1, 1]);

        expect(() => {
            list.getTX('we out here');
        }).toThrow('Unknown txid \'we out here\'');
    });

    it('throws on bad txid in spend lookup', () => {
        const txDataPath = path.resolve(__dirname, 'data');

        const randTxPath = path.resolve(txDataPath, '04accc0d.tx');
        const randTxData = fs.readFileSync(randTxPath, 'utf8').trim();
        const randTx = TX.fromRaw(randTxData, 'hex');
        const randTxSpent = [true];

        const lockTxPath = path.resolve(txDataPath, 'valid_lock_tx.tx');
        const lockTxData = fs.readFileSync(lockTxPath, 'utf8').trim();
        const lockTx = TX.fromRaw(lockTxData, 'hex');
        const lockTxSpent = [false, true, false];

        const list = new TXList([randTx, lockTx], [randTxSpent, lockTxSpent], [1, 1]);

        expect(() => {
            list.getOutputSpent('lorem ipsum dolor sit amet', 0);
        }).toThrow('Unknown txid \'lorem ipsum dolor sit amet\'');
    });

    it('throws on bad output in spend lookup', () => {
        const txDataPath = path.resolve(__dirname, 'data');

        const randTxPath = path.resolve(txDataPath, '04accc0d.tx');
        const randTxData = fs.readFileSync(randTxPath, 'utf8').trim();
        const randTx = TX.fromRaw(randTxData, 'hex');
        const randTxSpent = [true];

        const lockTxPath = path.resolve(txDataPath, 'valid_lock_tx.tx');
        const lockTxData = fs.readFileSync(lockTxPath, 'utf8').trim();
        const lockTx = TX.fromRaw(lockTxData, 'hex');
        const lockTxSpent = [false, true, false];

        const list = new TXList([randTx, lockTx], [randTxSpent, lockTxSpent], [1, 1]);

        const hash = '329cfdb3e05cf2e468b9b5e5b8d7499d720e49fa8876f2ab5b2a6640987085fb';

        expect(() => {
            list.getOutputSpent(hash, 64);
        }).toThrow(`Unknown output '64' for txid '${hash}'`);
    });

    it('throws on bad txid in height lookup', () => {
        const txDataPath = path.resolve(__dirname, 'data');

        const randTxPath = path.resolve(txDataPath, '04accc0d.tx');
        const randTxData = fs.readFileSync(randTxPath, 'utf8').trim();
        const randTx = TX.fromRaw(randTxData, 'hex');
        const randTxSpent = [true];

        const lockTxPath = path.resolve(txDataPath, 'valid_lock_tx.tx');
        const lockTxData = fs.readFileSync(lockTxPath, 'utf8').trim();
        const lockTx = TX.fromRaw(lockTxData, 'hex');
        const lockTxSpent = [false, true, false];

        const list = new TXList([randTx, lockTx], [randTxSpent, lockTxSpent], [1, 1]);

        expect(() => {
            list.getHeight('asdf');
        }).toThrow('Unknown txid \'asdf\'');
    });
});
