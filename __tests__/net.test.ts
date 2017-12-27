jest.mock('../lib/netUtils');
import { fetchUnspentTX } from '../lib/netUtils';

import { fundTx } from '../lib/net';

import { address as Address } from 'bcoin';

describe('network data', () => {
    it('generates coins correctly', async () => {
        const addr = Address.fromBase58('mk8cJh83q2JKBNguuzamfN1LZ9aECtnVJ7');
        const coins = await fundTx(addr, 1);

        const expected = [
            {
                version: 1,
                height: -1,
                value: 280463407,
                script: '76a914329ecab2c7fc540c96295a507a367a46a0ee649488ac',
                address: '15cf1e351zs4QGDJCRcPqSo1h9yXFsMY2A',
                coinbase: false,
                hash: 'd5dfe44619e5e2a806399309880944714fdbfe4524852be97287ef80eb844332',
                index: 0,
            },
        ];

        const expectedStr = JSON.stringify(expected);
        const actualStr = JSON.stringify(coins);

        expect(expectedStr).toBe(actualStr);
    });
});
