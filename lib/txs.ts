import { I64 } from 'n64';

import {
    Script,
} from 'bcoin/lib/script';

import {
    Address,
    Output,
} from 'bcoin/lib/primitives';

import {
    MTX,
} from 'bcoin/lib/primitives/mtx';

import {
    Amount,
} from 'bcoin/lib/btc';

function makeEncumberScript(pubkey, rlocktime) {
    const script = new Script(null);
    script.pushData(pubkey);
    script.pushSym('OP_CHECKSIG');
    script.pushSym('OP_DROP');
    script.pushSym('OP_1');

    const num = I64(rlocktime);

    const numBuff = num.toLE(Buffer);

    let min = numBuff.length - 1;
    while (min > 1) {
        if (numBuff[min] === 0) {
            min -= 1;
        } else {
            break;
        }
    }
    script.pushData(numBuff.slice(0, min));
    script.pushSym('OP_CHECKSEQUENCEVERIFY');
    script.pushSym('OP_DROP');
    script.compile();

    return script;
}

function genRedeemScript(ring, locktime) {
    return makeEncumberScript(ring.getPublicKey(), locktime);
}

function genP2shAddr(redeemScript) {
    const outputScript = Script.fromScripthash(redeemScript.hash160());
    const p2shAddr = Address.fromScript(outputScript);

    return p2shAddr;
}

function genLockTx(ring, coins, name, upfrontFee, lockedFee, netFee, serviceAddr, p2shAddr) {
    const lockTx = new MTX(null);

    const total = coins.reduce((acc, cur) => acc + cur.value, 0);

    for (const coin of coins) {
        lockTx.addCoin(coin);
    }

    const opRetVal = 1;

    console.log(total, opRetVal, upfrontFee, lockedFee, netFee);
    console.log(opRetVal + upfrontFee + lockedFee + netFee);

    const changeVal = total - opRetVal - upfrontFee - lockedFee - netFee;

    // Add change output as 0
    lockTx.addOutput({
        address: ring.getAddress(),
        value: changeVal,
    }, null);

    // Add OP_RETURN as output 1
    const dataScript = Script.fromNulldata(Buffer.from(name, 'utf-8'));
    lockTx.addOutput(Output.fromScript(dataScript, opRetVal), null);

    // Add upfront fee as output 2
    lockTx.addOutput({
        address: serviceAddr,
        value: upfrontFee,
    }, null);

    // Add locked fee as output 3
    lockTx.addOutput({
        address: p2shAddr,
        value: lockedFee,
    }, null);

    for (let i = 0; i < coins.length; ++i) {
        const coin = coins[i];
        lockTx.scriptInput(i, coin, ring);
        lockTx.signInput(i, coin, ring, Script.hashType.ALL);
    }

    return lockTx.toTX();
}

function genUnlockTx(ring, lockTx, locktime, redeemScript) {
    const val = lockTx.outputs[3].value;
    const unlockTx = MTX.fromOptions({
        version: 2,
    });
    unlockTx.addTX(lockTx, 3);
    unlockTx.setSequence(0, locktime);

    // console.log(val);

    unlockTx.addOutput({
        address: ring.getAddress(),
        value: val - 100000,
    });

    const unlockScript = new Script();
    unlockScript.pushData(unlockTx.signature(0, redeemScript, val, ring.getPrivateKey(), Script.hashType.ALL, 0));
    unlockScript.pushData(redeemScript.toRaw());
    unlockScript.compile();

    unlockTx.inputs[0].script = unlockScript;

    console.log(unlockTx.getMinFee());

    return unlockTx.toTX();
}

export { genLockTx, genUnlockTx, genRedeemScript, genP2shAddr };
