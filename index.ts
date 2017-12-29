import { genLockTx, genUnlockTx, genRedeemScript, genP2shAddr } from './lib/txs';
import { fundTx, getFeesSatoshiPerKB } from './lib/net';
import { keyFromPass } from './lib/crypto';
import { verifyLockTX } from './lib/verify';
// import { KeyRing } from 'bcoin/lib/primitives';
import {
    keyring as KeyRing,
} from 'bcoin';
import { config } from './config';
const NETWORK = config.network;

// const asdf = genLockTx()
async function main() {
    const LOCKTIME = 1;
    console.log(`Locking for ${LOCKTIME} blocks`);

    const masterKey = keyFromPass('correct horse stapler battery');
    const derivedKey = masterKey.derivePath("m/44'/1'/0'/0/0");
    console.log(derivedKey);
    const ring = KeyRing.fromOptions(derivedKey, NETWORK);
    console.log('Addr:\n' + ring.getAddress());
    console.log('WIF:\n' + ring.toSecret());

    const redeemScript = genRedeemScript(ring.getPublicKey(), ring.getPublicKey(), LOCKTIME);

    const p2shAddr = genP2shAddr(redeemScript);
    console.log('To lock, send coins to: ' + p2shAddr.toBase58(NETWORK));

    const addr = ring.getAddress();
    const pubKey = ring.getPublicKey();

    const feeRate = await getFeesSatoshiPerKB();
    const upfrontFee = 1000000;
    const delayFee   = 1000000;
    // const delayFee =    100000;

    // const coin = await getBiggestUTXO(addr);
    // Fund up to a 2 KB transaction
    const coins = await fundTx(addr, upfrontFee + delayFee + 2 * feeRate);

    console.log(coins);

    const lockTx = genLockTx(coins, 'test', upfrontFee, delayFee, feeRate, ring, ring.getPublicKey(), LOCKTIME);
    console.log('Lock TX:\n' + lockTx.toRaw().toString('hex'));
    console.log(verifyLockTX(lockTx, pubKey));

    // const unlockTx = genUnlockTx(ring, lockTx, LOCKTIME, redeemScript, feeRate, false);
    const unlockTx = genUnlockTx(lockTx, feeRate, false, ring, ring.getPublicKey(), LOCKTIME);
    console.log('Unlock TX:\n' + unlockTx.toRaw().toString('hex'));
    console.log(verifyLockTX(unlockTx, pubKey));
}

main().catch((err) => {
    console.error(err);
});
