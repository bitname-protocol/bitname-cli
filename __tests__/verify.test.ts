import { verifyLockTX } from '../lib/verify';
import { genRedeemScript, genP2shAddr, genLockTx } from '../lib/txs';
import {
    keyring as KeyRing,
    coin as Coin,
    tx as TX,
    mtx as MTX,
    address as Address,
    script as Script,
    output as Output,
} from 'bcoin';

import * as fs from 'fs';
import * as path from 'path';

describe('transaction verification', () => {
    it('verifies valid locking tx', () => {
        const txDataPath = path.resolve(__dirname, 'data', 'valid_lock_tx.tx');
        const txData = fs.readFileSync(txDataPath, 'utf8').trim();

        const tx = TX.fromRaw(txData, 'hex');

        const servicePubKey = Buffer.from('036d6e6cf57a88d39fee39b88721dcd5afbb18e5d078888293eaf5eee2fbc4cd36', 'hex');

        expect(verifyLockTX(tx, servicePubKey)).toBe(true);
    });

    it('fails on fewer than 2 outputs', () => {
        const txDataPath = path.resolve(__dirname, 'data', 'valid_lock_tx.tx');
        const txData = fs.readFileSync(txDataPath, 'utf8').trim();
        const mtx = MTX.fromRaw(txData, 'hex');

        const servicePubKey = Buffer.from('036d6e6cf57a88d39fee39b88721dcd5afbb18e5d078888293eaf5eee2fbc4cd36', 'hex');

        mtx.outputs = mtx.outputs.slice(0, 1);

        const tx = mtx.toTX();

        expect(verifyLockTX(tx, servicePubKey)).toBe(false);
    });

    it('fails on output 0 not being an OP_RETURN', () => {
        const txDataPath = path.resolve(__dirname, 'data', 'valid_lock_tx.tx');
        const txData = fs.readFileSync(txDataPath, 'utf8').trim();
        const mtx = MTX.fromRaw(txData, 'hex');

        const servicePubKey = Buffer.from('036d6e6cf57a88d39fee39b88721dcd5afbb18e5d078888293eaf5eee2fbc4cd36', 'hex');
        const otherKey = Buffer.from('02a1633cafcc01ebfb6d78e39f687a1f0995c62fc95f51ead10a02ee0be551b5dc', 'hex');

        // Generate a script of any other kind
        const newScript = Script.fromMultisig(1, 2, [servicePubKey, otherKey]);

        const oldVal = mtx.outputs[0].value;

        // This new output will also be a P2SH, so we're sure it's not just checking for that
        const newOutput = Output.fromScript(newScript.getAddress(), oldVal);

        mtx.outputs[0] = newOutput;

        const tx = mtx.toTX();

        expect(verifyLockTX(tx, servicePubKey)).toBe(false);
    });

    // it('fails on output 0 having value > 0', () => {
    //     const txDataPath = path.resolve(__dirname, 'data', 'valid_lock_tx.tx');
    //     const txData = fs.readFileSync(txDataPath, 'utf8').trim();
    //     const mtx = MTX.fromRaw(txData, 'hex');

    //     const servicePubKey = Buffer.from('036d6e6cf57a88d39fee39b88721dcd5afbb18e5d078888293eaf5eee2fbc4cd36', 'hex');

    //     mtx.outputs[0].value = 10;

    //     const tx = mtx.toTX();

    //     expect(verifyLockTX(tx, servicePubKey)).toBe(false);
    // });

    // it('fails on output 0 having more than 2 ops', () => {
    //     const txDataPath = path.resolve(__dirname, 'data', 'valid_lock_tx.tx');
    //     const txData = fs.readFileSync(txDataPath, 'utf8').trim();
    //     const mtx = MTX.fromRaw(txData, 'hex');

    //     const servicePubKey = Buffer.from('036d6e6cf57a88d39fee39b88721dcd5afbb18e5d078888293eaf5eee2fbc4cd36', 'hex');

    //     const pubkeyDataScript = Script.fromNulldata(servicePubKey);
    //     pubkeyDataScript.pushData(Buffer.from('asdf'));
    //     pubkeyDataScript.compile();
    //     mtx.outputs[0] = Output.fromScript(pubkeyDataScript, mtx.outputs[0].value);

    //     const tx = mtx.toTX();

    //     expect(verifyLockTX(tx, servicePubKey)).toBe(false);
    // });

    // it('fails on output 0 not containing a public key', () => {
    //     const txDataPath = path.resolve(__dirname, 'data', 'valid_lock_tx.tx');
    //     const txData = fs.readFileSync(txDataPath, 'utf8').trim();
    //     const mtx = MTX.fromRaw(txData, 'hex');

    //     const servicePubKey = Buffer.from('036d6e6cf57a88d39fee39b88721dcd5afbb18e5d078888293eaf5eee2fbc4cd36', 'hex');

    //     const pubkeyDataScript = Script.fromNulldata(Buffer.from('zip zap zop'));
    //     pubkeyDataScript.compile();
    //     mtx.outputs[0] = Output.fromScript(pubkeyDataScript, mtx.outputs[0].value);

    //     const tx = mtx.toTX();

    //     expect(verifyLockTX(tx, servicePubKey)).toBe(false);
    // });

    // it('fails on output 1 not being an OP_RETURN', () => {
    //     const txDataPath = path.resolve(__dirname, 'data', 'valid_lock_tx.tx');
    //     const txData = fs.readFileSync(txDataPath, 'utf8').trim();
    //     const mtx = MTX.fromRaw(txData, 'hex');

    //     const servicePubKey = Buffer.from('036d6e6cf57a88d39fee39b88721dcd5afbb18e5d078888293eaf5eee2fbc4cd36', 'hex');
    //     const otherKey = Buffer.from('02a1633cafcc01ebfb6d78e39f687a1f0995c62fc95f51ead10a02ee0be551b5dc', 'hex');

    //     // Generate a script of any other kind
    //     const newScript = Script.fromMultisig(1, 2, [servicePubKey, otherKey]);

    //     const oldVal = mtx.outputs[1].value;

    //     // This new output will also be a P2SH, so we're sure it's not just checking for that
    //     const newOutput = Output.fromScript(newScript.getAddress(), oldVal);

    //     mtx.outputs[1] = newOutput;

    //     const tx = mtx.toTX();

    //     expect(verifyLockTX(tx, servicePubKey)).toBe(false);
    // });

    // it('fails on output 1 having value > 0', () => {
    //     const txDataPath = path.resolve(__dirname, 'data', 'valid_lock_tx.tx');
    //     const txData = fs.readFileSync(txDataPath, 'utf8').trim();
    //     const mtx = MTX.fromRaw(txData, 'hex');

    //     const servicePubKey = Buffer.from('036d6e6cf57a88d39fee39b88721dcd5afbb18e5d078888293eaf5eee2fbc4cd36', 'hex');

    //     mtx.outputs[1].value = 10;

    //     const tx = mtx.toTX();

    //     expect(verifyLockTX(tx, servicePubKey)).toBe(false);
    // });

    // it('fails on output 1 having more than 2 ops', () => {
    //     const txDataPath = path.resolve(__dirname, 'data', 'valid_lock_tx.tx');
    //     const txData = fs.readFileSync(txDataPath, 'utf8').trim();
    //     const mtx = MTX.fromRaw(txData, 'hex');

    //     const servicePubKey = Buffer.from('036d6e6cf57a88d39fee39b88721dcd5afbb18e5d078888293eaf5eee2fbc4cd36', 'hex');

    //     const pubkeyDataScript = Script.fromNulldata(servicePubKey);
    //     pubkeyDataScript.pushData(Buffer.from('asdf'));
    //     pubkeyDataScript.compile();
    //     mtx.outputs[1] = Output.fromScript(pubkeyDataScript, mtx.outputs[1].value);

    //     const tx = mtx.toTX();

    //     expect(verifyLockTX(tx, servicePubKey)).toBe(false);
    // });

    // it('fails on output 1 name being too long', () => {
    //     const txDataPath = path.resolve(__dirname, 'data', 'valid_lock_tx.tx');
    //     const txData = fs.readFileSync(txDataPath, 'utf8').trim();
    //     const mtx = MTX.fromRaw(txData, 'hex');

    //     const servicePubKey = Buffer.from('036d6e6cf57a88d39fee39b88721dcd5afbb18e5d078888293eaf5eee2fbc4cd36', 'hex');

    //     // First two bytes are the encoded locktime
    //     const name = '0123456789012345678901234567890123456789012345678901234567890123456';
    //     const nameScript = Script.fromNulldata(Buffer.from(name, 'ascii'));
    //     nameScript.compile();
    //     mtx.outputs[1] = Output.fromScript(nameScript, mtx.outputs[1].value);

    //     const tx = mtx.toTX();

    //     expect(verifyLockTX(tx, servicePubKey)).toBe(false);
    // });

    // it('fails on output 1 name not being URI-safe', () => {
    //     const txDataPath = path.resolve(__dirname, 'data', 'valid_lock_tx.tx');
    //     const txData = fs.readFileSync(txDataPath, 'utf8').trim();
    //     const mtx = MTX.fromRaw(txData, 'hex');

    //     const servicePubKey = Buffer.from('036d6e6cf57a88d39fee39b88721dcd5afbb18e5d078888293eaf5eee2fbc4cd36', 'hex');

    //     // First two bytes are the encoded locktime
    //     const name = '01^_^kawaii'; // No weeb shit
    //     const nameScript = Script.fromNulldata(Buffer.from(name, 'ascii'));
    //     nameScript.compile();
    //     mtx.outputs[1] = Output.fromScript(nameScript, mtx.outputs[1].value);

    //     const tx = mtx.toTX();

    //     expect(verifyLockTX(tx, servicePubKey)).toBe(false);
    // });

    it('fails on output 0 not being a P2PKH', () => {
        const txDataPath = path.resolve(__dirname, 'data', 'valid_lock_tx.tx');
        const txData = fs.readFileSync(txDataPath, 'utf8').trim();
        const mtx = MTX.fromRaw(txData, 'hex');

        const servicePubKey = Buffer.from('036d6e6cf57a88d39fee39b88721dcd5afbb18e5d078888293eaf5eee2fbc4cd36', 'hex');
        const otherKey = Buffer.from('02a1633cafcc01ebfb6d78e39f687a1f0995c62fc95f51ead10a02ee0be551b5dc', 'hex');

        // Generate a script of any other kind
        const newScript = Script.fromMultisig(1, 2, [servicePubKey, otherKey]);

        const oldVal = mtx.outputs[0].value;

        // This new output will also be a P2SH, so we're sure it's not just checking for that
        const newOutput = Output.fromScript(newScript.getAddress(), oldVal);

        mtx.outputs[0] = newOutput;

        const tx = mtx.toTX();

        expect(verifyLockTX(tx, servicePubKey)).toBe(false);
    });

    it('fails on output 1 not being a P2SH', () => {
        const txDataPath = path.resolve(__dirname, 'data', 'valid_lock_tx.tx');
        const txData = fs.readFileSync(txDataPath, 'utf8').trim();
        const mtx = MTX.fromRaw(txData, 'hex');

        const servicePubKey = Buffer.from('036d6e6cf57a88d39fee39b88721dcd5afbb18e5d078888293eaf5eee2fbc4cd36', 'hex');

        const oldVal = mtx.outputs[1].value;

        // This new output will also be a P2SH, so we're sure it's not just checking for that
        // const newOutput = Output.fromScript(newScript.getAddress(), oldVal);
        const addr = Address.fromBase58('muwhLTVYGD7xHpAP2Dx4aCjKThorymmV4w');
        const newOutput = Output.fromScript(addr, oldVal);

        mtx.outputs[1] = newOutput;

        const tx = mtx.toTX();

        expect(verifyLockTX(tx, servicePubKey)).toBe(false);
    });

    it('fails on bad lock script format', () => {
        const txDataPath = path.resolve(__dirname, 'data', 'valid_lock_tx.tx');
        const txData = fs.readFileSync(txDataPath, 'utf8').trim();
        const mtx = MTX.fromRaw(txData, 'hex');

        const servicePubKey = Buffer.from('036d6e6cf57a88d39fee39b88721dcd5afbb18e5d078888293eaf5eee2fbc4cd36', 'hex');
        const otherKey = Buffer.from('02a1633cafcc01ebfb6d78e39f687a1f0995c62fc95f51ead10a02ee0be551b5dc', 'hex');

        // Generate a script of any other kind
        const newScript = Script.fromMultisig(1, 2, [servicePubKey, otherKey]);

        const oldVal = mtx.outputs[1].value;

        // This new output will also be a P2SH, so we're sure it's not just checking for that
        const newOutput = Output.fromScript(newScript.getAddress(), oldVal);

        mtx.outputs[1] = newOutput;

        const tx = mtx.toTX();

        expect(verifyLockTX(tx, servicePubKey)).toBe(false);
    });

    it('verifies generated locking txs', () => {
        const wif = 'cUBuNVHb5HVpStD1XbHgafDH1QSRwcxUTJmueQLnyzwz1f5wmRZB';
        const ring = KeyRing.fromSecret(wif);

        const txDataPath = path.resolve(__dirname, 'data', 'valid_commit_tx.tx');
        const txData = fs.readFileSync(txDataPath, 'utf8').trim();
        const commitTX = TX.fromRaw(txData, 'hex');

        const upfrontFee = 1000000;
        const delayFee = 1000000;
        const feeRate = 1;

        // const tx = genLockTx(coins, 'testName', upfrontFee, delayFee, feeRate, ring, ring.getPublicKey(), 5);
        const tx = genLockTx(commitTX, 'test', upfrontFee, delayFee, feeRate, ring, ring.getPublicKey(), 1);

        expect(verifyLockTX(tx, ring.getPublicKey())).toBe(true);
    });
});
