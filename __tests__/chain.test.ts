jest.mock('../lib/netUtils');
import { fetchUnspentTX, fetchAllTX } from '../lib/netUtils';

import {
    address as Address,
    keyring as KeyRing,
    coin as Coin,
    crypto,
} from 'bcoin';
import { fundTx, getAllTX } from '../lib/net';

import { extractInfo } from '../lib/chain';

import TXList from '../lib/TXList';
import { genCommitTx, genLockTx, genUnlockTx } from '../lib/txs';

describe('chain state', () => {
    it('finds the one current name', async () => {
        const servicePubKey = Buffer.from('032b9429c7553028aea2464021c7680a408885a49c62af6adba435ec751d467237', 'hex');
        const userPubKey = Buffer.from('036d6e6cf57a88d39fee39b88721dcd5afbb18e5d078888293eaf5eee2fbc4cd36', 'hex');

        const addr = Address.fromPubkeyhash(crypto.hash160(servicePubKey));
        const txList = await getAllTX(addr, 'testnet');

        const info = extractInfo(txList, servicePubKey, 1257057);

        const expectedInfo = {
            colin: {
                txid: '205c16dc3440d83754558d028eb94d19cce857852c4a63e3daf24f5a7d14674f',
                expires: 1257888 + 30,
                pubKey: userPubKey,
            },
        };

        expect(info).toEqual(expectedInfo);
    });

    it('does not include a double name, even if both are in the same block', async () => {
        const servicePubKey = Buffer.from('03f000da94f60417c76832179fd82ebfc614f5df9e67ffbc1717542ec460e8054c', 'hex');
        // const userPubKey = Buffer.from('036d6e6cf57a88d39fee39b88721dcd5afbb18e5d078888293eaf5eee2fbc4cd36', 'hex');

        const userRing = KeyRing.fromSecret('cUBuNVHb5HVpStD1XbHgafDH1QSRwcxUTJmueQLnyzwz1f5wmRZB');
        const userPubKey = userRing.getPublicKey();

        // const info = extractInfo(txList, servicePubKey, 1257485);

        const commitFee = 10000;
        const registerFee = 10000;
        const escrowFee = 20000;
        const feeRate = 1000;

        const rawCoin1 = {
            version: 1,
            height: -1,
            value: 100000000,
            hash: '453bbd02d4ef04be090ec79691e7f1749ac14141456c3394a513055fbc904bac',
        };
        const coin1 = new Coin(rawCoin1);

        const commitTX1 = genCommitTx(
            [coin1],
            'test',
            80,
            commitFee,
            registerFee,
            escrowFee,
            feeRate,
            userRing,
            servicePubKey,
        );
        const lockTX1 = genLockTx(
            commitTX1,
            'test',
            registerFee,
            escrowFee,
            feeRate,
            userRing,
            servicePubKey,
            80,
        );

        const rawCoin2 = {
            version: 1,
            height: -1,
            value: 100000000,
            hash: '0cbf90cc42ffdbef05fa261b5959187b8f44b629ac446881ef4445bc9cefd1ba',
        };
        const coin2 = new Coin(rawCoin2);

        const commitTX2 = genCommitTx(
            [coin2],
            'test',
            80,
            commitFee,
            registerFee,
            escrowFee,
            feeRate,
            userRing,
            servicePubKey,
        );
        const lockTX2 = genLockTx(commitTX2,
            'test',
            registerFee,
            escrowFee,
            feeRate,
            userRing,
            servicePubKey,
            80,
        );

        const rawCoin3 = {
            version: 1,
            height: -1,
            value: 100000000,
            hash: '2976420bdde79d63db2b7f0b07b89c45ea54334f38de266047337cf20677253c',
        };
        const coin3 = new Coin(rawCoin3);

        const commitTX3 = genCommitTx(
            [coin3],
            'bepis',
            80,
            commitFee,
            registerFee,
            escrowFee,
            feeRate,
            userRing,
            servicePubKey,
        );
        const lockTX3 = genLockTx(commitTX3,
            'bepis',
            registerFee,
            escrowFee,
            feeRate,
            userRing,
            servicePubKey,
            80,
        );

        const txs = [lockTX3, lockTX2, lockTX1, commitTX3, commitTX2, commitTX1];

        const spent = [
            [false, false, false],
            [false, false, false],
            [false, false, false],
            [false, false, true, false],
            [false, false, true, false],
            [false, false, true, false],
        ];

        const heights = [10, 10, 10, 1, 1, 1];

        const txList = new TXList(txs, spent, heights);

        const info = extractInfo(txList, servicePubKey, 12);

        const expectedInfo = {
            bepis: {
                txid: '0bfa628b8d4d06509af48b37c277798385ccb006ea36d34e1951e19065426bcb',
                expires: 90,
                pubKey: userPubKey,
            },
        };

        expect(info).toEqual(expectedInfo);
    });

    it('does not include a double name even after the original expires', async () => {
        const servicePubKey = Buffer.from('03f000da94f60417c76832179fd82ebfc614f5df9e67ffbc1717542ec460e8054c', 'hex');

        const userRing = KeyRing.fromSecret('cUBuNVHb5HVpStD1XbHgafDH1QSRwcxUTJmueQLnyzwz1f5wmRZB');
        const userPubKey = userRing.getPublicKey();

        const commitFee = 10000;
        const registerFee = 10000;
        const escrowFee = 20000;
        const feeRate = 1000;

        const rawCoin1 = {
            version: 1,
            height: -1,
            value: 100000000,
            hash: '453bbd02d4ef04be090ec79691e7f1749ac14141456c3394a513055fbc904bac',
        };
        const coin1 = new Coin(rawCoin1);

        const commitTX1 = genCommitTx(
            [coin1],
            'test',
            80,
            commitFee,
            registerFee,
            escrowFee,
            feeRate,
            userRing,
            servicePubKey,
        );
        const lockTX1 = genLockTx(
            commitTX1,
            'test',
            registerFee,
            escrowFee,
            feeRate,
            userRing,
            servicePubKey,
            80,
        );

        const rawCoin2 = {
            version: 1,
            height: -1,
            value: 100000000,
            hash: '0cbf90cc42ffdbef05fa261b5959187b8f44b629ac446881ef4445bc9cefd1ba',
        };
        const coin2 = new Coin(rawCoin2);

        const commitTX2 = genCommitTx(
            [coin2],
            'test',
            80,
            commitFee,
            registerFee,
            escrowFee,
            feeRate,
            userRing,
            servicePubKey,
        );
        const lockTX2 = genLockTx(
            commitTX2,
            'test',
            registerFee,
            escrowFee,
            feeRate,
            userRing,
            servicePubKey,
            80,
        );

        const rawCoin3 = {
            version: 1,
            height: -1,
            value: 100000000,
            hash: '2976420bdde79d63db2b7f0b07b89c45ea54334f38de266047337cf20677253c',
        };
        const coin3 = new Coin(rawCoin3);

        const commitTX3 = genCommitTx(
            [coin3],
            'bepis',
            80,
            commitFee,
            registerFee,
            escrowFee,
            feeRate,
            userRing,
            servicePubKey,
        );
        const lockTX3 = genLockTx(
            commitTX3,
            'bepis',
            registerFee,
            escrowFee,
            feeRate,
            userRing,
            servicePubKey,
            80,
        );

        const txs = [lockTX3, lockTX2, lockTX1, commitTX3, commitTX2, commitTX1];

        const spent = [
            [false, false, false],
            [false, false, false],
            [false, false, false],
            [false, false, true, false],
            [false, false, true, false],
            [false, false, true, false],
        ];

        const heights = [10, 10, 8, 1, 1, 1];

        const txList = new TXList(txs, spent, heights);

        const info = extractInfo(txList, servicePubKey, 12);

        const expectedInfo = {
            bepis: {
                txid: '0bfa628b8d4d06509af48b37c277798385ccb006ea36d34e1951e19065426bcb',
                expires: 90,
                pubKey: userPubKey,
            },
            test: {
                txid: '0f2cd13bc66afb8a15bfc10abf70b81d1741196dff42d9fc9cdda58c17012f0f',
                expires: 88,
                pubKey: userPubKey,
            },
        };

        expect(info).toEqual(expectedInfo);
    });

    it('does not include a revoked transaction', async () => {
        const servicePubKey = Buffer.from('03f000da94f60417c76832179fd82ebfc614f5df9e67ffbc1717542ec460e8054c', 'hex');

        const userRing = KeyRing.fromSecret('cUBuNVHb5HVpStD1XbHgafDH1QSRwcxUTJmueQLnyzwz1f5wmRZB');
        const userPubKey = userRing.getPublicKey();

        const commitFee = 10000;
        const registerFee = 10000;
        const escrowFee = 20000;
        const feeRate = 1000;

        const rawCoin1 = {
            version: 1,
            height: -1,
            value: 100000000,
            hash: '453bbd02d4ef04be090ec79691e7f1749ac14141456c3394a513055fbc904bac',
        };
        const coin1 = new Coin(rawCoin1);

        const commitTX1 = genCommitTx(
            [coin1],
            'test',
            80,
            commitFee,
            registerFee,
            escrowFee,
            feeRate,
            userRing,
            servicePubKey,
        );
        const lockTX1 = genLockTx(
            commitTX1,
            'test',
            registerFee,
            escrowFee,
            feeRate,
            userRing,
            servicePubKey,
            80,
        );
        const unlockTX1 = genUnlockTx(lockTX1, commitTX1, feeRate, false, userRing, servicePubKey);

        const txs = [unlockTX1, lockTX1, commitTX1];

        const spent = [
            [false],
            [false, true, false],
            [false, false, true, false],
        ];

        const heights = [10, 6, 1];

        const txList = new TXList(txs, spent, heights);

        const info = extractInfo(txList, servicePubKey, 12);

        const expectedInfo = {};

        expect(info).toEqual(expectedInfo);
    });
});
