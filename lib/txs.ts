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

import randomBytes from 'randombytes';

import {
    BadUserPublicKeyError,
    BadServicePublicKeyError,
    BadLockTransactionError,
} from './errors';

import { verifyLockTX, isURISafe, verifyCommitTX } from './verify';

/**
 * Generate a redeem script, removing a name/key pair from the blockchain.
 * Validates `userPubkey` and `servicePubkey`.
 *
 * @param userPubkey The user's public key.
 * @param servicePubkey The service's public key.
 * @param alocktime An absolute lock time, in blocks.
 */
function genRedeemScript(userPubkey: Buffer, servicePubkey: Buffer, alocktime: number): Script {
    // Validate user public key
    if (!crypto.secp256k1.publicKeyVerify(userPubkey)) {
        throw new BadUserPublicKeyError();
    }

    // Validate service public key
    if (!crypto.secp256k1.publicKeyVerify(servicePubkey)) {
        throw new BadServicePublicKeyError();
    }

    const script = new Script(null);

    script.pushSym('OP_IF');

    //
    // If spending as user, execute this branch

    // Verify that 0 <= current block size - commit block size
    script.pushInt(0);
    script.pushSym('OP_CHECKSEQUENCEVERIFY');
    script.pushSym('OP_DROP');

    // Check the provided user signature
    script.pushData(userPubkey);
    script.pushSym('OP_CHECKSIG');

    script.pushSym('OP_ELSE');

    //
    // Otherwise, if spending as service, execute this branch

    // Verify that alocktime <= current block size
    script.pushInt(alocktime);
    script.pushSym('OP_CHECKLOCKTIMEVERIFY');
    script.pushSym('OP_DROP');

    // Check the provided service signature
    script.pushData(servicePubkey);
    script.pushSym('OP_CHECKSIG');

    script.pushSym('OP_ENDIF');

    script.compile();

    return script;
}

/**
 * Generate a commit redeem script.
 * @param userPubkey The user's public key.
 * @param nonce A 256-bit buffer representing a nonce.
 * @param name A name of at most 64 characters composed of URL-safe characters.
 * @param locktime An absolute lock time, in blocks.
 */
function genCommitRedeemScript(userPubkey: Buffer, nonce: Buffer, name: string, locktime: number): Script {
    // Validate user public key
    if (!crypto.secp256k1.publicKeyVerify(userPubkey)) {
        throw new BadUserPublicKeyError();
    }

    const script = new Script();

    // Verify that at least six blocks have passed since commit
    script.pushInt(6);
    script.pushSym('OP_CHECKSEQUENCEVERIFY');
    script.pushSym('OP_DROP');

    //
    // Hash [256-bit nonce + 2-byte locktime (BE) + 1-byte length of name + name]
    // and check against parameters.
    script.pushSym('OP_HASH256');

    const hashData = serializeCommitData(nonce, locktime, name);
    const hash = crypto.hash256(hashData);
    script.pushData(hash);
    script.pushSym('OP_EQUALVERIFY');

    // Check user signature
    script.pushData(userPubkey);
    script.pushSym('OP_CHECKSIG');

    script.compile();
    return script;
}

// TODO update to support P2WSH
/**
 * Generate a P2SH address from a redeem script.
 * @param redeemScript The script to use.
 */
function genP2shAddr(redeemScript: Script): Address {
    const outputScript = Script.fromScripthash(redeemScript.hash160());
    const p2shAddr = Address.fromScript(outputScript);

    return p2shAddr;
}

/**
 * Encode `nonce`, `locktime`, and `name` into a buffer of length
 * `32 + 4 + 1 + name.length`.
 * @param nonce 256-bit nonce.
 * @param locktime Lock time of at most 500000000 blocks.
 * @param name Name of at most length 64 containing URL-safe characters.
 */
function serializeCommitData(nonce: Buffer, locktime: number, name: string): Buffer {
    // Verify nonce size
    if (nonce.length !== 32) {
        throw new Error('Invalid nonce size');
    }
    // Verify lock time is within bounds
    if (locktime > 500000000) {
        throw new Error('Locktime must be less than 500000000 blocks');
    }
    // Verify name is within bounds
    if (name.length > 64) {
        throw new Error('Name is too long');
    }

    // Create a new buffer. Write no
    const outBuf = new Buffer(32 + 4 + 1 + name.length);
    nonce.copy(outBuf);

    outBuf.writeUInt32BE(locktime, 32);

    outBuf.writeUInt8(name.length, 36);

    outBuf.write(name, 37, name.length, 'ascii');

    return outBuf;
}

export interface ICommitData {
    nonce: Buffer;
    locktime: number;
    name: string;
}

/**
 * Convert bytestream `data` into human-readable form. The first 32 bytes are
 * the nonce, followed by 32 bytes representing the locktime, then a 4-byte
 * integer representing the name length, then up to 64 bytes representing the
 * name.
 * @param data Binary data to decode.
 */
function deserializeCommitData(data: Buffer): ICommitData {
    if (data.length < 38) {
        throw new Error('Invalid commit data');
    }

    const nonce = data.slice(0, 32);

    const locktime = data.readUInt32BE(32);

    const nameLen = data.readUInt8(36);

    const nameRaw = data.slice(37);

    // Verify the specified name length equals the actual length
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

/**
 * Generate a commit transaction.
 * @param coins Array of coins to fund the transaction.
 * @param name Name for name/key pair.
 * @param locktime Absolute locktime
 * @param commitFee Commit fee, in satoshis.
 * @param registerFee Registration fee, in satoshis.
 * @param escrowFee Escrow fee, in satoshis.
 * @param feeRate Fee rate, in satoshis/kilobyte.
 * @param userRing The user's key ring.
 * @param servicePubKey Service public key.
 */
function genCommitTx(coins: Coin[],
                     name: string,
                     locktime: number,
                     commitFee: number,
                     registerFee: number,
                     escrowFee: number,
                     feeRate: number,
                     userRing: KeyRing,
                     servicePubKey: Buffer): TX {
    //
    // Validate name and the service public key
    if (name.length > 64) {
        throw new Error('Name is too long');
    }

    if (!isURISafe(name)) {
        throw new Error('Invalid character(s) in name');
    }

    if (!crypto.secp256k1.publicKeyVerify(servicePubKey)) {
        throw new Error('Invalid service public key');
    }

    // Generate a P2SH address from a redeem script, using a random nonce
    const nonce = randomBytes(32);
    const redeemScript = genCommitRedeemScript(userRing.getPublicKey(), nonce, name, locktime);
    const p2shAddr = genP2shAddr(redeemScript); // TODO update for P2WSH

    // Generate service address from service public key
    const servicePKH = crypto.hash160(servicePubKey);
    const serviceAddr = Address.fromPubkeyhash(servicePKH);

    const lockTx = new MTX();

    // Compute total value of coins
    const total = coins.reduce((acc, cur) => acc + cur.value, 0);

    for (const coin of coins) {
        lockTx.addCoin(coin);
    }

    // Compute change amount
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

    // Add change output as 3
    lockTx.addOutput({
        address: userRing.getAddress(), // TODO userRing.getNestedAddress(),
        value: changeVal,
    });

    // Add coins as inputs
    for (let i = 0; i < coins.length; ++i) {
        const coin = coins[i];
        lockTx.scriptInput(i, coin, userRing);
    }

    // Each signature is 72 bytes long
    const virtSize = lockTx.getVirtualSize() + coins.length * 72;
    lockTx.subtractIndex(3, Math.ceil(virtSize / 1000 * feeRate));

    // Sign the coins
    for (let i = 0; i < coins.length; ++i) {
        const coin = coins[i];
        lockTx.signInput(i, coin, userRing, Script.hashType.ALL);
    }

    return lockTx.toTX();
}

/**
 * Generate a lock transaction.
 * @param commitTX The corresponding commit transaction.
 * @param name The name to use.
 * @param upfrontFee The upfront fee in satoshis to use the service, as
 * determined by the service.
 * @param lockedFee Fee incentivizing registrar to provide service, as
 * determined by the service.
 * @param feeRate Fee rate in satoshi/KB.
 * @param userRing The user key ring.
 * @param servicePubKey Service public key.
 * @param locktime Absolute lock time in blocks.
 */
function genLockTx(commitTX: TX,
                   name: string,
                   upfrontFee: number,
                   lockedFee: number,
                   feeRate: number,
                   userRing: KeyRing,
                   servicePubKey: Buffer,
                   locktime: number): TX {
    //
    // Input validation
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

    // Generate a P2SH address from redeem script
    const redeemScript = genRedeemScript(userRing.getPublicKey(), servicePubKey, locktime);
    const p2shAddr = genP2shAddr(redeemScript); // TODO update for P2WSH

    // Generate address from service public key
    const servicePKH = crypto.hash160(servicePubKey);
    const serviceAddr = Address.fromPubkeyhash(servicePKH);

    const lockTx = MTX.fromOptions({
        version: 2,
    });

    lockTx.addTX(commitTX, 2);

    lockTx.setSequence(0, 6);

    const total = commitTX.outputs[2].value;

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
        address: userRing.getAddress(), // TODO userRing.getNestedAddress(),
        value: changeVal,
    });

    const nonce = commitTX.outputs[0].script.code[1].data;

    const hashData = serializeCommitData(nonce, locktime, name);

    const commitRedeemScript = genCommitRedeemScript(userRing.getPublicKey(), nonce, name, locktime);

    const unlockScript = new Script();
    unlockScript.pushData(hashData);
    unlockScript.pushData(commitRedeemScript.toRaw());
    unlockScript.compile();

    lockTx.inputs[0].script = unlockScript;

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

/**
 * Extract metadata from a script (i.e. the nonce, locktime, and name).
 * @param inputScript Script to read from.
 */
function extractCommitMetadata(inputScript: Script): ICommitData {
    const meta = deserializeCommitData(inputScript.code[1].data);

    return meta;
}

/**
 * Attempt to extract a name from a lock transaction.
 * @param lockTx Lock transaction to read from.
 * @returns The name if present, and `null` otherwise.
 */
function getLockTxName(lockTx: TX): string | null {
    try {
        const metadata = extractCommitMetadata(lockTx.inputs[0].script);

        return metadata.name;
    } catch (e) {
        return null;
    }
}

/**
 * Attempt to extract a time lock from a lock transaction.
 * @param lockTx Lock transaction to read from.
 * @returns The lock time if present, and `null` otherwise.
 */
function getLockTxTime(lockTx: TX): number | null {
    try {
        const metadata = extractCommitMetadata(lockTx.inputs[0].script);

        return metadata.locktime;
    } catch (e) {
        return null;
    }
}

/**
 * Attempt to extract a public key from a lock transaction.
 * @param lockTx Lock transaction to read from.
 * @returns The public key if present, and `null` otherwise.
 */
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

/**
 * Generate an unlock transaction.
 * @param lockTx The corresponding lock transaction.
 * @param commitTx The corresponding commit transaction.
 * @param feeRate The fee rate in satoshi/KB.
 * @param service Whether to use the script as service.
 * @param ring The service key ring if `service`, otherwise user key ring.
 * @param otherPubKey The user key ring if `service`, otherwise service key ring.
 */
function genUnlockTx(lockTx: TX,
                     commitTx: TX,
                     feeRate: number,
                     service: boolean,
                     ring: KeyRing,
                     otherPubKey: Buffer): TX {
    // Disambiguate ring public key and the other public key
    const servicePubKey =  service ? ring.getPublicKey() : otherPubKey;
    const userPubKey    = !service ? ring.getPublicKey() : otherPubKey;

    //
    // Input validation
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

    const val = lockTx.outputs[1].value; // the P2SH output
    const unlockTx = MTX.fromOptions({
        version: 2,
    });

    unlockTx.addTX(lockTx, 1);

    const boolVal = service ? 0 : 1;

    if (service) {
        unlockTx.setLocktime(locktime);
    } else {
        unlockTx.setSequence(0, 0);
    }

    unlockTx.addOutput({
        address: ring.getAddress(), // TODO ring.getNestedAddress(),
        value: val,
    });

    // Generate new script: <sig> <isUser> <redeemScript>
    const unlockScript = new Script();
    unlockScript.pushData(unlockTx.signature(0, redeemScript, val, ring.getPrivateKey(), Script.hashType.ALL, 0));
    unlockScript.pushInt(boolVal);
    unlockScript.pushData(redeemScript.toRaw());
    unlockScript.compile();

    unlockTx.inputs[0].script = unlockScript;

    // Compute a fee by multiplying the size by the rate, then account for it
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
