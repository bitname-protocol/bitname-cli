import {
    tx as TX,
    output as Output,
    address as Address,
    crypto,
} from 'bcoin';
import { genRedeemScript } from './txs';
import { I64 } from 'n64';

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

function verifyLockTX(tx: TX, servicePubKey: Buffer): boolean {
    if (tx.outputs.length < 4) {
        return false;
    }

    // Check that output 0 is an OP_RETURN of the correct form
    if (!isValidOP_RETURN(tx.outputs[0])) {
        return false;
    }

    // Check that output 0 contains a valid pubkey
    const pubKey = tx.outputs[0].script.code[1].data;
    if (!crypto.secp256k1.publicKeyVerify(pubKey)) {
        return false;
    }

    // Check that output 1 is an OP_RETURN of the correct form
    if (!isValidOP_RETURN(tx.outputs[1])) {
        console.log('failed on validopret');
        return false;
    }

    // Check that output 1 name data is only 64 bytes in length
    const rawNameData = tx.outputs[1].script.code[1].data;
    const name = rawNameData.slice(2);
    const nameStr = name.toString('ascii');
    if (name.length > 64) {
        console.log('failed on len');
        return false;
    }

    // Check that output 1 name data contains only URL-safe characters
    if (!isURISafe(nameStr)) {
        return false;
    }

    // Check that output 2 is a P2PKH or P2SH
    if (!tx.outputs[2].script.isPubkeyhash() &&
        !tx.outputs[2].script.isScripthash()) {
        return false;
    }

    // Check that output 2 is sent to the service's address
    const servicePKH = crypto.hash160(servicePubKey);
    const serviceAddr = Address.fromPubkeyhash(servicePKH);
    if (tx.outputs[2].getAddress().toBase58('testnet') !== serviceAddr.toBase58('testnet')) {
        return false;
    }

    // Check that output 3 is a P2SH
    if (!tx.outputs[3].script.isScripthash()) {
        return false;
    }

    // Check that output 3 script is correct
    const locktimeData = rawNameData.slice(0, 2);
    const locktimeI64 = I64.fromString(locktimeData.toString('hex'), 16);
    const redeemScript = genRedeemScript(pubKey, servicePubKey, locktimeI64.toNumber());
    const scriptHash = crypto.hash160(redeemScript.toRaw());
    const p2shAddr = Address.fromScripthash(scriptHash);
    if (tx.outputs[3].getAddress().toBase58('testnet') !== p2shAddr.toBase58('testnet')) {
        console.log('failed on addr');
        return false;
    }

    return true;
}

export {verifyLockTX};
