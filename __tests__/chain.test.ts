jest.mock('../lib/netUtils');
import { fetchUnspentTX, fetchAllTX } from '../lib/netUtils';

import {
    address as Address,
} from 'bcoin';
import { fundTx, getAllTX } from '../lib/net';

import { extractInfo } from '../lib/chain';

describe('chain state', () => {
    it('finds the one current name', async () => {
        const addr = Address.fromBase58('mk8cJh83q2JKBNguuzamfN1LZ9aECtnVJ7');
        const txList = await getAllTX(addr);

        const servicePubKey = Buffer.from('036d6e6cf57a88d39fee39b88721dcd5afbb18e5d078888293eaf5eee2fbc4cd36', 'hex');

        const info = extractInfo(txList, servicePubKey, 1257057);

        const expectedInfo = {
            test: {
                txid: 'd9b495951954e29aa4f07dacdeef7f858d1f5e0099009ac159496375c427c99e',
                pubKey: servicePubKey,
            },
        };

        expect(info).toEqual(expectedInfo);
    });
});
