import {
    tx as TX,
    util,
} from 'bcoin';

export default class TXList {


    private readonly txs: {
        readonly [key: string]: TX;
    };

    private readonly spent: {
        readonly [key: string]: boolean[];
    };

    private readonly heights: {
        readonly [key: string]: number;
    };

    private readonly txids: ReadonlyArray<string>;

    constructor(txs: TX[], spent: boolean[][], heights: number[]) {
        if (txs.length !== spent.length || txs.length !== heights.length) {
            throw new Error('Lists of TXs, spent outputs, and heights must be of same length');
        }

        const txMap: {[key: string]: TX} = {};
        const spentMap: {[key: string]: boolean[]} = {};
        const heightMap: {[key: string]: number} = {};
        const tmpTxids: string[] = [];

        for (let i = 0; i < txs.length; ++i) {
            const tx = txs[i];
            const txSpent = spent[i];
            const txHeight = heights[i];

            const hash = util.revHex(tx.hash('hex')) as string;

            if (tx.outputs.length !== txSpent.length) {
                throw new Error(`Bad outputs for tx ${hash}; got ${txSpent.length}, expected ${tx.outputs.length}`);
            }

            txMap[hash] = tx;
            spentMap[hash] = txSpent;
            heightMap[hash] = txHeight;

            tmpTxids.push(hash);
        }

        this.txs = txMap;
        this.spent = spentMap;
        this.heights = heightMap;
        this.txids = tmpTxids;
    }


    /**
        Returns the transation matching the specified transaction ID.
        @param txid is the bitcoin transaction ID
    */
    public getTX(txid: string): TX {
        if (!this.txs.hasOwnProperty(txid)) {
            throw new Error(`Unknown txid '${txid}'`);
        }

        return this.txs[txid];
    }

    /**
        Returns whether the specified output of the specified transaction has been spent.
        @param txid is the bitcoin transaction ID.
        @param output is the specified output we wish to monitor. 
    */
    public getOutputSpent(txid: string, output: number): boolean {
        if (!this.spent.hasOwnProperty(txid)) {
            throw new Error(`Unknown txid '${txid}'`);
        }

        const txSpent = this.spent[txid];

        if (output < 0 || output >= txSpent.length) {
            throw new Error(`Unknown output '${output}' for txid '${txid}'`);
        }

        return txSpent[output];
    }

    /**
        Returns the height of the transaction within the blockchain.
        @param txid is the bitcoin transaction ID
    */
    public getHeight(txid: string): number {
        if (!this.heights.hasOwnProperty(txid)) {
            throw new Error(`Unknown txid '${txid}'`);
        }

        return this.heights[txid];
    }

    /**
        Returns the list of transactions  
    */
    public getTxids(): ReadonlyArray<string> {
        return this.txids;
    }
}
