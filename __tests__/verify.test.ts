import { verifyLockTX, verifyCommitTX } from '../lib/verify';
import {
    genLockTx,
    genCommitTx,
    serializeCommitData,
} from '../lib/txs';
import {
    keyring as KeyRing,
    coin as Coin,
    tx as TX,
    mtx as MTX,
    address as Address,
    script as Script,
    output as Output,
    input as Input,
    crypto,
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

            const servicePubKeyHex = '02875b39c2d0afb1596b807b40d8faa4fe8ff4142034453c5791775970a8ea8a69';
            const servicePubKey = Buffer.from(servicePubKeyHex, 'hex');

            expect(verifyLockTX(tx, ctx, servicePubKey)).toEqual(true);
        });

        it('fails on fewer than 2 outputs', () => {
            const ctxDataPath = path.resolve(__dirname, 'data', 'valid_commit_tx.tx');
            const ctxData = fs.readFileSync(ctxDataPath, 'utf8').trim();
            const ctx = TX.fromRaw(ctxData, 'hex');

            const txDataPath = path.resolve(__dirname, 'data', 'valid_lock_tx.tx');
            const txData = fs.readFileSync(txDataPath, 'utf8').trim();
            const mtx = MTX.fromRaw(txData, 'hex');

            const servicePubKeyHex = '036d6e6cf57a88d39fee39b88721dcd5afbb18e5d078888293eaf5eee2fbc4cd36';
            const servicePubKey = Buffer.from(servicePubKeyHex, 'hex');

            mtx.outputs = mtx.outputs.slice(0, 1);

            const tx = mtx.toTX();

            expect(verifyLockTX(tx, ctx, servicePubKey)).toEqual(false);
        });

        it('fails if invalid data is in scriptSig', () => {
            const ctxDataPath = path.resolve(__dirname, 'data', 'valid_commit_tx.tx');
            const ctxData = fs.readFileSync(ctxDataPath, 'utf8').trim();
            const ctx = TX.fromRaw(ctxData, 'hex');

            const txDataPath = path.resolve(__dirname, 'data', 'valid_lock_tx.tx');
            const txData = fs.readFileSync(txDataPath, 'utf8').trim();
            const mtx = MTX.fromRaw(txData, 'hex');

            const servicePubKeyHex = '036d6e6cf57a88d39fee39b88721dcd5afbb18e5d078888293eaf5eee2fbc4cd36';
            const servicePubKey = Buffer.from(servicePubKeyHex, 'hex');

            mtx.inputs[0].script.insertData(1, Buffer.from('zippity'));
            mtx.inputs[0].script.remove(2);
            mtx.inputs[0].script.compile();

            const tx = mtx.toTX();

            expect(verifyLockTX(tx, ctx, servicePubKey)).toEqual(false);
        });

        it('fails if name is too long', () => {
            const ctxDataPath = path.resolve(__dirname, 'data', 'valid_commit_tx.tx');
            const ctxData = fs.readFileSync(ctxDataPath, 'utf8').trim();
            const ctx = TX.fromRaw(ctxData, 'hex');

            const txDataPath = path.resolve(__dirname, 'data', 'valid_lock_tx.tx');
            const txData = fs.readFileSync(txDataPath, 'utf8').trim();
            const mtx = MTX.fromRaw(txData, 'hex');

            const serviceWif = 'cRMzGH4towfYVCref4Qz9iyfKaRkvfgVvZ2qk4hExMR7FcpzzVg6';
            const serviceRing = KeyRing.fromSecret(serviceWif);
            const servicePubKey = serviceRing.getPublicKey();

            const name = '000102030405060708090a0b0c0d0e0f1012131415161718191a1b1c1d1e1f20';

            const data = serializeCommitData(new Buffer(32), 255, name);
            data.writeUInt8(65, 36);
            const newData = Buffer.concat([data, Buffer.from('h', 'ascii')]);

            mtx.inputs[0].script.insertData(1, newData);
            mtx.inputs[0].script.remove(2);
            mtx.inputs[0].script.compile();

            const tx = mtx.toTX();

            expect(verifyLockTX(tx, ctx, servicePubKey)).toEqual(false);
        });

        it('fails if name contains invalid characters', () => {
            const ctxDataPath = path.resolve(__dirname, 'data', 'valid_commit_tx.tx');
            const ctxData = fs.readFileSync(ctxDataPath, 'utf8').trim();
            const ctx = TX.fromRaw(ctxData, 'hex');

            const txDataPath = path.resolve(__dirname, 'data', 'valid_lock_tx.tx');
            const txData = fs.readFileSync(txDataPath, 'utf8').trim();
            const mtx = MTX.fromRaw(txData, 'hex');

            const servicePubKeyHex = '036d6e6cf57a88d39fee39b88721dcd5afbb18e5d078888293eaf5eee2fbc4cd36';
            const servicePubKey = Buffer.from(servicePubKeyHex, 'hex');

            const name = '<(^_^)>'; // kawaii desu

            const data = serializeCommitData(new Buffer(32), 255, name);

            mtx.inputs[0].script.insertData(1, data);
            mtx.inputs[0].script.remove(2);
            mtx.inputs[0].script.compile();

            const tx = mtx.toTX();

            expect(verifyLockTX(tx, ctx, servicePubKey)).toEqual(false);
        });

        it('fails if input 0 is not a valid commit tx', () => {
            const ctxDataPath = path.resolve(__dirname, 'data', 'valid_commit_tx.tx');
            const ctxData = fs.readFileSync(ctxDataPath, 'utf8').trim();
            const ctx = MTX.fromRaw(ctxData, 'hex');

            const txDataPath = path.resolve(__dirname, 'data', 'valid_lock_tx.tx');
            const txData = fs.readFileSync(txDataPath, 'utf8').trim();
            const mtx = MTX.fromRaw(txData, 'hex');

            const wif = 'cTV3FM3RfiFwmHfX6x43g4Xp8qeLbi15pNELuWF9sV3renVZ63nB';
            const ring = KeyRing.fromSecret(wif);
            const userPubKey = ring.getPublicKey();

            const serviceWif = 'cRMzGH4towfYVCref4Qz9iyfKaRkvfgVvZ2qk4hExMR7FcpzzVg6';
            const serviceRing = KeyRing.fromSecret(serviceWif);
            const servicePubKey = serviceRing.getPublicKey();

            // I shall begone to build a spiteful script
            // Which holds some valid data when it's stripped.
            // But if you hold it in discerning view,
            // Its fallacies will become clear to you.
            const script = new Script();
            script.pushInt(1);
            script.pushSym('OP_NEGATE');
            script.pushSym('OP_DROP');

            script.pushSym('OP_HASH256');

            const hashData = serializeCommitData(new Buffer(32), 66072, 'colin');
            const hash = crypto.hash256(hashData);
            script.pushData(hash);
            script.pushSym('OP_2DROP');

            script.pushData(userPubKey);
            script.pushSym('OP_CHECKSIG');

            script.compile();

            const oldVal = ctx.outputs[2].value;
            ctx.outputs[2] = Output.fromScript(script, oldVal);

            const oldInputScript = mtx.inputs[0].script;
            oldInputScript.insertData(2, script.toRaw());
            oldInputScript.remove(3);
            oldInputScript.compile();

            mtx.inputs[0] = Input.fromTX(ctx, 2);
            mtx.inputs[0].script = oldInputScript;

            const tx = mtx.toTX();

            expect(verifyLockTX(tx, ctx, servicePubKey)).toEqual(false);
        });

        it('fails on input 0 not containing a valid pubkey', () => {
            const ctxDataPath = path.resolve(__dirname, 'data', 'valid_commit_tx.tx');
            const ctxData = fs.readFileSync(ctxDataPath, 'utf8').trim();
            const ctx = TX.fromRaw(ctxData, 'hex');

            const txDataPath = path.resolve(__dirname, 'data', 'valid_lock_tx.tx');
            const txData = fs.readFileSync(txDataPath, 'utf8').trim();
            const mtx = MTX.fromRaw(txData, 'hex');

            const servicePubKeyHex = '036d6e6cf57a88d39fee39b88721dcd5afbb18e5d078888293eaf5eee2fbc4cd36';
            const servicePubKey = Buffer.from(servicePubKeyHex, 'hex');
            const badPubKey = new Buffer(33);

            mtx.inputs[0].script.insertData(2, badPubKey);
            mtx.inputs[0].script.remove(3);
            mtx.inputs[0].script.compile();

            const tx = mtx.toTX();

            expect(verifyLockTX(tx, ctx, servicePubKey)).toEqual(false);
        });

        it('fails on output 0 not being a P2PKH', () => {
            const ctxDataPath = path.resolve(__dirname, 'data', 'valid_commit_tx.tx');
            const ctxData = fs.readFileSync(ctxDataPath, 'utf8').trim();
            const ctx = TX.fromRaw(ctxData, 'hex');

            const txDataPath = path.resolve(__dirname, 'data', 'valid_lock_tx.tx');
            const txData = fs.readFileSync(txDataPath, 'utf8').trim();
            const mtx = MTX.fromRaw(txData, 'hex');

            const servicePubKeyHex = '036d6e6cf57a88d39fee39b88721dcd5afbb18e5d078888293eaf5eee2fbc4cd36';
            const servicePubKey = Buffer.from(servicePubKeyHex, 'hex');
            const otherKey = Buffer.from('02a1633cafcc01ebfb6d78e39f687a1f0995c62fc95f51ead10a02ee0be551b5dc', 'hex');

            // Generate a script of any other kind
            const newScript = Script.fromMultisig(1, 2, [servicePubKey, otherKey]);

            const oldVal = mtx.outputs[0].value;

            // This new output will also be a P2SH, so we're sure it's not just checking for that
            const newOutput = Output.fromScript(newScript, oldVal);

            mtx.outputs[0] = newOutput;

            const tx = mtx.toTX();

            expect(verifyLockTX(tx, ctx, servicePubKey)).toEqual(false);
        });

        it('fails on output 0 being sent to the wrong address', () => {
            const ctxDataPath = path.resolve(__dirname, 'data', 'valid_commit_tx.tx');
            const ctxData = fs.readFileSync(ctxDataPath, 'utf8').trim();
            const ctx = TX.fromRaw(ctxData, 'hex');

            const txDataPath = path.resolve(__dirname, 'data', 'valid_lock_tx.tx');
            const txData = fs.readFileSync(txDataPath, 'utf8').trim();
            const mtx = MTX.fromRaw(txData, 'hex');

            const servicePubKeyHex = '036d6e6cf57a88d39fee39b88721dcd5afbb18e5d078888293eaf5eee2fbc4cd36';
            const servicePubKey = Buffer.from(servicePubKeyHex, 'hex');
            const otherKey = Buffer.from('02a1633cafcc01ebfb6d78e39f687a1f0995c62fc95f51ead10a02ee0be551b5dc', 'hex');

            // Generate a script of any other kind
            // const newScript = A
            const newAddr = Address.fromPubkeyhash(crypto.hash160(otherKey));

            const oldVal = mtx.outputs[0].value;

            // This new output will also be a P2SH, so we're sure it's not just checking for that
            const newOutput = Output.fromScript(newAddr, oldVal);

            mtx.outputs[0] = newOutput;

            const tx = mtx.toTX();

            expect(verifyLockTX(tx, ctx, servicePubKey)).toEqual(false);
        });

        it('fails on output 1 not being a P2SH', () => {
            const ctxDataPath = path.resolve(__dirname, 'data', 'valid_commit_tx.tx');
            const ctxData = fs.readFileSync(ctxDataPath, 'utf8').trim();
            const ctx = TX.fromRaw(ctxData, 'hex');

            const txDataPath = path.resolve(__dirname, 'data', 'valid_lock_tx.tx');
            const txData = fs.readFileSync(txDataPath, 'utf8').trim();
            const mtx = MTX.fromRaw(txData, 'hex');

            const serviceWif = 'cRMzGH4towfYVCref4Qz9iyfKaRkvfgVvZ2qk4hExMR7FcpzzVg6';
            const serviceRing = KeyRing.fromSecret(serviceWif);
            const servicePubKey = serviceRing.getPublicKey();

            const oldVal = mtx.outputs[1].value;

            // This new output will also be a P2SH, so we're sure it's not just checking for that
            // const newOutput = Output.fromScript(newScript.getAddress(), oldVal);
            const addr = Address.fromBase58('muwhLTVYGD7xHpAP2Dx4aCjKThorymmV4w');
            const newOutput = Output.fromScript(addr, oldVal);

            mtx.outputs[1] = newOutput;

            const tx = mtx.toTX();

            expect(verifyLockTX(tx, ctx, servicePubKey)).toEqual(false);
        });

        it('fails on bad lock script format', () => {
            const ctxDataPath = path.resolve(__dirname, 'data', 'valid_commit_tx.tx');
            const ctxData = fs.readFileSync(ctxDataPath, 'utf8').trim();
            const ctx = TX.fromRaw(ctxData, 'hex');

            const txDataPath = path.resolve(__dirname, 'data', 'valid_lock_tx.tx');
            const txData = fs.readFileSync(txDataPath, 'utf8').trim();
            const mtx = MTX.fromRaw(txData, 'hex');

            const serviceWif = 'cRMzGH4towfYVCref4Qz9iyfKaRkvfgVvZ2qk4hExMR7FcpzzVg6';
            const serviceRing = KeyRing.fromSecret(serviceWif);
            const servicePubKey = serviceRing.getPublicKey();

            const otherKey = Buffer.from('02a1633cafcc01ebfb6d78e39f687a1f0995c62fc95f51ead10a02ee0be551b5dc', 'hex');

            // Generate a script of any other kind
            const newScript = Script.fromMultisig(1, 2, [servicePubKey, otherKey]);

            const oldVal = mtx.outputs[1].value;

            // This new output will also be a P2SH, so we're sure it's not just checking for that
            const newOutput = Output.fromScript(newScript.getAddress() as Address, oldVal);

            mtx.outputs[1] = newOutput;

            const tx = mtx.toTX();

            expect(verifyLockTX(tx, ctx, servicePubKey)).toEqual(false);
        });

        it('verifies generated locking txs', () => {
            const wif = 'cTV3FM3RfiFwmHfX6x43g4Xp8qeLbi15pNELuWF9sV3renVZ63nB';
            const ring = KeyRing.fromSecret(wif);

            const serviceWif = 'cRMzGH4towfYVCref4Qz9iyfKaRkvfgVvZ2qk4hExMR7FcpzzVg6';
            const serviceRing = KeyRing.fromSecret(serviceWif);
            const servicePubKey = serviceRing.getPublicKey();

            const txDataPath = path.resolve(__dirname, 'data', 'valid_commit_tx.tx');
            const txData = fs.readFileSync(txDataPath, 'utf8').trim();
            const commitTX = TX.fromRaw(txData, 'hex');

            // deserializeCommitData()

            const upfrontFee = 100000;
            // const upfrontFee = 1544000;
            const delayFee = 100000;
            const feeRate = 1;

            // const tx = genLockTx(coins, 'testName', upfrontFee, delayFee, feeRate, ring, ring.getPublicKey(), 5);
            const tx = genLockTx(commitTX, 'colin', upfrontFee, delayFee, feeRate, ring, servicePubKey, 66072);

            expect(verifyLockTX(tx, commitTX, servicePubKey)).toEqual(true);
        });
    });

    describe('commit transactions', () => {
        it('verifies valid commit tx', () => {
            const ctxDataPath = path.resolve(__dirname, 'data', 'valid_commit_tx.tx');
            const ctxData = fs.readFileSync(ctxDataPath, 'utf8').trim();
            const ctx = TX.fromRaw(ctxData, 'hex');

            const wif = 'cTV3FM3RfiFwmHfX6x43g4Xp8qeLbi15pNELuWF9sV3renVZ63nB';
            const ring = KeyRing.fromSecret(wif);
            const userPubKey = ring.getPublicKey();

            const serviceWif = 'cRMzGH4towfYVCref4Qz9iyfKaRkvfgVvZ2qk4hExMR7FcpzzVg6';
            const serviceRing = KeyRing.fromSecret(serviceWif);
            const servicePubKey = serviceRing.getPublicKey();

            expect(verifyCommitTX(ctx, userPubKey, servicePubKey, 'colin', 66072)).toEqual(true);
        });

        it('fails on fewer than 3 outputs', () => {
            const ctxDataPath = path.resolve(__dirname, 'data', 'valid_commit_tx.tx');
            const ctxData = fs.readFileSync(ctxDataPath, 'utf8').trim();
            const ctx = MTX.fromRaw(ctxData, 'hex');
            ctx.outputs = ctx.outputs.slice(0, 2);

            const pubKeyHex = '036d6e6cf57a88d39fee39b88721dcd5afbb18e5d078888293eaf5eee2fbc4cd36';
            const servicePubKey = Buffer.from(pubKeyHex, 'hex');
            const userPubKey = Buffer.from(pubKeyHex, 'hex');

            expect(verifyCommitTX(ctx, userPubKey, servicePubKey, 'colin', 66072)).toEqual(false);
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
            const newOutput = Output.fromScript(newScript, oldVal);

            ctx.outputs[0] = newOutput;

            expect(verifyCommitTX(ctx, userPubKey, servicePubKey, 'test', 1)).toEqual(false);
        });

        it('fails on output 0 containing a value other than 0', () => {
            const ctxDataPath = path.resolve(__dirname, 'data', 'valid_commit_tx.tx');
            const ctxData = fs.readFileSync(ctxDataPath, 'utf8').trim();
            const ctx = MTX.fromRaw(ctxData, 'hex');

            const pubKeyHex = '036d6e6cf57a88d39fee39b88721dcd5afbb18e5d078888293eaf5eee2fbc4cd36';
            const servicePubKey = Buffer.from(pubKeyHex, 'hex');
            const userPubKey = Buffer.from(pubKeyHex, 'hex');

            ctx.outputs[0].value = 10;

            expect(verifyCommitTX(ctx, userPubKey, servicePubKey, 'test', 1)).toEqual(false);
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

            expect(verifyCommitTX(ctx, userPubKey, servicePubKey, 'test', 1)).toEqual(false);
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

            expect(verifyCommitTX(ctx, userPubKey, servicePubKey, 'test', 1)).toEqual(false);
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

            expect(verifyCommitTX(ctx, userPubKey, servicePubKey, 'test', 1)).toEqual(false);
        });

        it('fails on output 2 not being P2SH', () => {
            const ctxDataPath = path.resolve(__dirname, 'data', 'valid_commit_tx.tx');
            const ctxData = fs.readFileSync(ctxDataPath, 'utf8').trim();
            const ctx = MTX.fromRaw(ctxData, 'hex');

            const wif = 'cTV3FM3RfiFwmHfX6x43g4Xp8qeLbi15pNELuWF9sV3renVZ63nB';
            const ring = KeyRing.fromSecret(wif);
            const userPubKey = ring.getPublicKey();

            const serviceWif = 'cRMzGH4towfYVCref4Qz9iyfKaRkvfgVvZ2qk4hExMR7FcpzzVg6';
            const serviceRing = KeyRing.fromSecret(serviceWif);
            const servicePubKey = serviceRing.getPublicKey();

            const oldVal = ctx.outputs[2].value;

            const addr = Address.fromBase58('muwhLTVYGD7xHpAP2Dx4aCjKThorymmV4w');
            const newOutput = Output.fromScript(addr, oldVal);

            ctx.outputs[2] = newOutput;

            expect(verifyCommitTX(ctx, userPubKey, servicePubKey, 'colin', 66072)).toEqual(false);
        });

        it('fails on bad lock script format', () => {
            const ctxDataPath = path.resolve(__dirname, 'data', 'valid_commit_tx.tx');
            const ctxData = fs.readFileSync(ctxDataPath, 'utf8').trim();
            const ctx = MTX.fromRaw(ctxData, 'hex');

            const wif = 'cTV3FM3RfiFwmHfX6x43g4Xp8qeLbi15pNELuWF9sV3renVZ63nB';
            const ring = KeyRing.fromSecret(wif);
            const userPubKey = ring.getPublicKey();

            const serviceWif = 'cRMzGH4towfYVCref4Qz9iyfKaRkvfgVvZ2qk4hExMR7FcpzzVg6';
            const serviceRing = KeyRing.fromSecret(serviceWif);
            const servicePubKey = serviceRing.getPublicKey();

            const otherKey = Buffer.from('02a1633cafcc01ebfb6d78e39f687a1f0995c62fc95f51ead10a02ee0be551b5dc', 'hex');

            // Generate a script of any other kind
            const newScript = Script.fromMultisig(1, 2, [servicePubKey, otherKey]);

            const oldVal = ctx.outputs[2].value;

            // This new output will also be a P2SH, so we're sure it's not just checking for that
            const newOutput = Output.fromScript(newScript.getAddress() as Address, oldVal);

            ctx.outputs[2] = newOutput;

            expect(verifyCommitTX(ctx, userPubKey, servicePubKey, 'colin', 66072)).toEqual(false);
        });

        it('verifies generated commitment txs', () => {
            const wif = 'cUBuNVHb5HVpStD1XbHgafDH1QSRwcxUTJmueQLnyzwz1f5wmRZB';
            const ring = KeyRing.fromSecret(wif);

            const servicePubKeyHex = '02a1633cafcc01ebfb6d78e39f687a1f0995c62fc95f51ead10a02ee0be551b5dc';
            const servicePubKey = Buffer.from(servicePubKeyHex, 'hex');

            const testCoin = {
                version: 1,
                height: -1,
                value: 100000000,
                hash: '453bbd02d4ef04be090ec79691e7f1749ac14141456c3394a513055fbc904bac',
            };

            const name = 'zoop';

            const coins = [new Coin(testCoin)];

            const commitFee = 10000;
            const registerFee = 10000;
            const escrowFee = 20000;
            const feeRate = 1000;

            const ctx = genCommitTx(coins, name, 600, commitFee, registerFee, escrowFee, feeRate, ring, servicePubKey);

            expect(verifyCommitTX(ctx, ring.getPublicKey(), servicePubKey, name, 600)).toEqual(true);
        });
    });
});
