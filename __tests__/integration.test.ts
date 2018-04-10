import Client from 'bitcoin-core';
import {
    keyring as KeyRing,
} from 'bcoin';

import { genLockTx, genUnlockTx, genCommitTx, getLockTxPubKey } from '../lib/txs';
import { fundTx, getFeesSatoshiPerKB, getAllTX, getBlockHeight, getTX, postTX } from '../lib/net';

import { onlineCommitTx } from '../bin/commit-tx-gen';

describe('Network integration testing', async () => {
    const client = new Client({
        port: 12001,
        username: 'user',
        password: 'password',
        version: '0.16.0',
        host: '127.0.0.1',
        network: 'regtest',
    });

    const userWif = 'cSfYjfhSotRuhYx7n8ttCFdbHRZiMxwdmBPyJb2BZBous96sbSkh';
    const userRing = KeyRing.fromSecret(userWif);
    const userAddr = userRing.getAddress();
    const serviceWif = 'cMb11yoKHey8fp26zXV1vbeGCmw62nXJ8SVQJ6Uk2vdK6mEQyhNX';
    const serviceRing = KeyRing.fromSecret(serviceWif);
    const servicePubKey = serviceRing.getPublicKey();

    beforeAll(async () => {
        const curBlocks = await client.getBlockCount();
        if (curBlocks < 101) {
            await client.generate(101);
        } else {
            await client.generate(1);
        }

        await client.sendToAddress(userAddr.toBase58('testnet'), 10);
    });

    it('Publishes a commit tx', async () => {
        const curBlocks = await client.getBlockCount();

        await onlineCommitTx(servicePubKey, 'regtest', userWif, 'test1', curBlocks + 20, true);
    });
});
