jest.mock('../lib/netUtils');
import { fetchUnspentTX, fetchAllTX } from '../lib/netUtils';

import { fundTx, getAllTX } from '../lib/net';

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

        expect(actualStr).toBe(expectedStr);
    });

    it('generates a tx list from network data', async () => {
        const addr = Address.fromBase58('mk8cJh83q2JKBNguuzamfN1LZ9aECtnVJ7');
        // const txs = await fetchAllTX(addr);
        const txList = await getAllTX(addr);

        const expectedTxids = [
            'd9b495951954e29aa4f07dacdeef7f858d1f5e0099009ac159496375c427c99e',
            '77c650e4e3e01f43360cc1ea1d0ec4ebaa0842cfd9b976424e15d2e3714ce15e',
            '794f212860b0b2f269ace5d32f839d6abfe5b29d62e4570549dd026d1de447e9',
            '095ee2d0a82a9e93a11e946616f3ad503aa3caf26d2259da31daa977cf2529c5',
            '90a74125bbb0381d0128555ab3ac31f60765248a98f64f178202416c3c41ec1e',
            '9464e553907a85188e28e0ace9bfa10e61a9c5b8aa4be826770e6ce47e92fe62',
            '5da1536a879111d2586da4635388dff162cc45290ac386882c2c854b6719442a',
            'd2aa97120ac2456472b6b10109a89242eddbf0a69387dd7910a328a9ad04eeb0',
            '50c68982ee137036f991182ece20d0ac303a073a267a9fdba3cb6c84863e6302',
            '179afc4997aaa848a88b937c446c5fb81edb0561cdffb6df463b1b7c61068c83',
        ];

        expect(txList.getTxids()).toEqual(expectedTxids);
    });
});
