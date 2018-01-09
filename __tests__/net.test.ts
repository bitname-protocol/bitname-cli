jest.mock('../lib/netUtils');
import { fetchUnspentTX, fetchAllTX } from '../lib/netUtils';

import { fundTx, getAllTX } from '../lib/net';

import { address as Address } from 'bcoin';

describe('network data', () => {
    it('generates coins correctly', async () => {
        const addr = Address.fromBase58('mk8cJh83q2JKBNguuzamfN1LZ9aECtnVJ7');
        const coins = await fundTx(addr, 1, 'testnet');

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
        const txList = await getAllTX(addr, 'testnet');

        const expectedTxids = [
            '4725685d4df950f189fc2e0d7d13b9b96747da91468df0fec077530250323e7a',
            'b058c0370a2dee52aae63af664804607095b8b61de9a1f836fccbf7cd21b1e00',
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
            '793e5ba7f78a6e6d7bf67541491ecc892ec6459dfbf8899a54afd4001a149f4c',
            '71b3b03377833485ac10250ac6e84dac6386c76e800c4cac4dbdfc320d2f1fbe',
            'a672fbd0ed39db91e22c839099c4bf54a237469ff617dc982cf77c806d037c7a',
            'e6c12999afcf9944175151506854cfc626a696b46fd0174c9ff35f4daf46f271',
            'd593b2a55eac720c9e9650bd84361269a865f9bcafa8d4f269d14c36ad9de558',
            'e69a49b57a1f57eed4216fcd929e59207d6ca25c0f548208ad796ebf2c76815f',
            'b2aa8a0daa851f13bb7ffc6c411562161347b8f641ca7ec7576f018ef8858f17',
            '07c66041e70cfed5cafcaf956ea506b57f30282e82c26ea420d2d626b4c65e08',
            'cf6d723d743b2247145e9591daa517938b1ade44c3a5a5b81135e999ffac2c33',
            '30b60d2984c8b86ec5485932f84a15a9a08867db356271187394b41d9d3e1410',
            'afb7c2ca61ccbb302033ef2605f3ae02b85484a01b364f93ea999f2935004d19',
            '41444f91dce1a420998d1136ed742fb2030536a35d3b8cbe28581aa73bb7c621',
            'ad7e5a1c7b07e7d08cd184eae1a9bc6d51f911c94f9018a262fe643cc52986a3',
            'a3baec16f9c93e465863f9b3f9000d327f24620f43bb402a68f119ff6bad47c6',
            'b747938eac6b75170fcb65acb37f773d4b370f1d462a23e2aad27fdd402a4136',
            'd5dfe44619e5e2a806399309880944714fdbfe4524852be97287ef80eb844332',
        ];

        expect(txList.getTxids()).toEqual(expectedTxids);
    });
});
