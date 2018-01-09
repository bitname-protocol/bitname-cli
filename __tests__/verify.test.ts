import { verifyLockTX, verifyCommitTX } from '../lib/verify';
import { genRedeemScript, genP2shAddr, genLockTx, getLockTxName, getLockTxPubKey, getLockTxTime } from '../lib/txs';
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
    describe('locking transactions', () => {
        it('verifies valid locking tx', () => {
            const ctxDataPath = path.resolve(__dirname, 'data', 'valid_commit_tx.tx');
            const ctxData = fs.readFileSync(ctxDataPath, 'utf8').trim();
            const ctx = TX.fromRaw(ctxData, 'hex');

            const txDataPath = path.resolve(__dirname, 'data', 'valid_lock_tx.tx');
            const txData = fs.readFileSync(txDataPath, 'utf8').trim();

            const tx = TX.fromRaw(txData, 'hex');

            const servicePubKey = Buffer.from('036d6e6cf57a88d39fee39b88721dcd5afbb18e5d078888293eaf5eee2fbc4cd36', 'hex');

            expect(verifyLockTX(tx, ctx, servicePubKey)).toBe(true);
        });

        it('fails on fewer than 2 outputs', () => {
            const ctxDataPath = path.resolve(__dirname, 'data', 'valid_commit_tx.tx');
            const ctxData = fs.readFileSync(ctxDataPath, 'utf8').trim();
            const ctx = TX.fromRaw(ctxData, 'hex');

            const txDataPath = path.resolve(__dirname, 'data', 'valid_lock_tx.tx');
            const txData = fs.readFileSync(txDataPath, 'utf8').trim();
            const mtx = MTX.fromRaw(txData, 'hex');

            const servicePubKey = Buffer.from('036d6e6cf57a88d39fee39b88721dcd5afbb18e5d078888293eaf5eee2fbc4cd36', 'hex');

            mtx.outputs = mtx.outputs.slice(0, 1);

            const tx = mtx.toTX();

            expect(verifyLockTX(tx, ctx, servicePubKey)).toBe(false);
        });

        // it('fails on output 0 not being an OP_RETURN', () => {
        //     const txDataPath = path.resolve(__dirname, 'data', 'valid_lock_tx.tx');
        //     const txData = fs.readFileSync(txDataPath, 'utf8').trim();
        //     const mtx = MTX.fromRaw(txData, 'hex');

        //     const servicePubKey = Buffer.from('036d6e6cf57a88d39fee39b88721dcd5afbb18e5d078888293eaf5eee2fbc4cd36', 'hex');
        //     const otherKey = Buffer.from('02a1633cafcc01ebfb6d78e39f687a1f0995c62fc95f51ead10a02ee0be551b5dc', 'hex');

        //     // Generate a script of any other kind
        //     const newScript = Script.fromMultisig(1, 2, [servicePubKey, otherKey]);

        //     const oldVal = mtx.outputs[0].value;

        //     // This new output will also be a P2SH, so we're sure it's not just checking for that
        //     const newOutput = Output.fromScript(newScript.getAddress(), oldVal);

        //     mtx.outputs[0] = newOutput;

        //     const tx = mtx.toTX();

        //     expect(verifyLockTX(tx, servicePubKey)).toBe(false);
        // });

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
            const ctxDataPath = path.resolve(__dirname, 'data', 'valid_commit_tx.tx');
            const ctxData = fs.readFileSync(ctxDataPath, 'utf8').trim();
            const ctx = TX.fromRaw(ctxData, 'hex');

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

            expect(verifyLockTX(tx, ctx, servicePubKey)).toBe(false);
        });

        it('fails on output 1 not being a P2SH', () => {
            const ctxDataPath = path.resolve(__dirname, 'data', 'valid_commit_tx.tx');
            const ctxData = fs.readFileSync(ctxDataPath, 'utf8').trim();
            const ctx = TX.fromRaw(ctxData, 'hex');

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

            expect(verifyLockTX(tx, ctx, servicePubKey)).toBe(false);
        });

        it('fails on bad lock script format', () => {
            const ctxDataPath = path.resolve(__dirname, 'data', 'valid_commit_tx.tx');
            const ctxData = fs.readFileSync(ctxDataPath, 'utf8').trim();
            const ctx = TX.fromRaw(ctxData, 'hex');

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

            expect(verifyLockTX(tx, ctx, servicePubKey)).toBe(false);
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

            expect(verifyLockTX(tx, commitTX, ring.getPublicKey())).toBe(true);
        });
    });

    describe('commit transactions', () => {
        it('verifies valid commit tx', () => {
            const ctxDataPath = path.resolve(__dirname, 'data', 'valid_commit_tx.tx');
            const ctxData = fs.readFileSync(ctxDataPath, 'utf8').trim();
            const ctx = TX.fromRaw(ctxData, 'hex');

            const pubKeyHex = '036d6e6cf57a88d39fee39b88721dcd5afbb18e5d078888293eaf5eee2fbc4cd36';
            const servicePubKey = Buffer.from(pubKeyHex, 'hex');
            const userPubKey = Buffer.from(pubKeyHex, 'hex');

            expect(verifyCommitTX(ctx, userPubKey, servicePubKey, 'test', 1)).toBe(true);
        });

        it('fails on fewer than 3 outputs', () => {
            const ctxDataPath = path.resolve(__dirname, 'data', 'valid_commit_tx.tx');
            const ctxData = fs.readFileSync(ctxDataPath, 'utf8').trim();
            const ctx = MTX.fromRaw(ctxData, 'hex');
            ctx.outputs = ctx.outputs.slice(0, 2);

            const pubKeyHex = '036d6e6cf57a88d39fee39b88721dcd5afbb18e5d078888293eaf5eee2fbc4cd36';
            const servicePubKey = Buffer.from(pubKeyHex, 'hex');
            const userPubKey = Buffer.from(pubKeyHex, 'hex');

            expect(verifyCommitTX(ctx, userPubKey, servicePubKey, 'test', 1)).toBe(false);
        });

        it('fails on output 0 not being an OP_RETURN', () => {
            const ctxDataPath = path.resolve(__dirname, 'data', 'valid_commit_tx.tx');
            const ctxData = fs.readFileSync(ctxDataPath, 'utf8').trim();
            const ctx = MTX.fromRaw(ctxData, 'hex');

            const pubKeyHex = '036d6e6cf57a88d39fee39b88721dcd5afbb18e5d078888293eaf5eee2fbc4cd36';
            const servicePubKey = Buffer.from(pubKeyHex, 'hex');
            const userPubKey = Buffer.from(pubKeyHex, 'hex');

            // Generate a script of any other kind
            const newScript = Script.fromMultisig(1, 1, [servicePubKey]);

            const oldVal = ctx.outputs[0].value;

            // This new output will also be a P2SH, so we're sure it's not just checking for that
            const newOutput = Output.fromScript(newScript.getAddress(), oldVal);

            ctx.outputs[0] = newOutput;

            expect(verifyCommitTX(ctx, userPubKey, servicePubKey, 'test', 1)).toBe(false);
        });

        it('fails on output 0 containing a value other than 0', () => {
            const ctxDataPath = path.resolve(__dirname, 'data', 'valid_commit_tx.tx');
            const ctxData = fs.readFileSync(ctxDataPath, 'utf8').trim();
            const ctx = MTX.fromRaw(ctxData, 'hex');

            const pubKeyHex = '036d6e6cf57a88d39fee39b88721dcd5afbb18e5d078888293eaf5eee2fbc4cd36';
            const servicePubKey = Buffer.from(pubKeyHex, 'hex');
            const userPubKey = Buffer.from(pubKeyHex, 'hex');

            ctx.outputs[0].value = 10;

            expect(verifyCommitTX(ctx, userPubKey, servicePubKey, 'test', 1)).toBe(false);
        });

        it('fails on output 0 not containing 32 bytes of data', () => {
            const ctxDataPath = path.resolve(__dirname, 'data', 'valid_commit_tx.tx');
            const ctxData = fs.readFileSync(ctxDataPath, 'utf8').trim();
            const ctx = MTX.fromRaw(ctxData, 'hex');

            const pubKeyHex = '036d6e6cf57a88d39fee39b88721dcd5afbb18e5d078888293eaf5eee2fbc4cd36';
            const servicePubKey = Buffer.from(pubKeyHex, 'hex');
            const userPubKey = Buffer.from(pubKeyHex, 'hex');

            const newScript = Script.fromNulldata((new Buffer(33)).fill(1));

            const oldVal = ctx.outputs[0].value;

            const newOutput = Output.fromScript(newScript, oldVal);

            ctx.outputs[0] = newOutput;

            expect(verifyCommitTX(ctx, userPubKey, servicePubKey, 'test', 1)).toBe(false);
        });

        it('fails on output 0 having more than 2 ops', () => {
            const ctxDataPath = path.resolve(__dirname, 'data', 'valid_commit_tx.tx');
            const ctxData = fs.readFileSync(ctxDataPath, 'utf8').trim();
            const ctx = MTX.fromRaw(ctxData, 'hex');

            const pubKeyHex = '036d6e6cf57a88d39fee39b88721dcd5afbb18e5d078888293eaf5eee2fbc4cd36';
            const servicePubKey = Buffer.from(pubKeyHex, 'hex');
            const userPubKey = Buffer.from(pubKeyHex, 'hex');

            const newScript = Script.fromNulldata(ctx.outputs[0].script.code[1].data);
            newScript.pushData(Buffer.from('boolin'));
            newScript.compile();

            const oldVal = ctx.outputs[0].value;

            const newOutput = Output.fromScript(newScript, oldVal);

            ctx.outputs[0] = newOutput;

            expect(verifyCommitTX(ctx, userPubKey, servicePubKey, 'test', 1)).toBe(false);
        });

        it('fails on output 1 being sent to an incorrect address', () => {
            const ctxDataPath = path.resolve(__dirname, 'data', 'valid_commit_tx.tx');
            const ctxData = fs.readFileSync(ctxDataPath, 'utf8').trim();
            const ctx = MTX.fromRaw(ctxData, 'hex');

            const pubKeyHex = '036d6e6cf57a88d39fee39b88721dcd5afbb18e5d078888293eaf5eee2fbc4cd36';
            const servicePubKey = Buffer.from(pubKeyHex, 'hex');
            const userPubKey = Buffer.from(pubKeyHex, 'hex');

            const oldVal = ctx.outputs[1].value;

            const addr = Address.fromBase58('muwhLTVYGD7xHpAP2Dx4aCjKThorymmV4w');
            const newOutput = Output.fromScript(addr, oldVal);

            ctx.outputs[1] = newOutput;

            expect(verifyCommitTX(ctx, userPubKey, servicePubKey, 'test', 1)).toBe(false);
        });

        it('fails on output 2 not being P2SH', () => {
            const ctxDataPath = path.resolve(__dirname, 'data', 'valid_commit_tx.tx');
            const ctxData = fs.readFileSync(ctxDataPath, 'utf8').trim();
            const ctx = MTX.fromRaw(ctxData, 'hex');

            const pubKeyHex = '036d6e6cf57a88d39fee39b88721dcd5afbb18e5d078888293eaf5eee2fbc4cd36';
            const servicePubKey = Buffer.from(pubKeyHex, 'hex');
            const userPubKey = Buffer.from(pubKeyHex, 'hex');

            const oldVal = ctx.outputs[2].value;

            const addr = Address.fromBase58('muwhLTVYGD7xHpAP2Dx4aCjKThorymmV4w');
            const newOutput = Output.fromScript(addr, oldVal);

            ctx.outputs[2] = newOutput;

            expect(verifyCommitTX(ctx, userPubKey, servicePubKey, 'test', 1)).toBe(false);
        });

        it('fails on bad lock script format', () => {
            const ctxDataPath = path.resolve(__dirname, 'data', 'valid_commit_tx.tx');
            const ctxData = fs.readFileSync(ctxDataPath, 'utf8').trim();
            const ctx = MTX.fromRaw(ctxData, 'hex');

            const pubKeyHex = '036d6e6cf57a88d39fee39b88721dcd5afbb18e5d078888293eaf5eee2fbc4cd36';
            const servicePubKey = Buffer.from(pubKeyHex, 'hex');
            const userPubKey = Buffer.from(pubKeyHex, 'hex');
            const otherKey = Buffer.from('02a1633cafcc01ebfb6d78e39f687a1f0995c62fc95f51ead10a02ee0be551b5dc', 'hex');

            // Generate a script of any other kind
            const newScript = Script.fromMultisig(1, 2, [servicePubKey, otherKey]);

            const oldVal = ctx.outputs[2].value;

            // This new output will also be a P2SH, so we're sure it's not just checking for that
            const newOutput = Output.fromScript(newScript.getAddress(), oldVal);

            ctx.outputs[2] = newOutput;

            const tx = ctx.toTX();

            expect(verifyCommitTX(ctx, userPubKey, servicePubKey, 'test', 1)).toBe(false);
        });
    });
});
