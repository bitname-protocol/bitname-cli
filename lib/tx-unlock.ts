import{
    tx as TX,
    keyring as KeyRing,
    crypto
} from 'bcoin';

import{
    getLockTxTime,
} from './txs.ts';

import{
    genRedeemScript,
    genCommitRedeemScript, 
} from './tx-generate';


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
        address: ring.getAddress(),
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
    
    genUnlockTx,
};