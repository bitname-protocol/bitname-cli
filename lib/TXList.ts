import {
    tx as TX,
} from 'bcoin';

export default class TXList {
    private readonly txs: {
        readonly [key: string]: TX;
    };

    private readonly spent: {
        readonly [key: string]: boolean[];
    };

    private readonly txids: ReadonlyArray<string>;

    constructor(txs: TX[], spent: boolean[][]) {
        if (txs.length !== spent.length) {
            throw new Error('List of TXs and spent outputs must be of same length');
        }

        const txMap: {[key: string]: TX} = {};
        const spentMap: {[key: string]: boolean[]} = {};
        const tmpTxids: string[] = [];

        for (let i = 0; i < txs.length; ++i) {
            const tx = txs[i];
            const txSpent = spent[i];

            const hash = tx.hash('hex') as string;

            txMap[hash] = tx;
            spentMap[hash] = txSpent;

            tmpTxids.push(hash);
        }

        this.txs = txMap;
        this.spent = spentMap;
        this.txids = tmpTxids;
    }

    public getTX(txid: string): TX {
        if (!this.txs.hasOwnProperty(txid)) {
            throw new Error(`Unknown txid ${txid}`);
        }

        return this.txs[txid];
    }

    public getOutputSpent(txid: string, output: number): boolean {
        if (!this.spent.hasOwnProperty(txid)) {
            throw new Error(`Unknown txid ${txid}`);
        }

        const txSpent = this.spent[txid];

        if (output < 0 || output >= txSpent.length) {
            throw new Error(`Unknown output ${output} for txid ${txid}`);
        }

        return txSpent[output];
    }

    public get getTxids(): ReadonlyArray<string> {
        return this.txids;
    }

    public toString(): string {
        return `AddrTXs with ${this.txids.length} entries`;
    }
}
