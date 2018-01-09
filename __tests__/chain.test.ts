jest.mock('../lib/netUtils');
import { fetchUnspentTX, fetchAllTX } from '../lib/netUtils';

import {
    address as Address,
    crypto,
} from 'bcoin';
import { fundTx, getAllTX } from '../lib/net';

import { extractInfo } from '../lib/chain';

describe('chain state', () => {
    it('finds the one current name', async () => {
        const servicePubKey = Buffer.from('032b9429c7553028aea2464021c7680a408885a49c62af6adba435ec751d467237', 'hex');
        const userPubKey = Buffer.from('036d6e6cf57a88d39fee39b88721dcd5afbb18e5d078888293eaf5eee2fbc4cd36', 'hex');

        const addr = Address.fromPubkeyhash(crypto.hash160(servicePubKey));
        console.log(addr);
        const txList = await getAllTX(addr, 'testnet');

        const info = extractInfo(txList, servicePubKey, 1257057);

        const expectedInfo = {
            colin: {
                txid: '205c16dc3440d83754558d028eb94d19cce857852c4a63e3daf24f5a7d14674f',
                expires: 1257888 + 30,
                pubKey: userPubKey,
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
