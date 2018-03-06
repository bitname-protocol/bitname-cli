#!/usr/bin/env node
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

async function main() {
    // If data directory doesn't exist, create it
    const dir = path.join(__dirname, 'data');
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir);
    }

    // Fetch list of default servers
    const serversRes = await fetch('https://raw.githubusercontent.com/spesmilo/electrum/master/lib/servers.json');
    if (!serversRes.ok) {
        throw new Error('Could not fetch list of servers');
    }
    const serversData = await serversRes.text();

    // Fetch list of default testnet servers
    const testServersRes = await fetch('https://raw.githubusercontent.com/spesmilo/electrum/master/lib/servers_testnet.json');
    if (!testServersRes.ok) {
        throw new Error('Could not fetch list of testnet servers');
    }
    const testServersData = await testServersRes.text();

    // Write servers to disk
    fs.writeFile(path.join(dir, 'servers.json'), serversData, (err) => {
        if (err) {
            throw err;
        }

        console.log('Updated servers.json');
    });

    // Write testnet servers to disk
    fs.writeFile(path.join(dir, 'servers_testnet.json'), testServersData, (err) => {
        if (err) {
            throw err;
        }

        console.log('Updated servers_testnet.json');
    });
}

main().catch((err) => {
    console.error(`${err.name}: ${err.message}`);
    process.exit(1);
})
