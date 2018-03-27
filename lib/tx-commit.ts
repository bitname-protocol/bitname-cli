import{
    coin as Coin,
    keyring as KeyRing,
    crypto,
} from 'bcoin';

import{
    genCommitRedeemScript, 
} from './tx-generate';

import{
    genP2shAddr,
} from './txs.ts';


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
    const p2shAddr = genP2shAddr(redeemScript);

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
        address: userRing.getAddress(),
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
export {
    genCommitTx
};