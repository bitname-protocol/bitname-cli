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
        const txList = await getAllTX(addr, 'testnet');

        const servicePubKey = Buffer.from('036d6e6cf57a88d39fee39b88721dcd5afbb18e5d078888293eaf5eee2fbc4cd36', 'hex');

        const info = extractInfo(txList, servicePubKey, 1257057);

        const expectedInfo = {
            test: {
                txid: 'd9b495951954e29aa4f07dacdeef7f858d1f5e0099009ac159496375c427c99e',
                expires: 1257089,
                pubKey: servicePubKey,
            },
        };

        expect(info).toEqual(expectedInfo);
    });

    it('does not include a double name, even if both are in the same block', async () => {
        const addr = Address.fromBase58('n4QGUi9Ds29DBcN8MdPcHwb3rt3uh8NLHw');
        const txList = await getAllTX(addr, 'testnet');

        const servicePubKey = Buffer.from('03f000da94f60417c76832179fd82ebfc614f5df9e67ffbc1717542ec460e8054c', 'hex');
        const userPubKey = Buffer.from('036d6e6cf57a88d39fee39b88721dcd5afbb18e5d078888293eaf5eee2fbc4cd36', 'hex');

        const info = extractInfo(txList, servicePubKey, 1257485);

        const expectedInfo = {
            bepis: {
                txid: '36dde07add46748ae3a45ae9ace347743fc3ad9cd958f36f3dfdc36d848f02c1',
                expires: 1257535,
                pubKey: userPubKey,
            },
        };

        expect(info).toEqual(expectedInfo);
    });

    it('does not include a double name even after the original expires', async () => {
        const addr = Address.fromBase58('n4QGUi9Ds29DBcN8MdPcHwb3rt3uh8NLHw');
        const txList = await getAllTX(addr, 'testnet');

        const servicePubKey = Buffer.from('03f000da94f60417c76832179fd82ebfc614f5df9e67ffbc1717542ec460e8054c', 'hex');
        const userPubKey = Buffer.from('036d6e6cf57a88d39fee39b88721dcd5afbb18e5d078888293eaf5eee2fbc4cd36', 'hex');

        const info = extractInfo(txList, servicePubKey, 1257537);

        const expectedInfo = {};

        expect(info).toEqual(expectedInfo);
    });
});
