jest.mock('randombytes');

import {
    coin as Coin,
    keyring as KeyRing,
    tx as TX,
    crypto,
} from 'bcoin';

import {
    genRedeemScript,
    genLockTx,
    genUnlockTx,
    genCommitTx,
    genCommitRedeemScript,
    serializeCommitData,
    deserializeCommitData,
} from '../lib/txs';
import {
    BadUserPublicKeyError,
    BadServicePublicKeyError,
    BadLockTransactionError,
} from '../lib/errors';

import * as fs from 'fs';
import * as path from 'path';

describe('tx generation', () => {
    const commitFee = 10000;
    const registerFee = 10000;
    const escrowFee = 20000;
    const feeRate = 1000;

    it('generates a valid registration redeem script', () => {
        const serviceKey = Buffer.from('02a1633cafcc01ebfb6d78e39f687a1f0995c62fc95f51ead10a02ee0be551b5dc', 'hex');
        const userKey = Buffer.from('030589ee559348bd6a7325994f9c8eff12bd5d73cc683142bd0dd1a17abc99b0dc', 'hex');
        const script = genRedeemScript(userKey, serviceKey, 5);

        const expected = [
            'OP_IF',
            'OP_0',
            'OP_CHECKSEQUENCEVERIFY',
            'OP_DROP',
            userKey.toString('hex'),
            'OP_CHECKSIG',
            'OP_ELSE',
            'OP_5',
            'OP_CHECKLOCKTIMEVERIFY',
            'OP_DROP',
            serviceKey.toString('hex'),
            'OP_CHECKSIG',
            'OP_ENDIF',
        ];

        expect(script.toASM().split(' ')).toEqual(expected);
    });

    it('generates a valid commit redeem script', () => {
        const userKey = Buffer.from('030589ee559348bd6a7325994f9c8eff12bd5d73cc683142bd0dd1a17abc99b0dc', 'hex');

        const nonce = new Buffer(32);
        const name = 'boop';
        const locktime = 5;
        const script = genCommitRedeemScript(userKey, nonce, name, locktime);

        const serializedInfoHash = crypto.hash256(serializeCommitData(nonce, locktime, name));

        const expected = [
            'OP_6',
            'OP_CHECKSEQUENCEVERIFY',
            'OP_DROP',
            'OP_HASH256',
            serializedInfoHash.toString('hex'),
            'OP_EQUALVERIFY',
            userKey.toString('hex'),
            'OP_CHECKSIG',
        ];

        expect(script.toASM().split(' ')).toEqual(expected);
    });

    it('throws generating a commit redeem script with a bad pubkey', () => {
        const nonce = new Buffer(32);
        const name = 'boop';
        const locktime = 5;
        expect(() => {
            genCommitRedeemScript(nonce, nonce, name, locktime);
        }).toThrow(BadUserPublicKeyError);
    });

    it('throws serializing with a bad nonce length', () => {
        const nonce = new Buffer(39);
        const name = 'boop';
        const locktime = 5;
        expect(() => {
            serializeCommitData(nonce, locktime, name);
        }).toThrow('Invalid nonce size');
    });

    it('throws serializing with a bad locktime size', () => {
        const nonce = new Buffer(32);
        const name = 'boop';
        const locktime = 500000001;
        expect(() => {
            serializeCommitData(nonce, locktime, name);
        }).toThrow('Locktime must be less than 500000000 blocks');
    });

    it('throws serializing with a bad name size', () => {
        const nonce = new Buffer(32);
        const name = '000102030405060708090a0b0c0d0e0f1012131415161718191a1b1c1d1e1f2021';
        const locktime = 65;
        expect(() => {
            serializeCommitData(nonce, locktime, name);
        }).toThrow('Name is too long');
    });

    it('throws on name data being of incorrect length', () => {
        const nonce = new Buffer(32);
        const name = 'google';
        const locktime = 65;
        const data = Buffer.concat([serializeCommitData(nonce, locktime, name), Buffer.from('abcd')]);

        expect(() => {
            deserializeCommitData(data);
        }).toThrow('Name has incorrect length');
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
        // TODO userRing.witness = true;

        const testCoin = {
            version: 1,
            height: -1,
            value: 100000000,
            hash: '453bbd02d4ef04be090ec79691e7f1749ac14141456c3394a513055fbc904bac',
        };

        const coins = [new Coin(testCoin)];

        const commitTX = genCommitTx(coins,
                                     'google',
                                     400,
                                     commitFee,
                                     registerFee,
                                     escrowFee,
                                     feeRate,
                                     userRing,
                                     serviceKey);

        const tx = genLockTx(commitTX, 'google', registerFee, escrowFee, feeRate, userRing, serviceKey, 400);

        expect(tx.hash('hex')).toMatchSnapshot();
    });

    it('generates locking transactions until block 500000000', () => {
        const serviceKey = Buffer.from('02a1633cafcc01ebfb6d78e39f687a1f0995c62fc95f51ead10a02ee0be551b5dc', 'hex');

        const wif = 'cNJFgo1driFnPcBdBX8BrJrpxchBWXwXCvNH5SoSkdcF6JXXwHMm';
        const userRing = KeyRing.fromSecret(wif);
        // TODO userRing.witness = true;

        const testCoin = {
            version: 1,
            height: -1,
            value: 100000000,
            hash: '453bbd02d4ef04be090ec79691e7f1749ac14141456c3394a513055fbc904bac',
        };

        const coins = [new Coin(testCoin)];

        const commitTX = genCommitTx(coins,
                                     'google',
                                     500000000,
                                     commitFee,
                                     registerFee,
                                     escrowFee,
                                     feeRate,
                                     userRing,
                                     serviceKey);

        const tx = genLockTx(commitTX, 'google', registerFee, escrowFee, feeRate, userRing, serviceKey, 500000000);

        expect(tx.hash('hex')).toMatchSnapshot();
    });

    it('errors generating locking transactions for 500000001 blocks', () => {
        const serviceKey = Buffer.from('02a1633cafcc01ebfb6d78e39f687a1f0995c62fc95f51ead10a02ee0be551b5dc', 'hex');

        const wif = 'cNJFgo1driFnPcBdBX8BrJrpxchBWXwXCvNH5SoSkdcF6JXXwHMm';
        const userRing = KeyRing.fromSecret(wif);
        // TODO userRing.witness = true;

        const testCoin = {
            version: 1,
            height: -1,
            value: 100000000,
            hash: '453bbd02d4ef04be090ec79691e7f1749ac14141456c3394a513055fbc904bac',
        };

        const coins = [new Coin(testCoin)];

        const commitTX = genCommitTx(coins,
                                     'google',
                                     500000000,
                                     commitFee,
                                     registerFee,
                                     escrowFee,
                                     feeRate,
                                     userRing,
                                     serviceKey);

        expect(() => {
            genLockTx(commitTX, 'google', registerFee, escrowFee, feeRate, userRing, serviceKey, 500000001);
        }).toThrow('Locktime must be less than 500000000 blocks');
    });

    it('errors generating locking transactions for 65-character name', () => {
        const serviceKey = Buffer.from('02a1633cafcc01ebfb6d78e39f687a1f0995c62fc95f51ead10a02ee0be551b5dc', 'hex');

        const wif = 'cNJFgo1driFnPcBdBX8BrJrpxchBWXwXCvNH5SoSkdcF6JXXwHMm';
        const userRing = KeyRing.fromSecret(wif);
        // TODO userRing.witness = true;

        const testCoin = {
            version: 1,
            height: -1,
            value: 100000000,
            hash: '453bbd02d4ef04be090ec79691e7f1749ac14141456c3394a513055fbc904bac',
        };

        const coins = [new Coin(testCoin)];

        const commitTX = genCommitTx(coins,
                                     'google',
                                     65535,
                                     commitFee,
                                     registerFee,
                                     escrowFee,
                                     feeRate,
                                     userRing,
                                     serviceKey);

        const name = (new Buffer(65)).fill('a').toString('ascii');
        expect(() => {
            genLockTx(commitTX, name, registerFee, escrowFee, feeRate, userRing, serviceKey, 65535);
        }).toThrow('Name is too long');
    });

    it('errors generating locking transactions for non-URI safe name', () => {
        const serviceKey = Buffer.from('02a1633cafcc01ebfb6d78e39f687a1f0995c62fc95f51ead10a02ee0be551b5dc', 'hex');

        const wif = 'cNJFgo1driFnPcBdBX8BrJrpxchBWXwXCvNH5SoSkdcF6JXXwHMm';
        const userRing = KeyRing.fromSecret(wif);
        // TODO userRing.witness = true;
        const testCoin = {
            version: 1,
            height: -1,
            value: 100000000,
            hash: '453bbd02d4ef04be090ec79691e7f1749ac14141456c3394a513055fbc904bac',
        };

        const coins = [new Coin(testCoin)];

        const commitTX = genCommitTx(coins,
                                     'google',
                                     65535,
                                     commitFee,
                                     registerFee,
                                     escrowFee,
                                     feeRate,
                                     userRing,
                                     serviceKey);

        expect(() => {
            genLockTx(commitTX, '`name', registerFee, escrowFee, feeRate, userRing, serviceKey, 65535);
        }).toThrow('Invalid character(s) in name');
    });

    it('errors generating locking transaction with invalid public key', () => {
        const serviceKey = Buffer.from('02a1633cafcc01ebfb6d78e39f687a1f0995c62fc95f51ead10a02ee0be551b5dc', 'hex');

        const wif = 'cNJFgo1driFnPcBdBX8BrJrpxchBWXwXCvNH5SoSkdcF6JXXwHMm';
        const userRing = KeyRing.fromSecret(wif);
        // TODO userRing.witness = true;

        const testCoin = {
            version: 1,
            height: -1,
            value: 100000000,
            hash: '453bbd02d4ef04be090ec79691e7f1749ac14141456c3394a513055fbc904bac',
        };

        const coins = [new Coin(testCoin)];

        const commitTX = genCommitTx(coins,
                                     'google',
                                     65535,
                                     commitFee,
                                     registerFee,
                                     escrowFee,
                                     feeRate,
                                     userRing,
                                     serviceKey);

        expect(() => {
            genLockTx(commitTX, 'google', registerFee, escrowFee, feeRate, userRing, new Buffer(33), 65535);
        }).toThrow('Invalid service public key');
    });

    it('errors generating locking transaction with invalid public key', () => {
        const serviceKey = Buffer.from('02a1633cafcc01ebfb6d78e39f687a1f0995c62fc95f51ead10a02ee0be551b5dc', 'hex');

        const wif = 'cNJFgo1driFnPcBdBX8BrJrpxchBWXwXCvNH5SoSkdcF6JXXwHMm';
        const userRing = KeyRing.fromSecret(wif);
        // TODO userRing.witness = true;

        const ctxDataPath = path.resolve(__dirname, 'data', '04accc0d.tx');
        const ctxData = fs.readFileSync(ctxDataPath, 'utf8').trim();
        const ctx = TX.fromRaw(ctxData, 'hex');

        expect(() => {
            genLockTx(ctx, 'google', registerFee, escrowFee, feeRate, userRing, serviceKey, 65535);
        }).toThrow('Invalid commitment tx');
    });

    it('generates user unlocking transaction', () => {
        const ctxDataPath = path.resolve(__dirname, 'data', 'valid_commit_tx.tx');
        const ctxData = fs.readFileSync(ctxDataPath, 'utf8').trim();
        const ctx = TX.fromRaw(ctxData, 'hex');

        const txDataPath = path.resolve(__dirname, 'data', 'valid_lock_tx.tx');
        const txData = fs.readFileSync(txDataPath, 'utf8').trim();

        const lockTX = TX.fromRaw(txData, 'hex');

        const wif = 'cTV3FM3RfiFwmHfX6x43g4Xp8qeLbi15pNELuWF9sV3renVZ63nB';
        const ring = KeyRing.fromSecret(wif);
<<<<<<< c84bc196bfe886d3f53cd57ceb1f8416d69fde47
=======
        // TODO ring.witness = true;
        const addr = ring.getAddress().toBase58('testnet');
>>>>>>> add todo comments for segwit migration

        const serviceWif = 'cRMzGH4towfYVCref4Qz9iyfKaRkvfgVvZ2qk4hExMR7FcpzzVg6';
        const serviceRing = KeyRing.fromSecret(serviceWif);
        // TODO serviceRing.witness = true;
        const servicePubKey = serviceRing.getPublicKey();

        const tx = genUnlockTx(lockTX, ctx, 1, false, ring, servicePubKey);

        expect(tx.hash('hex')).toMatchSnapshot();
    });

    it('generates service unlocking transaction', () => {
        const ctxDataPath = path.resolve(__dirname, 'data', 'valid_commit_tx.tx');
        const ctxData = fs.readFileSync(ctxDataPath, 'utf8').trim();
        const ctx = TX.fromRaw(ctxData, 'hex');

        const txDataPath = path.resolve(__dirname, 'data', 'valid_lock_tx.tx');
        const txData = fs.readFileSync(txDataPath, 'utf8').trim();

        const lockTX = TX.fromRaw(txData, 'hex');

        const wif = 'cTV3FM3RfiFwmHfX6x43g4Xp8qeLbi15pNELuWF9sV3renVZ63nB';
        const ring = KeyRing.fromSecret(wif);
        // TODO ring.witness = true;
        const userPubKey = ring.getPublicKey();
        
        const serviceWif = 'cRMzGH4towfYVCref4Qz9iyfKaRkvfgVvZ2qk4hExMR7FcpzzVg6';
        const serviceRing = KeyRing.fromSecret(serviceWif);
<<<<<<< c84bc196bfe886d3f53cd57ceb1f8416d69fde47
=======
        // TODO serviceRing.witness = true;
        const servicePubKey = serviceRing.getPublicKey();
>>>>>>> add todo comments for segwit migration

        const tx = genUnlockTx(lockTX, ctx, 1, true, serviceRing, userPubKey);

        expect(tx.hash('hex')).toMatchSnapshot();
    });

    it('errors on committing with name too long', () => {
        const serviceKey = Buffer.from('02a1633cafcc01ebfb6d78e39f687a1f0995c62fc95f51ead10a02ee0be551b5dc', 'hex');

        const wif = 'cNJFgo1driFnPcBdBX8BrJrpxchBWXwXCvNH5SoSkdcF6JXXwHMm';
        const userRing = KeyRing.fromSecret(wif);
        // TODO userRing.witness = true;

        const testCoin = {
            version: 1,
            height: -1,
            value: 100000000,
            hash: '453bbd02d4ef04be090ec79691e7f1749ac14141456c3394a513055fbc904bac',
        };

        const name = 'If music be the food of love, play on. / Give me excess of it that, surfeiting...';

        const coins = [new Coin(testCoin)];

        expect(() => {
            genCommitTx(coins,
                        name,
                        400,
                        commitFee,
                        registerFee,
                        escrowFee,
                        feeRate,
                        userRing,
                        serviceKey);
        }).toThrow('Name is too long');
    });

    it('errors on committing with bad characters in name', () => {
        const serviceKey = Buffer.from('02a1633cafcc01ebfb6d78e39f687a1f0995c62fc95f51ead10a02ee0be551b5dc', 'hex');

        const wif = 'cNJFgo1driFnPcBdBX8BrJrpxchBWXwXCvNH5SoSkdcF6JXXwHMm';
        const userRing = KeyRing.fromSecret(wif);
        // TODO userRing.witness = true;

        const testCoin = {
            version: 1,
            height: -1,
            value: 100000000,
            hash: '453bbd02d4ef04be090ec79691e7f1749ac14141456c3394a513055fbc904bac',
        };

        const name = 'zip zap zop';

        const coins = [new Coin(testCoin)];

        expect(() => {
            genCommitTx(coins,
                        name,
                        400,
                        commitFee,
                        registerFee,
                        escrowFee,
                        feeRate,
                        userRing,
                        serviceKey);
        }).toThrow('Invalid character(s) in name');
    });

    it('errors on committing with bad characters in name', () => {
        const serviceKey = new Buffer(33);

        const wif = 'cNJFgo1driFnPcBdBX8BrJrpxchBWXwXCvNH5SoSkdcF6JXXwHMm';
        const userRing = KeyRing.fromSecret(wif);
        // TODO userRing.witness = true;

        const testCoin = {
            version: 1,
            height: -1,
            value: 100000000,
            hash: '453bbd02d4ef04be090ec79691e7f1749ac14141456c3394a513055fbc904bac',
        };

        const name = 'zoop';

        const coins = [new Coin(testCoin)];

        expect(() => {
            genCommitTx(coins,
                        name,
                        400,
                        commitFee,
                        registerFee,
                        escrowFee,
                        feeRate,
                        userRing,
                        serviceKey);
        }).toThrow('Invalid service public key');
    });

    it('errors on unlocking with incorrect user pubkey', () => {
        const ctxDataPath = path.resolve(__dirname, 'data', 'valid_commit_tx.tx');
        const ctxData = fs.readFileSync(ctxDataPath, 'utf8').trim();
        const ctx = TX.fromRaw(ctxData, 'hex');

        const txDataPath = path.resolve(__dirname, 'data', 'valid_lock_tx.tx');
        const txData = fs.readFileSync(txDataPath, 'utf8').trim();

        const lockTX = TX.fromRaw(txData, 'hex');

        const wif = 'cUTaW9nuwpwfuZLkgY98qnfdbzokta2BKxnQ43HyGf7jLEwe1Big';
        const userRing = KeyRing.fromSecret(wif);
        // TODO userRing.witness = true;

        const serviceKey = Buffer.from('030589ee559348bd6a7325994f9c8eff12bd5d73cc683142bd0dd1a17abc99b0dc', 'hex');

        expect(() => {
            genUnlockTx(lockTX, ctx, 1, false, userRing, serviceKey);
        }).toThrow(BadLockTransactionError);
    });

    it('errors on unlocking with incorrect service pubkey', () => {
        const ctxDataPath = path.resolve(__dirname, 'data', 'valid_commit_tx.tx');
        const ctxData = fs.readFileSync(ctxDataPath, 'utf8').trim();
        const ctx = TX.fromRaw(ctxData, 'hex');

        const txDataPath = path.resolve(__dirname, 'data', 'valid_lock_tx.tx');
        const txData = fs.readFileSync(txDataPath, 'utf8').trim();

        const lockTX = TX.fromRaw(txData, 'hex');

        const wif = 'cUTaW9nuwpwfuZLkgY98qnfdbzokta2BKxnQ43HyGf7jLEwe1Big';
        const serviceRing = KeyRing.fromSecret(wif);
        // TODO serviceRing.witness = true;

        const userKey = Buffer.from('030589ee559348bd6a7325994f9c8eff12bd5d73cc683142bd0dd1a17abc99b0dc', 'hex');

        expect(() => {
            genUnlockTx(lockTX, ctx, 1, true, serviceRing, userKey);
        }).toThrow(BadLockTransactionError);
    });

    it('errors on unlocking with incorrect privkey', () => {
        const ctxDataPath = path.resolve(__dirname, 'data', 'valid_commit_tx.tx');
        const ctxData = fs.readFileSync(ctxDataPath, 'utf8').trim();
        const ctx = TX.fromRaw(ctxData, 'hex');

        const txDataPath = path.resolve(__dirname, 'data', 'valid_lock_tx.tx');
        const txData = fs.readFileSync(txDataPath, 'utf8').trim();

        const lockTX = TX.fromRaw(txData, 'hex');

        const wif = 'cNJFgo1driFnPcBdBX8BrJrpxchBWXwXCvNH5SoSkdcF6JXXwHMm';
        const userRing = KeyRing.fromSecret(wif);
        // TODO userRing.witness = true;

        expect(() => {
            genUnlockTx(lockTX, ctx, 1, false, userRing, userRing.getPublicKey());
        }).toThrow(BadLockTransactionError);
    });
});
