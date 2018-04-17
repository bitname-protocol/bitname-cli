import * as yargs from 'yargs';
import {
    keyring as KeyRing,
    coin as Coin,
    tx as TX,
    address as Address,
    crypto,
    util,
} from 'bcoin';
import { genLockTx, genUnlockTx, genCommitTx, getLockTxPubKey } from '../lib/txs';
import { fundTx, getFeesSatoshiPerKB, getAllTX, getBlockHeight, getTX, postTX } from '../lib/net';
import { extractInfo } from '../lib/chain';

import * as fs from 'fs';
import * as path from 'path';
import { verifyLockTX } from '../lib/verify';
import { bech32Encode, bech32Decode } from '../lib/utils';

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

async function commit(argv: yargs.Arguments) {
    const decoded = bech32Decode(argv.servicePubKey);
    if (decoded === null) {
        return errorBadHRP();
    }

    const net = decoded.network;
    const servicePubKey = decoded.pubKey;

    const wifData = fs.readFileSync(path.resolve(argv.wif), 'utf8');
    const ring = KeyRing.fromSecret(wifData.trim());

    const addr = ring.getAddress();

    let feeRate: number;
    try {
        feeRate = await getFeesSatoshiPerKB(net);
    } catch (err) {
        return errorNoFees();
    }

    const commitFee = 500000;
    const registerFee = 500000;
    const escrowFee = 1000000;

    // Fund up to a 2 KB transaction
    let coins: Coin[];
    try {
        coins = await fundTx(addr, commitFee + registerFee + escrowFee + 8 * feeRate, net);
    } catch (err) {
        return error('Could not fund the transaction');
    }

    try {
        const commitTx = genCommitTx(coins,
                                     argv.name,
                                     argv.locktime,
                                     commitFee,
                                     registerFee,
                                     escrowFee,
                                     feeRate,
                                     ring,
                                     servicePubKey);
        const txidStr = chalk`{green ${util.revHex(commitTx.hash('hex')) as string}}`;

        if (argv.push) {
            try {
                await postTX(commitTx, net);
                console.log(txidStr);
            } catch (err) {
                return errorCantPush();
            }
        } else {
            console.log(txidStr);
            console.log(commitTx.toRaw().toString('hex'));
        }
    } catch (err) {
        return error('Could not generate transaction: ' + err.message);
    }
}

async function register(argv: yargs.Arguments) {
    const decoded = bech32Decode(argv.servicePubKey);
    if (decoded === null) {
        return errorBadHRP();
    }

    const net = decoded.network;
    const servicePubKey = decoded.pubKey;

    const wifData = fs.readFileSync(path.resolve(argv.wif), 'utf8');
    const ring = KeyRing.fromSecret(wifData.trim());

    let feeRate: number;
    try {
        feeRate = await getFeesSatoshiPerKB(net);
    } catch (err) {
        return errorNoFees();
    }

    const upfrontFee =  500000;
    const delayFee   = 1000000;

    let commitTX: TX;
    try {
        commitTX = await getTX(argv.txid, net);
    } catch (err) {
        return error('Could not find the commit tx');
    }

    try {
        const lockTx = genLockTx(commitTX,
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
                return errorCantPush();
            }
        } else {
            console.log(txidStr);
            console.log(lockTx.toRaw().toString('hex'));
        }
    } catch (err) {
        return error('Could not generate transaction: ' + err.message);
    }
}

async function revoke(argv: yargs.Arguments) {
    const decoded = bech32Decode(argv.servicePubKey);
    if (decoded === null) {
        return errorBadHRP();
    }

    const net = decoded.network;
    const servicePubKey = decoded.pubKey;

    const wifData = fs.readFileSync(path.resolve(argv.wif), 'utf8');
    const ring = KeyRing.fromSecret(wifData.trim());

    let lockTX: TX;
    try {
        lockTX = await getTX(argv.txid, net);
    } catch (err) {
        return errorUnfoundTx();
    }

    let commitTX: TX;
    try {
        commitTX = await getTX(util.revHex(lockTX.inputs[0].prevout.hash) as string, net);
    } catch (err) {
        return errorUnfoundTx();
    }

    if (!verifyLockTX(lockTX, commitTX, servicePubKey)) {
        return errorInvalidLock();
    }

    let feeRate: number;
    try {
        feeRate = await getFeesSatoshiPerKB(net);
    } catch (err) {
        return errorNoFees();
    }

    const unlockTx = genUnlockTx(lockTX, commitTX, feeRate, false, ring, servicePubKey);
    const txidStr = chalk`{green ${util.revHex(unlockTx.hash('hex')) as string}}`;

    if (argv.push) {
        try {
            await postTX(unlockTx, net);
            console.log(txidStr);
        } catch (err) {
            return errorCantPush();
        }
    } else {
        console.log(txidStr);
        console.log(unlockTx.toRaw().toString('hex'));
    }
}

async function serviceSpend(argv: yargs.Arguments) {
    const net = argv.network;

    const wifData = fs.readFileSync(path.resolve(argv.wif), 'utf8');
    const ring = KeyRing.fromSecret(wifData.trim());

    const servicePubKey = ring.getPublicKey();

    let lockTX: TX;
    try {
        lockTX = await getTX(argv.txid, net);
    } catch (err) {
        return errorUnfoundTx();
    }

    let commitTX: TX;
    try {
        commitTX = await getTX(util.revHex(lockTX.inputs[0].prevout.hash as string), net);
    } catch (err) {
        return errorUnfoundTx();
    }

    if (!verifyLockTX(lockTX, commitTX, servicePubKey)) {
        return errorInvalidLock();
    }

    const userPubKey = getLockTxPubKey(lockTX);
    if (userPubKey === null) {
        return errorInvalidLock();
    }

    let feeRate: number;
    try {
        feeRate = await getFeesSatoshiPerKB(net);
    } catch (err) {
        return errorNoFees();
    }

    const unlockTx = genUnlockTx(lockTX, commitTX, feeRate, true, ring, userPubKey);
    const txidStr = chalk`{green ${util.revHex(unlockTx.hash('hex')) as string}}`;

    if (argv.push) {
        try {
            await postTX(unlockTx, net);
            console.log(txidStr);
        } catch (err) {
            return errorCantPush();
        }
    } else {
        console.log(txidStr);
        console.log(unlockTx.toRaw().toString('hex'));
    }
}

async function allNames(argv: yargs.Arguments) {
    const decoded = bech32Decode(argv.servicePubKey);
    if (decoded === null) {
        return errorBadHRP();
    }

    const net = decoded.network;
    const servicePubKey = decoded.pubKey;

    const addr = Address.fromPubkeyhash(crypto.hash160(servicePubKey));

    const txList = await getAllTX(addr, net);
    const curHeight = await getBlockHeight(net);
    const info = extractInfo(txList, servicePubKey, curHeight);
    for (const key in info) {
        if (!info.hasOwnProperty(key)) {
            continue;
        }
        const encKey = bech32Encode(info[key].pubKey, net);

        console.log(chalk`{green ${key}}\n{blue txid} ${info[key].txid}\n{blue pubk} ${encKey}\n`);
    }
}

function keyGen(argv: yargs.Arguments) {
    const net = argv.network === 'regtest' ? 'testnet' : argv.network;
    const ring = KeyRing.generate(net);

    const wif = ring.toSecret(net);
    const pubKeyRaw = ring.getPublicKey();

    const encPK = bech32Encode(pubKeyRaw, net);

    const addr = ring.getAddress().toBase58(net);

    console.log(chalk`{magenta secret} ${wif}\n{blue pubk}   ${encPK}\n{blue addr}   ${addr}`);

    if (typeof argv.out !== 'undefined') {
        try {
            fs.writeFileSync(path.resolve(argv.out), wif, 'utf8');
        } catch (err) {
            return error(`Could not write to ${argv.out}`);
        }
    }
}

function keyInfo(argv: yargs.Arguments) {
    let data: string;
    try {
        data = fs.readFileSync(path.resolve(argv.file), 'utf8');
    } catch (err) {
        return error(`Could not read ${argv.file}`);
    }

    const ring = KeyRing.fromSecret(data.trim());
    const net = argv.network;

    const pubKeyRaw = ring.getPublicKey();

    const encPK = bech32Encode(pubKeyRaw, net);

    // bitcoind uses the same address constants for regtest and testnet
    // bcoin does not, so we have to do a little modification
    const shimNet = net === 'regtest' ? 'testnet' : net;

    const addr = ring.getAddress().toBase58(shimNet);

    console.log(chalk`{blue pubk} ${encPK}\n{blue addr} ${addr}`);
}

function main() {
    /* tslint:disable:no-unused-expression */
    yargs
        .strict()
        .demandCommand(1, 'Please specify a command')
        .command('commit <servicePubKey> <name> <locktime>', 'commit to intent to register a name', (yargsObj) => {
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
                    describe: 'the block height (up to 499999999) until which the name should be valid',
                })
                .option('wif', {
                    alias: 'w',
                    type: 'string',
                    describe: 'path to WIF file',
                    demandOption: true,
                })
                .option('push', {
                    type: 'boolean',
                    describe: 'whether to push this transaction to the network',
                });
        }, commit)
        .command('register <servicePubKey> <txid> <name> <locktime>',
                 'register a name with the service', (yargsObj) => {
            return yargsObj
                .positional('servicePubKey', {
                    type: 'string',
                    describe: 'the public key of the service',
                })
                .positional('txid', {
                    type: 'string',
                    describe: 'the txid of the commit transaction',
                })
                .positional('name', {
                    type: 'string',
                    describe: 'the name to register',
                })
                .positional('locktime', {
                    type: 'number',
                    describe: 'the block height (up to 499999999) until which the name should be valid',
                })
                .option('wif', {
                    alias: 'w',
                    type: 'string',
                    describe: 'path to WIF file',
                    demandOption: true,
                })
                .option('push', {
                    type: 'boolean',
                    describe: 'whether to push this transaction to the network',
                });
        }, register)
        .command('revoke <servicePubKey> <txid>', 'revoke a name', (yargsObj) => {
            return yargsObj
                .positional('txid', {
                    type: 'string',
                    describe: 'the txid of the registering transaction',
                })
                .positional('servicePubKey', {
                    type: 'string',
                    describe: 'the public key of the service',
                })
                .option('wif', {
                    alias: 'w',
                    type: 'string',
                    describe: 'path to WIF file',
                    demandOption: true,
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
                .option('wif', {
                    alias: 'w',
                    type: 'string',
                    describe: 'path to WIF file',
                    demandOption: true,
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
        .command('key-gen', 'generate a new priv/pub keypair', (yargsObj) => {
            return yargsObj
                .option('out', {
                    alias: 'o',
                    type: 'string',
                    describe: 'write WIF to a file',
                });
        }, keyGen)
        .command('key-info <file>', 'get information about a private key', (yargsObj) => {
            return yargsObj
                .positional('file', {
                    type: 'string',
                    describe: 'the WIF file containing the private key',
                });
        }, keyInfo)
        .option('network', {
            alias: 'n',
            type: 'string',
            describe: 'the network on which to operate',
            choices: ['main', 'testnet', 'regtest'],
            default: 'main',
            global: true,
        })
        .help()
        .argv;
}

main();
