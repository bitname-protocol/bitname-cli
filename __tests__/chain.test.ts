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
        const servicePubKey = Buffer.from('0320263f7b82e3885d89be9ef997b3d0fe80c5799ac6656884a49f3ec184746d93', 'hex');
        const userPubKey = Buffer.from('03c7ea37388348c29a52cbc02fc29bc85d7962c1eb4f72fe57d44b5cbe619b34c1', 'hex');

        const addr = Address.fromPubkeyhash(crypto.hash160(servicePubKey));
        const txList = await getAllTX(addr, 'testnet');

        const info = extractInfo(txList, servicePubKey, 1260170);

        const expectedInfo = {
            colin: {
                txid: 'a066cf6ddeded4f7185d264466f5401e3bff96efaafa0b404c33fe2874d828f1',
                expires: 1260172,
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
                txid: '28ef422e58800dd92ce5b3d68dccf04cefff8ef8112ce727aa1212c4e41d46b8',
                expires: 80,
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
                txid: '28ef422e58800dd92ce5b3d68dccf04cefff8ef8112ce727aa1212c4e41d46b8',
                expires: 80,
                pubKey: userPubKey,
            },
            test: {
                txid: 'd8593d257bac950c78b42e007b17e19311dec11ce9615ea0335640702fa7baf6',
                expires: 80,
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
