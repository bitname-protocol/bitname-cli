import TXList from './TXList';
import { verifyLockTX } from './verify';
import { getLockTxTime, getLockTxName, getLockTxPubKey } from './txs';

interface IReadonlyNameInfo {
    readonly [name: string]: {
        readonly txid: string;
        readonly pubKey: Buffer;
    };
}

interface INameInfo {
    [name: string]: {
        txid: string;
        pubKey: Buffer;
    };
}

function extractInfo(txs: TXList, servicePubKey: Buffer, curHeight: number): IReadonlyNameInfo {
    const map: INameInfo = {};

    for (const txid of ([...txs.getTxids()].reverse() as ReadonlyArray<string>)) {
        const lockTx = txs.getTX(txid);

        const valid = verifyLockTX(txs.getTX(txid), servicePubKey);
        if (!valid) {
            console.log(`Skipping tx ${txid}`);
            continue;
        }

        const height = txs.getHeight(txid);
        const period = getLockTxTime(lockTx);
        const expired = height + period < curHeight;
        if (expired) {
            console.log(`Tx ${txid} expired`);
            continue;
        }

        const revoked = txs.getOutputSpent(txid, 3);
        if (revoked) {
            console.log(`Tx ${txid} revoked`);
            continue;
        }

        const pubKey = getLockTxPubKey(lockTx);

        // console.log(txid, getLockTxName(lockTx));
        const data = {
            txid,
            pubKey,
        };

        map[getLockTxName(lockTx)] = data;
    }

    return map;
}

export {
    extractInfo,
};
