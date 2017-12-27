import { verifyLockTX } from '../lib/verify';
import { genRedeemScript, genP2shAddr, genLockTx } from '../lib/txs';
import { keyring as KeyRing, coin as Coin } from 'bcoin';

describe('transaction verification', () => {
    it('generated txs pass verification', () => {
        const wif = 'cNJFgo1driFnPcBdBX8BrJrpxchBWXwXCvNH5SoSkdcF6JXXwHMm';
        const ring = KeyRing.fromSecret(wif);

        const redeemScript = genRedeemScript(ring, 5);

        const p2shAddr = genP2shAddr(redeemScript);

        const testCoin = {
            version: 1,
            height: -1,
            value: 100000000,
            hash: '453bbd02d4ef04be090ec79691e7f1749ac14141456c3394a513055fbc904bac',
        };

        const coins = [new Coin(testCoin)];
        const upfrontFee = 1000000;
        const delayFee = 1000000;
        const feeRate = 1;

        const tx = genLockTx(ring, coins, 'test', upfrontFee, delayFee, feeRate, ring.getAddress(), p2shAddr);

        expect(verifyLockTX(tx, ring.getAddress())).toBe(true);
    });
});
