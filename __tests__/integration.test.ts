import Client from 'bitcoin-core';

describe('Network integration testing', async () => {
    const client = new Client({
        port: 12001,
        username: 'user',
        password: 'password',
        version: '0.16.0',
        host: '127.0.0.1',
        network: 'regtest',
    });

    // const userWif = 'cSfYjfhSotRuhYx7n8ttCFdbHRZiMxwdmBPyJb2BZBous96sbSkh';
    // const serviceWif = 'cMb11yoKHey8fp26zXV1vbeGCmw62nXJ8SVQJ6Uk2vdK6mEQyhNX';

    beforeAll(async () => {
        const curBlocks = await client.getBlockCount();
        if (curBlocks < 101) {
            await client.generate(101);
        } else {
            await client.generate(1);
        }
    });

    it('Publishes a commit tx', async () => {
        await client.getBlockCount();
    });
});
