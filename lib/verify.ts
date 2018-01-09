import {
    tx as TX,
    output as Output,
    address as Address,
    crypto,
} from 'bcoin';
import {
    genRedeemScript,
    genCommitRedeemScript,
    getLockTxName,
    getLockTxTime,
    extractCommitMetadata,
    getLockTxPubKey,
} from './txs';

function isURISafe(str: string) {
    const re = /^[a-zA-Z0-9_\-\.\~]*$/;
    return re.test(str);
}

function isValidOP_RETURN(output: Output): boolean {
    // Check that output 0 is an OP_RETURN
    if (!output.script.isNulldata()) {
        return false;
    }

    // Check that output 0 contains 0 satoshis
    if (output.value !== 0) {
        return false;
    }

    // Check that output 0 contains exactly 2 opcodes
    if (output.script.length !== 2) {
        return false;
    }

    return true;
}

/* tslint:disable:no-console */
function verifyCommitTX(tx: TX, userPubKey: Buffer, servicePubKey: Buffer, name: string, locktime: number): boolean {
    if (tx.outputs.length < 3) {
        return false;
    }

    // Check that output 0 is an OP_RETURN of the correct form
    if (!isValidOP_RETURN(tx.outputs[0])) {
        console.log(tx.outputs[0]);
        console.log('failed at opret');
        return false;
    }

    // Check that output 0 contains a 32-byte nonce
    const nonce = tx.outputs[0].script.code[1].data;
    if (nonce.length !== 32) {
        console.log('failed at nonce');
        return false;
    }

    // Check that output 1 is sent to the service's address
    const servicePKH = crypto.hash160(servicePubKey);
    const serviceAddr = Address.fromPubkeyhash(servicePKH);
    if (tx.outputs[1].getAddress().toBase58('testnet') !== serviceAddr.toBase58('testnet')) {
        return false;
    }

    // Check that output 2 is a P2SH
    if (!tx.outputs[2].script.isScripthash()) {
        return false;
    }

    // Check that output 2 script is correct
    const redeemScript = genCommitRedeemScript(userPubKey, nonce, name, locktime);
    const scriptHash = crypto.hash160(redeemScript.toRaw());
    const p2shAddr = Address.fromScripthash(scriptHash);
    if (tx.outputs[2].getAddress().toBase58('testnet') !== p2shAddr.toBase58('testnet')) {
        return false;
    }

    return true;
}

function verifyLockTX(tx: TX, commitTX: TX, servicePubKey: Buffer): boolean {
    if (tx.outputs.length < 2) {
        console.log('failed at outputs length');
        return false;
    }

    // Check that input 0 contains a valid pubkey
    const pubKey = getLockTxPubKey(tx);
    if (pubKey === null || !crypto.secp256k1.publicKeyVerify(pubKey)) {
        console.log('failed at pubkey verification');
        return false;
    }

    // Check that input 0 name data is only 64 bytes in length
    const nameStr = getLockTxName(tx);
    if (nameStr === null) {
        return false;
    }

    if (nameStr.length > 64) {
        console.log('failed at name length');
        return false;
    }

    // Check that output 1 name data contains only URL-safe characters
    if (!isURISafe(nameStr)) {
        console.log('failed at uri safety');
        return false;
    }

    // Check that output 0 is a P2PKH
    if (!tx.outputs[0].script.isPubkeyhash()) {
        console.log('failed at output 0 being pkh');
        return false;
    }

    // Check that output 0 is sent to the service's address
    const servicePKH = crypto.hash160(servicePubKey);
    const serviceAddr = Address.fromPubkeyhash(servicePKH);
    if (tx.outputs[0].getAddress().toBase58('testnet') !== serviceAddr.toBase58('testnet')) {
        return false;
    }

    // Check that output 1 is a P2SH
    if (!tx.outputs[1].script.isScripthash()) {
        return false;
    }

    // Check that output 1 script is correct
    const locktime = getLockTxTime(tx);
    if (locktime === null) {
        return false;
    }
    const redeemScript = genRedeemScript(pubKey, servicePubKey, locktime);
    const scriptHash = crypto.hash160(redeemScript.toRaw());
    const p2shAddr = Address.fromScripthash(scriptHash);
    if (tx.outputs[1].getAddress().toBase58('testnet') !== p2shAddr.toBase58('testnet')) {
        return false;
    }

    // Check that input 0 is a valid commit TX
    if (!verifyCommitTX(commitTX, pubKey, servicePubKey, nameStr, locktime)) {
        console.log('failed at verifycommittx');
        return false;
    }

    return true;
}

export {verifyLockTX, isURISafe, verifyCommitTX};
