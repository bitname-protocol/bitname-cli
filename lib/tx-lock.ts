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
    const p2shAddr = genP2shAddr(redeemScript);

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
        address: userRing.getAddress(),
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