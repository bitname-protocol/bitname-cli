import { I64 } from 'n64';

import {
    script as Script,
    address as Address,
    output as Output,
    mtx as MTX,
    amount as Amount,
    coin as Coin,
    tx as TX,
    keyring as KeyRing,
    crypto,
} from 'bcoin';

import { BadUserPublicKeyError, BadServicePublicKeyError } from './errors';

import { config } from '../config';
const NETWORK = config.network;

function genRedeemScript(userPubkey: Buffer, servicePubkey: Buffer, rlocktime: number): Script {
    if (!crypto.secp256k1.publicKeyVerify(userPubkey)) {
        throw new BadUserPublicKeyError();
    }

    if (!crypto.secp256k1.publicKeyVerify(servicePubkey)) {
        throw new BadServicePublicKeyError();
    }

    const script = new Script(null);

    script.pushSym('OP_IF');

    script.pushData(userPubkey);
    script.pushSym('OP_CHECKSIG');

    script.pushSym('OP_ELSE');

    const num = I64(rlocktime);

    const numBuff = num.toLE(Buffer);

    let min = numBuff.length - 1;
    while (min > 1) {
        if (numBuff[min] === 0) {
            min -= 1;
        } else {
            break;
        }
    }
    script.pushData(numBuff.slice(0, min));

    script.pushSym('OP_CHECKSEQUENCEVERIFY');
    script.pushSym('OP_DROP');

    script.pushData(servicePubkey);
    script.pushSym('OP_CHECKSIG');

    script.pushSym('OP_ENDIF');

    script.compile();

    return script;
}

function genP2shAddr(redeemScript: Script): Address {
    const outputScript = Script.fromScripthash(redeemScript.hash160());
    const p2shAddr = Address.fromScript(outputScript);

    return p2shAddr;
}

function genLockTx(coins: Coin[],
                   name: string,
                   upfrontFee: number,
                   lockedFee: number,
                   feeRate: number,
                   userRing: KeyRing,
                   servicePubKey: Buffer,
                   locktime: number) {
    const redeemScript = genRedeemScript(userRing.getPublicKey(), servicePubKey, locktime);
    const p2shAddr = genP2shAddr(redeemScript);

    const servicePKH = crypto.hash160(servicePubKey);
    const serviceAddr = Address.fromPubkeyhash(servicePKH, NETWORK);

    const lockTx = new MTX();

    const total = coins.reduce((acc, cur) => acc + cur.value, 0);

    for (const coin of coins) {
        lockTx.addCoin(coin);
    }

    const opRetVal = 0;

    // console.log(total, opRetVal, upfrontFee, lockedFee, netFee);
    // console.log(opRetVal + upfrontFee + lockedFee + netFee);

    const changeVal = total - opRetVal - upfrontFee - lockedFee;

    // Add pubkey OP_RETURN as output 0
    const pubkeyDataScript = Script.fromNulldata(userRing.getPublicKey());
    lockTx.addOutput(Output.fromScript(pubkeyDataScript, opRetVal));

    // Add name OP_RETURN as output 1
    const dataScript = Script.fromNulldata(Buffer.from(name, 'utf-8'));
    lockTx.addOutput(Output.fromScript(dataScript, opRetVal));

    // Add upfront fee as output 2
    lockTx.addOutput({
        address: serviceAddr,
        value: upfrontFee,
    });

    // Add locked fee as output 3
    lockTx.addOutput({
        address: p2shAddr,
        value: lockedFee,
    });

    // Add change output as 4
    lockTx.addOutput({
        address: userRing.getAddress(),
        value: changeVal,
    });

    for (let i = 0; i < coins.length; ++i) {
        const coin = coins[i];
        lockTx.scriptInput(i, coin, userRing);
        // lockTx.signInput(i, coin, ring, Script.hashType.ALL);
    }

    // Each signature is 72 bytes long
    const virtSize = lockTx.getVirtualSize() + coins.length * 72;
    lockTx.subtractFee(Math.ceil(virtSize / 1000 * feeRate), 0);

    for (let i = 0; i < coins.length; ++i) {
        const coin = coins[i];
        // lockTx.scriptInput(i, coin, ring);
        lockTx.signInput(i, coin, userRing, Script.hashType.ALL);
    }

    // const virtSize = lockTx.getVirtualSize();
    // lockTx.subtractFee(Math.ceil(virtSize / 1000 * feeRate), 0);

    return lockTx.toTX();
}

function genUnlockTx(lockTx: TX,
                     feeRate: number,
                     service: boolean,
                     ring: KeyRing,
                     otherPubKey: Buffer,
                     locktime: number) {
    const servicePubKey =  service ? ring.getPublicKey() : otherPubKey;
    const userPubKey    = !service ? ring.getPublicKey() : otherPubKey;

    const redeemScript = genRedeemScript(userPubKey, servicePubKey, locktime);

    const val = lockTx.outputs[3].value;
    const unlockTx = MTX.fromOptions({
        version: 2,
    });
    unlockTx.addTX(lockTx, 3);

    const boolVal = service ? 0 : 1;

    if (service) {
        unlockTx.setSequence(0, locktime);
    }

    // console.log(val);

    // const pkh = crypto.hash160(service ? servicePubKey : userPubKey);
    // const addr = Address.fromPubkeyhash(pkh, NETWORK);

    unlockTx.addOutput({
        address: ring.getAddress(),
        value: val,
    });

    const unlockScript = new Script();
    unlockScript.pushData(unlockTx.signature(0, redeemScript, val, ring.getPrivateKey(), Script.hashType.ALL, 0));
    unlockScript.pushInt(boolVal);
    unlockScript.pushData(redeemScript.toRaw());
    unlockScript.compile();

    unlockTx.inputs[0].script = unlockScript;

    // console.log(unlockTx.outputs);

    // console.log('size: ', unlockTx.getVirtualSize());

    const virtSize = unlockTx.getVirtualSize();
    const fee = Math.ceil(virtSize / 1000 * feeRate);
    console.log(fee, unlockTx.outputs[0].value);
    unlockTx.subtractFee(fee, 0);

    // Remake script with the new signature
    const unlockScript2 = new Script();
    unlockScript2.pushData(unlockTx.signature(0, redeemScript, val, ring.getPrivateKey(), Script.hashType.ALL, 0));
    unlockScript2.pushInt(boolVal);
    unlockScript2.pushData(redeemScript.toRaw());
    unlockScript2.compile();

    unlockTx.inputs[0].script = unlockScript2;

    return unlockTx.toTX();
}

export { genLockTx, genUnlockTx, genRedeemScript, genP2shAddr };
