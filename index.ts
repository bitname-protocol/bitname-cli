// import { genLockTx, genUnlockTx, genRedeemScript, genP2shAddr } from './lib/txs';
// import { fundTx, getFeesSatoshiPerKB, getAllTX, getBlockHeight } from './lib/net';
// import { keyFromPass } from './lib/crypto';
// import { verifyLockTX } from './lib/verify';
// import { extractInfo } from './lib/chain';
// // import { KeyRing } from 'bcoin/lib/primitives';
// import {
//     keyring as KeyRing,
// } from 'bcoin';
// import { config } from './config';
// const NETWORK = config.network;

// // const asdf = genLockTx()
// async function main() {
//     const LOCKTIME = 30;
//     console.log(`Locking for ${LOCKTIME} blocks`);

//     const masterKey = keyFromPass('correct horse stapler battery');
//     const derivedKey = masterKey.derivePath("m/44'/1'/0'/0/0");
//     console.log(derivedKey);
//     const ring = KeyRing.fromOptions(derivedKey, NETWORK);
//     console.log('Addr:\n' + ring.getAddress());
//     console.log('WIF:\n' + ring.toSecret());

//     const redeemScript = genRedeemScript(ring.getPublicKey(), ring.getPublicKey(), LOCKTIME);

//     const p2shAddr = genP2shAddr(redeemScript);
//     console.log('To lock, send coins to: ' + p2shAddr.toBase58(NETWORK));

//     const addr = ring.getAddress();
//     const pubKey = ring.getPublicKey();

//     const feeRate = await getFeesSatoshiPerKB();
//     const upfrontFee = 1000000;
//     const delayFee   = 1000000;
//     // const delayFee =    100000;

//     // const coin = await getBiggestUTXO(addr);
//     // Fund up to a 2 KB transaction
//     const coins = await fundTx(addr, upfrontFee + delayFee + 2 * feeRate);

//     console.log(coins);

//     const lockTx = genLockTx(coins, 'boop', upfrontFee, delayFee, feeRate, ring, ring.getPublicKey(), LOCKTIME);
//     console.log('Lock TX:\n' + lockTx.toRaw().toString('hex'));
//     console.log(verifyLockTX(lockTx, pubKey));

//     // const unlockTx = genUnlockTx(ring, lockTx, LOCKTIME, redeemScript, feeRate, false);
//     const unlockTx = genUnlockTx(lockTx, feeRate, false, ring, ring.getPublicKey());
//     console.log('Unlock TX:\n' + unlockTx.toRaw().toString('hex'));
//     console.log(verifyLockTX(unlockTx, pubKey));

//     const txList = await getAllTX(addr);
//     // console.log
//     const curHeight = await getBlockHeight();
//     console.log(extractInfo(txList, ring.getPublicKey(), curHeight));
// }

// main().catch((err) => {
//     console.error(err);
// });

/* tslint:disable:no-console */

import * as yargs from 'yargs';
import {
    utils,
    keyring as KeyRing,
    coin as Coin,
    tx as TX,
    address as Address,
    crypto,
    util,
} from 'bcoin';
import { genLockTx, genUnlockTx } from './lib/txs';
import { keyFromPass } from './lib/crypto';
import { fundTx, getFeesSatoshiPerKB, getAllTX, getBlockHeight, getTX, postTX } from './lib/net';
import { extractInfo } from './lib/chain';

import * as fs from 'fs';
import { verifyLockTX } from './lib/verify';

import chalk from 'chalk';

async function register(argv: yargs.Arguments) {
    const decoded = utils.bech32.decode(argv.servicePubKey);
    if (decoded.hrp !== 'pk' && decoded.hrp !== 'tp') {
        console.error('Invalid pubkey HRP');
        process.exit(1);
    }

    let net = 'main';
    if (decoded.hrp === 'tp') {
        net = 'testnet';
    }

    const servicePubKey = decoded.hash;

    let ring: KeyRing;

    if (typeof argv.password !== 'undefined') {
        const masterKey = keyFromPass(argv.password, net);
        const derivedKey = masterKey.derivePath("m/44'/1'/0'/0/0");
        ring = KeyRing.fromOptions(derivedKey, net);
    } else if (typeof argv.wif !== 'undefined') {
        const wifData = fs.readFileSync(argv.wif, 'utf8');
        ring = KeyRing.fromSecret(wifData.trim());
    } else {
        console.error('Specify a password or WIF key!');
        process.exit(1);
        return;
    }

    const addr = ring.getAddress();
    const pubKey = ring.getPublicKey();

    let feeRate: number;
    try {
        feeRate = await getFeesSatoshiPerKB(net);
    } catch (err) {
        console.error('There was a problem fetching fee information:');
        console.error('    ' + err.message);
        process.exit(1);
        return;
    }

    const upfrontFee = 1000000;
    const delayFee   = 1000000;

    // Fund up to a 2 KB transaction
    let coins: Coin[];
    try {
        coins = await fundTx(addr, upfrontFee + delayFee + 2 * feeRate, net);
    } catch (err) {
        console.error('There was a problem funding the transaction:');
        console.error('    ' + err.message);
        process.exit(1);
        return;
    }

    try {
        const lockTx = genLockTx(coins,
                                 argv.name,
                                 upfrontFee,
                                 delayFee,
                                 feeRate,
                                 ring,
                                 servicePubKey,
                                 argv.locktime);
        const txidStr = chalk`{green ${util.revHex(lockTx.hash('hex')) as string}}`;

        if (argv.push) {
            try {
                await postTX(lockTx, net);
                console.log(txidStr);
            } catch (err) {
                console.error('There was a problem publishing the transaction:');
                console.error('    ' + err.message);
                process.exit(1);
                return;
            }
        } else {
            console.log(txidStr);
            console.log(lockTx.toRaw().toString('hex'));
        }
    } catch (err) {
        console.error('There was a problem generating the transaction:');
        console.error('    ' + err.message);
        process.exit(1);
    }
}

async function revoke(argv: yargs.Arguments) {
    const decoded = utils.bech32.decode(argv.servicePubKey);
    if (decoded.hrp !== 'pk' && decoded.hrp !== 'tp') {
        console.error('Invalid pubkey HRP');
        process.exit(1);
    }

    let net = 'main';
    if (decoded.hrp === 'tp') {
        net = 'testnet';
    }

    const servicePubKey = decoded.hash;

    let ring: KeyRing;

    if (typeof argv.password !== 'undefined') {
        const masterKey = keyFromPass(argv.password, net);
        const derivedKey = masterKey.derivePath("m/44'/1'/0'/0/0");
        ring = KeyRing.fromOptions(derivedKey, net);
    } else if (typeof argv.wif !== 'undefined') {
        const wifData = fs.readFileSync(argv.wif, 'utf8');
        ring = KeyRing.fromSecret(wifData.trim());
    } else {
        console.error('Specify a password or WIF key!');
        process.exit(1);
        return;
    }

    // console.log(argv);

    let lockTX: TX;
    try {
        lockTX = await getTX(argv.txid, net);
    } catch (err) {
        console.error('There was a problem finding this transaction:');
        console.error('    ' + err.message);
        process.exit(1);
        return;
    }

    if (!verifyLockTX(lockTX, servicePubKey)) {
        console.error('This tx is not a valid bitname registration');
        process.exit(1);
    }

    let feeRate: number;
    try {
        feeRate = await getFeesSatoshiPerKB(net);
    } catch (err) {
        console.error('There was a problem fetching fee information:');
        console.error('    ' + err.message);
        process.exit(1);
        return;
    }

    const unlockTx = genUnlockTx(lockTX, feeRate, false, ring, servicePubKey);
    const txidStr = chalk`{green ${util.revHex(unlockTx.hash('hex')) as string}}`;

    if (argv.push) {
        try {
            await postTX(unlockTx, net);
            console.log(txidStr);
        } catch (err) {
            console.error('There was a problem publishing the transaction:');
            console.error('    ' + err.message);
            process.exit(1);
            return;
        }
    } else {
        console.log(txidStr);
        console.log(unlockTx.toRaw().toString('hex'));
    }
}

async function serviceSpend(argv: yargs.Arguments) {
    const net = argv.testnet ? 'testnet' : 'main';

    let ring: KeyRing;

    if (typeof argv.password !== 'undefined') {
        const masterKey = keyFromPass(argv.password, net);
        const derivedKey = masterKey.derivePath("m/44'/1'/0'/0/0");
        ring = KeyRing.fromOptions(derivedKey, net);
    } else if (typeof argv.wif !== 'undefined') {
        const wifData = fs.readFileSync(argv.wif, 'utf8');
        ring = KeyRing.fromSecret(wifData.trim());
    } else {
        console.error('Specify a password or WIF key!');
        process.exit(1);
        return;
    }

    const servicePubKey = ring.getPublicKey();

    // console.log(argv);

    let lockTX: TX;
    try {
        lockTX = await getTX(argv.txid, net);
    } catch (err) {
        console.error('There was a problem finding this transaction:');
        console.error('    ' + err.message);
        process.exit(1);
        return;
    }

    if (!verifyLockTX(lockTX, servicePubKey)) {
        console.error('This tx is not a valid bitname registration');
        process.exit(1);
    }

    let feeRate: number;
    try {
        feeRate = await getFeesSatoshiPerKB(net);
    } catch (err) {
        console.error('There was a problem fetching fee information:');
        console.error('    ' + err.message);
        process.exit(1);
        return;
    }

    const unlockTx = genUnlockTx(lockTX, feeRate, true, ring, servicePubKey);
    const txidStr = chalk`{green ${util.revHex(unlockTx.hash('hex')) as string}}`;

    if (argv.push) {
        try {
            await postTX(unlockTx, net);
            console.log(txidStr);
        } catch (err) {
            console.error('There was a problem publishing the transaction:');
            console.error('    ' + err.message);
            process.exit(1);
            return;
        }
    } else {
        console.log(txidStr);
        console.log(unlockTx.toRaw().toString('hex'));
    }
}

async function allNames(argv: yargs.Arguments) {
    const decoded = utils.bech32.decode(argv.servicePubKey);
    if (decoded.hrp !== 'pk' && decoded.hrp !== 'tp') {
        console.error('Invalid pubkey HRP');
        process.exit(1);
    }

    let net = 'main';
    if (decoded.hrp === 'tp') {
        net = 'testnet';
    }

    const addr = Address.fromPubkeyhash(crypto.hash160(decoded.hash));

    const txList = await getAllTX(addr, net);
    const curHeight = await getBlockHeight(net);
    const info = extractInfo(txList, decoded.hash, curHeight);
    for (const key in info) {
        if (!info.hasOwnProperty(key)) {
            continue;
        }
        const encKey = utils.bech32.encode(decoded.hrp, 0, info[key].pubKey);
        console.log(chalk`{green ${key}}\n{blue txid} ${info[key].txid}\n{blue pubk} ${encKey}\n`);
    }
}

function main() {
    /* tslint:disable:no-unused-expression */
    yargs
        .strict()
        .demandCommand(1, 'Please specify a command')
        .command('register <servicePubKey> <name> <locktime>', 'register a name with the service', (yargsObj) => {
            return yargsObj
                .positional('servicePubKey', {
                    type: 'string',
                    describe: 'the public key of the service',
                })
                .positional('name', {
                    type: 'string',
                    describe: 'the name to register',
                })
                .positional('locktime', {
                    type: 'number',
                    describe: 'how many blocks (up to 65535) to hold the name for',
                })
                .option('password', {
                    alias: 'p',
                    type: 'string',
                    describe: 'brainwallet password',
                })
                .option('wif', {
                    alias: 'w',
                    type: 'string',
                    describe: 'path to WIF file',
                })
                .option('push', {
                    type: 'boolean',
                    describe: 'whether to push this transaction to the network',
                });
        }, register)
        .command('revoke <txid> <servicePubKey>', 'revoke a name', (yargsObj) => {
            return yargsObj
                .positional('txid', {
                    type: 'string',
                    describe: 'the txid of the registering transaction',
                })
                .positional('servicePubKey', {
                    type: 'string',
                    describe: 'the public key of the service',
                })
                .option('password', {
                    alias: 'p',
                    type: 'string',
                    describe: 'brainwallet password',
                })
                .option('wif', {
                    alias: 'w',
                    type: 'string',
                    describe: 'path to WIF file',
                })
                .option('push', {
                    type: 'boolean',
                    describe: 'whether to push this transaction to the network',
                });
        }, revoke)
        .command('service-spend <txid>', 'spend locked fee sent to a service you control', (yargsObj) => {
            return yargsObj
                .positional('txid', {
                    type: 'string',
                    describe: 'the txid of the registering transaction',
                })
                .option('testnet', {
                    type: 'boolean',
                    describe: 'is this a testnet service?',
                })
                .option('password', {
                    alias: 'p',
                    type: 'string',
                    describe: 'brainwallet password',
                })
                .option('wif', {
                    alias: 'w',
                    type: 'string',
                    describe: 'path to WIF file',
                })
                .option('push', {
                    type: 'boolean',
                    describe: 'whether to push this transaction to the network',
                });
        }, serviceSpend)
        .command('all-names <servicePubKey>', 'get all current names registered with a service', (yargsObj) => {
            return yargsObj
                .positional('servicePubKey', {
                    type: 'string',
                    describe: 'the public key of the service',
                });
        }, allNames)
        .version('0.0.1')
        .help()
        .argv;
}

// main().catch((err) => {
//     console.error(err);
// });
main();
