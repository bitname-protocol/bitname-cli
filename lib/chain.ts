import TXList from './TXList';
import { verifyLockTX } from './verify';
import { getLockTxTime, getLockTxName, getLockTxPubKey } from './txs';
import {
    tx as TX,
    util,
} from 'bcoin';

export interface IReadonlyNameInfo {
    readonly [name: string]: {
        readonly txid: string;
        readonly pubKey: Buffer;
        readonly expires: number;
    };
}

interface INameInfo {
    [name: string]: {
        txid: string;
        pubKey: Buffer;
        expires: number;
        invalid?: boolean;
    };
}

/**
 * Function will find a lock transaction in txs
 * @param txs a list of all transactions with a given address as an input
 * or output
 * @param servicePubKey the services public key stored in a buffer
 * @param curHeight the current height of the blockchain (number of blocks)
 * @return IReadonlyNameInfo returns a name, txid, pubkey and the block that the
 * name name expires in
 */
function extractInfo(txs: TXList, servicePubKey: Buffer, curHeight: number): IReadonlyNameInfo {
    const map: INameInfo = {};

    for (const txid of ([...txs.getTxids()].reverse() as ReadonlyArray<string>)) {
        // a transaction in txs list
        const lockTx = txs.getTX(txid);

        // reference to the lockTx 1st inputs previos output reference
        // (does each transaction in the list only have one input?)
        const prevHash = util.revHex(lockTx.inputs[0].prevout.hash as string);

        let ctx: TX;
        try {
            // check if the lockTx previous transaction is also in TXlist
            ctx = txs.getTX(prevHash);
        } catch (e) {
            continue;
        }

        // Is this a valid lock tx or another random kind?
        const valid = verifyLockTX(txs.getTX(txid), ctx, servicePubKey);
        if (!valid) {
            continue;
        }

        // Determine at what block this tx is spendable
        const height = txs.getHeight(txid);
        const period = getLockTxTime(lockTx) as number;
        const expires = period;
        // console.log(expires);

        // Has the P2SH fee been spent yet, signalling a revocation?
        const revoked = txs.getOutputSpent(txid, 1);
        if (revoked) {
            continue;
        }

        const pubKey = getLockTxPubKey(lockTx) as Buffer;

        const data = {
            txid,
            pubKey,
            expires,
            invalid: false,
        };

        const name = getLockTxName(lockTx) as string;

        if (map.hasOwnProperty(name) && txs.getHeight(map[name].txid) === height) {
            map[name].invalid = true;
            continue;
        }

        // If this name is already registered, don't replace it
        // Unless the name expired before this tx even existed, in which case include it
        if (!map.hasOwnProperty(name) || map[name].expires < height) {
            map[name] = data;
        }
    }

    // Now return only the non-expired names
    const mapNonExp: INameInfo = {};
    for (const key in map) {
        if (map[key].expires >= curHeight && !map[key].invalid) {
            const {invalid, ...dataCpy} = map[key];
            mapNonExp[key] = dataCpy;
        }
    }

    return mapNonExp;
}

export {
    extractInfo,
};
