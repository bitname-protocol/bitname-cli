import { I64 } from 'n64';

import {
    script as Script,
    address as Address,
    output as Output,
    mtx as MTX,
    coin as Coin,
    tx as TX,
    keyring as KeyRing,
    crypto,
} from 'bcoin';

import randomBytes = require('randombytes');

import {
    BadUserPublicKeyError,
    BadServicePublicKeyError,
    BadLockTransactionError,
} from './errors';

import { verifyLockTX, isURISafe, verifyCommitTX } from './verify';

function genRedeemScript(userPubkey: Buffer, servicePubkey: Buffer, alocktime: number): Script {
    if (!crypto.secp256k1.publicKeyVerify(userPubkey)) {
        throw new BadUserPublicKeyError();
    }

    if (!crypto.secp256k1.publicKeyVerify(servicePubkey)) {
        throw new BadServicePublicKeyError();
    }

    const script = new Script(null);

    script.pushSym('OP_IF');

    script.pushInt(0);
    script.pushSym('OP_CHECKSEQUENCEVERIFY');
    script.pushSym('OP_DROP');

    script.pushData(userPubkey);
    script.pushSym('OP_CHECKSIG');

    script.pushSym('OP_ELSE');

    script.pushInt(alocktime);
    script.pushSym('OP_CHECKLOCKTIMEVERIFY');
    script.pushSym('OP_DROP');

    script.pushData(servicePubkey);
    script.pushSym('OP_CHECKSIG');

    script.pushSym('OP_ENDIF');

    script.compile();

    return script;
}

function genCommitRedeemScript(userPubkey: Buffer, nonce: Buffer, name: string, locktime: number): Script {
    if (!crypto.secp256k1.publicKeyVerify(userPubkey)) {
        throw new BadUserPublicKeyError();
    }

    const script = new Script();
    script.pushInt(1);
    script.pushSym('OP_CHECKSEQUENCEVERIFY');
    script.pushSym('OP_DROP');

    script.pushSym('OP_HASH256');

    const hashData = serializeCommitData(nonce, locktime, name);
    const hash = crypto.hash256(hashData);
    script.pushData(hash);
    script.pushSym('OP_EQUALVERIFY');

    script.pushData(userPubkey);
    script.pushSym('OP_CHECKSIG');

    script.compile();
    return script;
}

function genP2shAddr(redeemScript: Script): Address {
    const outputScript = Script.fromScripthash(redeemScript.hash160());
    const p2shAddr = Address.fromScript(outputScript);

    return p2shAddr;
}

function serializeCommitData(nonce: Buffer, locktime: number, name: string): Buffer {
    if (nonce.length !== 32) {
        throw new Error('Invalid nonce size');
    }

    if (locktime > 500000000) {
        throw new Error('Locktime must be less than 500000000 blocks');
    }

    if (name.length > 64) {
        throw new Error('Name is too long');
    }

    const outBuf = new Buffer(32 + 4 + 1 + name.length);
    nonce.copy(outBuf);

    outBuf.writeUInt32BE(locktime, 32);

    outBuf.writeUInt8(name.length, 36);

    outBuf.write(name, 37, name.length, 'ascii');

    return outBuf;
}

interface ICommitData {
    nonce: Buffer;
    locktime: number;
    name: string;
}

function deserializeCommitData(data: Buffer): ICommitData {
    if (data.length < 38) {
        throw new Error('Invalid commit data');
    }

    const nonce = data.slice(0, 32);

    const locktime = data.readUInt32BE(32);

    const nameLen = data.readUInt8(36);

    const nameRaw = data.slice(37);

    if (nameRaw.length !== nameLen) {
        throw new Error('Name has incorrect length');
    }

    const name = nameRaw.toString('ascii');

    return {
        nonce,
        locktime,
        name,
    };
}

function genCommitTx(coins: Coin[],
                     name: string,
                     locktime: number,
                     commitFee: number,
                     registerFee: number,
                     escrowFee: number,
                     feeRate: number,
                     userRing: KeyRing,
                     servicePubKey: Buffer): TX {
    if (name.length > 64) {
        throw new Error('Name is too long');
    }

    if (!isURISafe(name)) {
        throw new Error('Invalid character(s) in name');
    }

    if (!crypto.secp256k1.publicKeyVerify(servicePubKey)) {
        throw new Error('Invalid service public key');
    }

    const nonce = randomBytes(32);
    // console.log(nonce);
    const redeemScript = genCommitRedeemScript(userRing.getPublicKey(), nonce, name, locktime);
    const p2shAddr = genP2shAddr(redeemScript);

    const servicePKH = crypto.hash160(servicePubKey);
    const serviceAddr = Address.fromPubkeyhash(servicePKH);

    const lockTx = new MTX();

    const total = coins.reduce((acc, cur) => acc + cur.value, 0);

    for (const coin of coins) {
        lockTx.addCoin(coin);
    }

    const changeVal = total - (commitFee + registerFee + escrowFee) - (4 * feeRate);

    // Add nonce OP_RETURN as output 0
    const pubkeyDataScript = Script.fromNulldata(nonce);
    lockTx.addOutput(Output.fromScript(pubkeyDataScript, 0));

    // Add service upfront fee as output 1
    lockTx.addOutput({
        address: serviceAddr,
        value: commitFee,
    });

    // Add locked fee as output 2
    // Locks up the fee to register, the fee to be put in escrow, and enough for a 4kb tx at current rates
    lockTx.addOutput({
        address: p2shAddr,
        value: registerFee + escrowFee + 4 * feeRate,
    });

    console.log(changeVal);

    // Add change output as 3
    lockTx.addOutput({
        address: userRing.getAddress(),
        value: changeVal,
    });

    for (let i = 0; i < coins.length; ++i) {
        const coin = coins[i];
        lockTx.scriptInput(i, coin, userRing);
    }

    // Each signature is 72 bytes long
    const virtSize = lockTx.getVirtualSize() + coins.length * 72;
    lockTx.subtractIndex(3, Math.ceil(virtSize / 1000 * feeRate));

    for (let i = 0; i < coins.length; ++i) {
        const coin = coins[i];
        lockTx.signInput(i, coin, userRing, Script.hashType.ALL);
    }

    return lockTx.toTX();
}

function genLockTx(commitTX: TX,
                   name: string,
                   upfrontFee: number,
                   lockedFee: number,
                   feeRate: number,
                   userRing: KeyRing,
                   servicePubKey: Buffer,
                   locktime: number) {
    if (locktime > 500000000) {
        throw new Error('Locktime must be less than 500000000 blocks');
    }

    if (name.length > 64) {
        throw new Error('Name is too long');
    }

    if (!isURISafe(name)) {
        throw new Error('Invalid character(s) in name');
    }

    if (!crypto.secp256k1.publicKeyVerify(servicePubKey)) {
        throw new Error('Invalid service public key');
    }

    if (!verifyCommitTX(commitTX, userRing.getPublicKey(), servicePubKey, name, locktime)) {
        throw new Error('Invalid commitment tx');
    }

    const redeemScript = genRedeemScript(userRing.getPublicKey(), servicePubKey, locktime);
    const p2shAddr = genP2shAddr(redeemScript);

    const servicePKH = crypto.hash160(servicePubKey);
    const serviceAddr = Address.fromPubkeyhash(servicePKH);

    // const lockTx = new MTX();
    const lockTx = MTX.fromOptions({
        version: 2,
    });

    lockTx.addTX(commitTX, 2);

    lockTx.setSequence(0, 1);

    const total = commitTX.outputs[2].value;
    // console.log(total);

    // const total = coins.reduce((acc, cur) => acc + cur.value, 0);

    // for (const coin of coins) {
    //     lockTx.addCoin(coin);
    // }

    // const opRetVal = 0;

    // console.log(total, opRetVal, upfrontFee, lockedFee, netFee);
    // console.log(opRetVal + upfrontFee + lockedFee + netFee);

    const changeVal = total - upfrontFee - lockedFee;

    // Add upfront fee as output 0
    lockTx.addOutput({
        address: serviceAddr,
        value: upfrontFee,
    });

    // Add locked fee as output 1
    lockTx.addOutput({
        address: p2shAddr,
        value: lockedFee,
    });

    // Add change output as 2
    lockTx.addOutput({
        address: userRing.getAddress(),
        value: changeVal,
    });

    // for (let i = 0; i < coins.length; ++i) {
    //     const coin = coins[i];
    //     lockTx.scriptInput(i, coin, userRing);
    //     // lockTx.signInput(i, coin, ring, Script.hashType.ALL);
    // }

    // // Each signature is 72 bytes long
    // const virtSize = lockTx.getVirtualSize() + coins.length * 72;
    // // console.log(Math.ceil(virtSize / 1000 * feeRate));
    // lockTx.subtractIndex(4, Math.ceil(virtSize / 1000 * feeRate));

    // for (let i = 0; i < coins.length; ++i) {
    //     const coin = coins[i];
    //     // lockTx.scriptInput(i, coin, ring);
    //     lockTx.signInput(i, coin, userRing, Script.hashType.ALL);
    // }

    // const virtSize = lockTx.getVirtualSize();
    // lockTx.subtractFee(Math.ceil(virtSize / 1000 * feeRate), 0);

    const nonce = commitTX.outputs[0].script.code[1].data;

    const hashData = serializeCommitData(nonce, locktime, name);

    const commitRedeemScript = genCommitRedeemScript(userRing.getPublicKey(), nonce, name, locktime);

    const unlockScript = new Script();
    unlockScript.pushData(hashData);
    unlockScript.pushData(commitRedeemScript.toRaw());
    unlockScript.compile();

    lockTx.inputs[0].script = unlockScript;

    // console.log(lockTx.inputs[0].script.code);

    // Add constant for signature
    const virtSize = lockTx.getVirtualSize() + 72;

    // Calculate fee to be paid
    const fee = Math.ceil(virtSize / 1000 * feeRate);
    lockTx.subtractIndex(2, fee);

    // Add signature
    const sig = lockTx.signature(0, commitRedeemScript, total, userRing.getPrivateKey(), Script.hashType.ALL, 0);
    unlockScript.insertData(0, sig);
    unlockScript.compile();

    return lockTx.toTX();
}

function extractCommitMetadata(inputScript: Script) {
    // console.log(Script.fromRaw(inputScript.code[2].data).code[6].data);
    const meta = deserializeCommitData(inputScript.code[1].data);

    // const encumberScript = Script.fromRaw(inputScript.code[2].data);
    // const pubKey: Buffer = encumberScript.code[6].data;

    // return {...meta, pubKey};
    return meta;
}

function getLockTxName(lockTx: TX): string | null {
    try {
        const metadata = extractCommitMetadata(lockTx.inputs[0].script);

        return metadata.name;
    } catch (e) {
        return null;
    }
}

function getLockTxTime(lockTx: TX): number | null {
    try {
        const metadata = extractCommitMetadata(lockTx.inputs[0].script);

        return metadata.locktime;
    } catch (e) {
        return null;
    }
}

function getLockTxPubKey(lockTx: TX): Buffer | null {
    const inputScript = lockTx.inputs[0].script;

    if (inputScript.code.length < 3) {
        return null;
    }

    const encumberScript = Script.fromRaw(inputScript.code[2].data);

    if (encumberScript.code.length < 7) {
        return null;
    }

    const pubKey: Buffer = encumberScript.code[6].data;

    return pubKey;
}

function genUnlockTx(lockTx: TX,
                     commitTx: TX,
                     feeRate: number,
                     service: boolean,
                     ring: KeyRing,
                     otherPubKey: Buffer) {
    const servicePubKey =  service ? ring.getPublicKey() : otherPubKey;
    const userPubKey    = !service ? ring.getPublicKey() : otherPubKey;

    if (!verifyLockTX(lockTx, commitTx, servicePubKey)) {
        throw new BadLockTransactionError();
    }

    if (!crypto.secp256k1.publicKeyVerify(otherPubKey)) {
        throw new Error('Invalid service public key');
    }

    const locktime = getLockTxTime(lockTx);
    if (locktime === null) {
        throw new Error('Could not extract locktime');
    }

    const redeemScript = genRedeemScript(userPubKey, servicePubKey, locktime);

    const val = lockTx.outputs[1].value;
    const unlockTx = MTX.fromOptions({
        version: 2,
    });
    unlockTx.addTX(lockTx, 1);

    const boolVal = service ? 0 : 1;

    if (service) {
        // unlockTx.setSequence(0, locktime);
        unlockTx.setLocktime(locktime);
    } else {
        unlockTx.setSequence(0, 0);
    }

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
    unlockTx.subtractFee(fee);

    // Remake script with the new signature
    const unlockScript2 = new Script();
    unlockScript2.pushData(unlockTx.signature(0, redeemScript, val, ring.getPrivateKey(), Script.hashType.ALL, 0));
    unlockScript2.pushInt(boolVal);
    unlockScript2.pushData(redeemScript.toRaw());
    unlockScript2.compile();

    unlockTx.inputs[0].script = unlockScript2;

    return unlockTx.toTX();
}

export {
    genLockTx,
    genUnlockTx,
    genRedeemScript,
    genP2shAddr,
    getLockTxName,
    getLockTxTime,
    getLockTxPubKey,
    genCommitTx,
    genCommitRedeemScript,
    serializeCommitData,
    deserializeCommitData,
};
