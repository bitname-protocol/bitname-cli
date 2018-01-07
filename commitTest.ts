import {genCommitUnlockTx, genCommitTx} from './lib/txs';

import { fundTx, getFeesSatoshiPerKB, getAllTX, getBlockHeight, getTX, postTX } from './lib/net';

import {keyring as KeyRing, coin as Coin, util} from 'bcoin';

import chalk from 'chalk';

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

    const upfrontFee = 1000000;
    const delayFee   = 1000000;

    // Fund up to a 2 KB transaction
    let coins: Coin[];
    try {
        coins = await fundTx(addr, upfrontFee + delayFee + 2 * feeRate, net);
    } catch (err) {
        return error('Could not fund the transaction');
    }

    try {
        const commitTx = genCommitTx(coins, 'test', upfrontFee, delayFee, feeRate, ring, servicePubKey);
        const txidStr = chalk`{green ${util.revHex(commitTx.hash('hex')) as string}}`;

        console.log(txidStr);
        console.log(commitTx.toRaw().toString('hex'));

        const uncommitTx = genCommitUnlockTx(commitTx, feeRate, ring, 'test');
        console.log('\n\n' + uncommitTx.toRaw().toString('hex'));
    } catch (err) {
        return error('Could not generate transaction: ' + err.message);
    }
}

register();
