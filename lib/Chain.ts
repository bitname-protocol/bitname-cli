import TXList from './TXList';
import { verifyLockTX } from './verify';
import { getLockTxTime, getLockTxName } from './txs';

export default class Chain {
    constructor(txs: TXList, servicePubKey: Buffer, curHeight: number) {
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

            console.log(txid, getLockTxName(lockTx));
        }
    }
}
