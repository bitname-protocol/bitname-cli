import {
	script as Script,
	crypto
} from 'bcoin';

import {
    BadUserPublicKeyError,
    BadServicePublicKeyError,
} from './errors';

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