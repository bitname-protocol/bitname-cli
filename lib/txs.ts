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
    genRedeemScript,
    genCommitRedeemScript,
} from './tx-generate';

import {
    BadUserPublicKeyError,
    BadServicePublicKeyError,
    BadLockTransactionError,
} from './errors';

import { verifyLockTX, isURISafe, verifyCommitTX } from './verify';

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

export {
    genP2shAddr,
    getLockTxName,
    getLockTxTime,
    getLockTxPubKey,
    serializeCommitData,
    deserializeCommitData,
};
