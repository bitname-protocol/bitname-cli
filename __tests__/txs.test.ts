import {
    coin as Coin,
    keyring as KeyRing,
    tx as TX,
} from 'bcoin';

import {
    genRedeemScript,
    genLockTx,
    genUnlockTx,
} from '../lib/txs';
import {
    BadUserPublicKeyError,
    BadServicePublicKeyError,
    BadLockTransactionError,
} from '../lib/errors';

import * as fs from 'fs';
import * as path from 'path';

describe('tx generation', () => {
    it('generates a valid redeem script', () => {
        const serviceKey = Buffer.from('02a1633cafcc01ebfb6d78e39f687a1f0995c62fc95f51ead10a02ee0be551b5dc', 'hex');
        const userKey = Buffer.from('030589ee559348bd6a7325994f9c8eff12bd5d73cc683142bd0dd1a17abc99b0dc', 'hex');
        const script = genRedeemScript(userKey, serviceKey, 5);

        const expected = [
            'OP_IF',
            userKey.toString('hex'),
            'OP_CHECKSIG',
            'OP_ELSE',
            'OP_5',
            'OP_CHECKSEQUENCEVERIFY',
            'OP_DROP',
            serviceKey.toString('hex'),
            'OP_CHECKSIG',
            'OP_ENDIF',
        ];

        expect(script.toASM().split(' ')).toEqual(expected);
    });

    it('fails if user pubkey is invalid', () => {
        const serviceKey = Buffer.from('02a1633cafcc01ebfb6d78e39f687a1f0995c62fc95f51ead10a02ee0be551b5dc', 'hex');
        const userKey = Buffer.from('030000000000000000000000000000000000000000000000000000000000000000', 'hex');
        expect(() => {
            genRedeemScript(userKey, serviceKey, 5);
        }).toThrowError(BadUserPublicKeyError);
    });

    it('fails if service pubkey is invalid', () => {
        const serviceKey = Buffer.from('021111111111111111111111111111111111111111111111111111111111111111', 'hex');
        const userKey = Buffer.from('030589ee559348bd6a7325994f9c8eff12bd5d73cc683142bd0dd1a17abc99b0dc', 'hex');
        expect(() => {
            genRedeemScript(userKey, serviceKey, 1);
        }).toThrowError(BadServicePublicKeyError);
    });

    it('generates locking transactions', () => {
        const serviceKey = Buffer.from('02a1633cafcc01ebfb6d78e39f687a1f0995c62fc95f51ead10a02ee0be551b5dc', 'hex');

        const wif = 'cNJFgo1driFnPcBdBX8BrJrpxchBWXwXCvNH5SoSkdcF6JXXwHMm';
        const userRing = KeyRing.fromSecret(wif);

        const testCoin = {
            version: 1,
            height: -1,
            value: 100000000,
            hash: '453bbd02d4ef04be090ec79691e7f1749ac14141456c3394a513055fbc904bac',
        };

        const coins = [new Coin(testCoin)];

        const tx = genLockTx(coins, 'google', 1, 1, 10, userRing, serviceKey, 1);

        expect(tx.hash('hex')).toBe('631525eccd821de5518730aa4d543f53ed4b0d919c6f8d48b17f0cc3d4b9a70b');
    });

    it('generates user unlocking transaction', () => {
        const txDataPath = path.resolve(__dirname, 'data', 'valid_lock_tx.tx');
        const txData = fs.readFileSync(txDataPath, 'utf8').trim();

        const lockTX = TX.fromRaw(txData, 'hex');

        const wif = 'cUBuNVHb5HVpStD1XbHgafDH1QSRwcxUTJmueQLnyzwz1f5wmRZB';
        const userRing = KeyRing.fromSecret(wif);

        const tx = genUnlockTx(lockTX, 1, false, userRing, userRing.getPublicKey());

        expect(tx.hash('hex')).toBe('8ece940b4ef2692b6609e11f9933f624714f2256d7f003391c75df668e215f62');
    });

    it('generates service unlocking transaction', () => {
        const txDataPath = path.resolve(__dirname, 'data', 'valid_lock_tx.tx');
        const txData = fs.readFileSync(txDataPath, 'utf8').trim();

        const lockTX = TX.fromRaw(txData, 'hex');

        const wif = 'cUBuNVHb5HVpStD1XbHgafDH1QSRwcxUTJmueQLnyzwz1f5wmRZB';
        const userRing = KeyRing.fromSecret(wif);

        const tx = genUnlockTx(lockTX, 1, true, userRing, userRing.getPublicKey());

        expect(tx.hash('hex')).toBe('9c9cc53211f58c83ca4d85bc7a15a44fd133cb6f1b7e3f55f3d052798bd9598d');
    });

    it('errors on unlocking with incorrect user pubkey', () => {
        const txDataPath = path.resolve(__dirname, 'data', 'valid_lock_tx.tx');
        const txData = fs.readFileSync(txDataPath, 'utf8').trim();

        const lockTX = TX.fromRaw(txData, 'hex');

        const wif = 'cUTaW9nuwpwfuZLkgY98qnfdbzokta2BKxnQ43HyGf7jLEwe1Big';
        const userRing = KeyRing.fromSecret(wif);

        const serviceKey = Buffer.from('030589ee559348bd6a7325994f9c8eff12bd5d73cc683142bd0dd1a17abc99b0dc', 'hex');

        expect(() => {
            genUnlockTx(lockTX, 1, false, userRing, serviceKey);
        }).toThrow(BadLockTransactionError);
    });

    it('errors on unlocking with incorrect service pubkey', () => {
        const txDataPath = path.resolve(__dirname, 'data', 'valid_lock_tx.tx');
        const txData = fs.readFileSync(txDataPath, 'utf8').trim();

        const lockTX = TX.fromRaw(txData, 'hex');

        const wif = 'cUTaW9nuwpwfuZLkgY98qnfdbzokta2BKxnQ43HyGf7jLEwe1Big';
        const serviceRing = KeyRing.fromSecret(wif);

        const userKey = Buffer.from('030589ee559348bd6a7325994f9c8eff12bd5d73cc683142bd0dd1a17abc99b0dc', 'hex');

        expect(() => {
            genUnlockTx(lockTX, 1, true, serviceRing, userKey);
        }).toThrow(BadLockTransactionError);
    });

    it('errors on unlocking with incorrect privkey', () => {
        const txDataPath = path.resolve(__dirname, 'data', 'valid_lock_tx.tx');
        const txData = fs.readFileSync(txDataPath, 'utf8').trim();

        const lockTX = TX.fromRaw(txData, 'hex');

        const wif = 'cNJFgo1driFnPcBdBX8BrJrpxchBWXwXCvNH5SoSkdcF6JXXwHMm';
        const userRing = KeyRing.fromSecret(wif);

        expect(() => {
            genUnlockTx(lockTX, 1, false, userRing, userRing.getPublicKey());
        }).toThrow(BadLockTransactionError);
    });
});
