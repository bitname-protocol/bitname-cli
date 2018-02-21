import { getFeesSatoshiPerKB } from '../lib/net';

const mock = {
    blockchainEstimatefee: jest.fn(),
    close: jest.fn(),
    connect: jest.fn(),
    server_version: jest.fn(),
};

jest.mock('electrum-client', () => {
    return jest.fn().mockImplementation(() => mock);
});

import ElectrumClient = require('electrum-client');

describe('network functions with bad fees', () => {
    beforeEach(() => {
        // Clear all instances and calls to constructor and all methods
        jest.clearAllMocks();
    });

    it('throws on -1 as fee', async () => {
        // Tests the situation where all the servers can not estimate fees
        const estFeeFn = (new ElectrumClient(0, '', '')).blockchainEstimatefee as jest.Mock<{}>;
        estFeeFn.mockReturnValue(Promise.resolve(-1));

        await expect(getFeesSatoshiPerKB('testnet')).rejects.toThrow('Could not connect to a server');
    });

    it('throws on valid initial fee and then -1 on check', async () => {
        // Tests the situattion where a server is temporarily unable to estimate fees
        const estFeeFn = (new ElectrumClient(0, '', '')).blockchainEstimatefee as jest.Mock<{}>;
        estFeeFn.mockReturnValueOnce(Promise.resolve(1)).mockReturnValueOnce(Promise.resolve(-1));

        await expect(getFeesSatoshiPerKB('testnet')).rejects.toThrow('Bad fee rate');
    });
});
