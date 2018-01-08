import {genCommitUnlockTx, genCommitTx, genLockTx} from './lib/txs';

import { fundTx, getFeesSatoshiPerKB, getAllTX, getBlockHeight, getTX, postTX } from './lib/net';

import {keyring as KeyRing, coin as Coin, util} from 'bcoin';

import chalk from 'chalk';
import { verifyCommitTX, verifyLockTX } from './lib/verify';

/* tslint:disable:no-console */
function error(msg: string): never {
    console.error(chalk`{red Error: ${msg}}`);
    process.exit(1);
    throw new Error('Somehow, exiting the process failed?');
}

function errorUnfoundTx(): never {
    return error('Could not find the transaction. Check the txid or try again later.');
}

function errorBadHRP() {
    return error('Invalid pubkey HRP');
}

function errorNoFees() {
    return error('Could not fetch fee information. Try again later.');
}

function errorInvalidLock() {
    return error('This is not a valid bitname registration tx');
}

function errorCantPush() {
    return error('There was a problem publishing the tx. Try again later.');
}

async function register() {
    const net = 'testnet';
    // const servicePubKey = decoded.pubKey;

    const wifData = 'cUBuNVHb5HVpStD1XbHgafDH1QSRwcxUTJmueQLnyzwz1f5wmRZB';
    const ring = KeyRing.fromSecret(wifData.trim());

    const servicePubKey = ring.getPublicKey();

    const addr = ring.getAddress();

    let feeRate: number;
    try {
        feeRate = await getFeesSatoshiPerKB(net);
    } catch (err) {
        return errorNoFees();
    }

    const commitUpfrontFee =  500000;
    const commitDelayFee   = 1500000;

    const lockUpfrontFee = commitUpfrontFee;
    const lockDelayFee   = 1000000;

    // Fund up to a 2 KB transaction
    let coins: Coin[];
    try {
        coins = await fundTx(addr, commitUpfrontFee + 2 * commitDelayFee + 2 * feeRate, net);
    } catch (err) {
        return error('Could not fund the transaction');
    }

    try {
        const commitTx = genCommitTx(coins, 'test', commitUpfrontFee, 2 * commitDelayFee, feeRate, ring, servicePubKey);
        const txidStr = chalk`{green ${util.revHex(commitTx.hash('hex')) as string}}`;

        console.log(txidStr);
        console.log(commitTx.toRaw().toString('hex'));
        console.log(verifyCommitTX(commitTx, ring.getPublicKey(), servicePubKey, 'test'));

        // const uncommitTx = genCommitUnlockTx(commitTx, feeRate, ring, 'test');
        // console.log('\n\n' + uncommitTx.toRaw().toString('hex'));

        const lockTx = genLockTx(commitTx, 'test', lockUpfrontFee, lockDelayFee, feeRate, ring, servicePubKey, 1);
        console.log('\n\n' + lockTx.toRaw().toString('hex'));
        console.log(verifyLockTX(lockTx, servicePubKey));
    } catch (err) {
        return error('Could not generate transaction: ' + err.message);
    }
}

register();
