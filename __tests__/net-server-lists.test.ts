jest.mock('electrum-client');

describe('network functions with bad server lists', () => {
    beforeEach(() => {
        jest.resetModules();
    });

    it('errors on empty list of servers', async () => {
        jest.doMock('../data/servers_testnet.json', () => ({}), {
            virtual: true,
        });

        // Holy god this is janky, jest wyd???
        const getFeesSatoshiPerKB = require('../lib/net').getFeesSatoshiPerKB;
        await expect(getFeesSatoshiPerKB('testnet')).rejects.toThrow('No valid servers');
    });

    it('errors on no available tls servers', async () => {
        jest.doMock('../data/servers_testnet.json', () => ({
            'electrum.akinbo.org': {
                t: '51001',
            },
        }), {
            virtual: true,
        });

        const getFeesSatoshiPerKB = require('../lib/net').getFeesSatoshiPerKB;
        await expect(getFeesSatoshiPerKB('testnet')).rejects.toThrow('No valid servers');
    });
});
