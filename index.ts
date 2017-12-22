import { genLockTx, genUnlockTx, genRedeemScript, genP2shAddr } from './lib/txs';
import { fundTx, getFeesSatoshiPerKB } from './lib/net';
import { keyFromPass } from './lib/crypto';
import { KeyRing } from 'bcoin/lib/primitives';
import { config } from './config';
const NETWORK = config.network;

// const asdf = genLockTx()
async function main() {
    const LOCKTIME = 5;
    console.log(`Locking for ${LOCKTIME} blocks`);

    const masterKey = keyFromPass('correct horse stapler battery');
    const derivedKey = masterKey.derivePath("m/44'/1'/0'/0/0");
    console.log(derivedKey);
    const ring = KeyRing.fromOptions(derivedKey, NETWORK);
    console.log('Addr:\n' + ring.getAddress());
    console.log('WIF:\n' + ring.toSecret());

    const redeemScript = genRedeemScript(ring, LOCKTIME);

    const p2shAddr = genP2shAddr(redeemScript);
    console.log('To lock, send coins to: ' + p2shAddr.toBase58(NETWORK));

    const addr = ring.getAddress();

    const feeRate = await getFeesSatoshiPerKB();
    const upfrontFee = 1000000;
    const delayFee   = 1000000;
    // const delayFee =    100000;

    // const coin = await getBiggestUTXO(addr);
    // Fund up to a 2 KB transaction
    const coins = await fundTx(addr, upfrontFee + delayFee + 2 * feeRate);

    // const lockTx = genLockTx(ring, coins, 1000000, 100000, p2shAddr);
    const lockTx = genLockTx(ring, coins, 'test', upfrontFee, delayFee, feeRate, ring.getAddress(), p2shAddr);
    console.log('Lock TX:\n' + lockTx.toRaw().toString('hex'));

    const unlockTx = genUnlockTx(ring, lockTx, LOCKTIME, redeemScript);
    console.log('Unlock TX:\n' + unlockTx.toRaw().toString('hex'));
}

main().catch((err) => {
    throw err;
});
