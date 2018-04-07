# Getting Started with `regtest`

Bitcoin's regtest mode is one of the most useful tools available to developers who wish to use the network. It makes it easy to test transactions with real Bitcoin clients, but without any actual money.

This document aims to show you how regtest can be used for development with bitname.

## What is regtest?

Bitcoin can run in three modes: mainnet, testnet, and regtest. Mainnet is "Bitcoin" as we know it--transactions are exchanges of real money, and are secured by a huge amount of hashpower. Obviously, testing here would be no fun. Who wants to spend $100 every time they run their unit tests?

Testnet, like mainnet, is distributed among many computers. This gives developers the opportunity to test on many different clients, with network latency, etc. without spending any real money. However, block generation is still controlled by the network, and TBTC can only be acquired from faucets.

Regtest can be thought of as your own private testnet. It exists only on your machine, and the difficulty is fixed at a low number so that you can CPU mine for it all on your own. However, it still applies all of the same consensus rules, so you can check if your fancy-schmancy smart contract works without having to get bundles of TBTC--just generate your own!

## Sounds great! How can I use regtest?

For ease of development, this repository contains a bunch of regtest utilities in the aptly-named `regtest` directory. Let's go over how to use them!

### Prerequisites

* [Docker Compose](https://docs.docker.com/compose/install/)
* [Node.js](https://nodejs.org/en/)

### Let's Go!

First things first, let's move into the `regtest` directory.

```bash
cd regtest
```

Now, let's start up the the Docker images.

```bash
docker-compose up
```

You should see a whole bunch of output as the images are downloaded and started. Eventually, the output should stop as both the ElectrumX server and bitcoind finish starting up. Now, you can either exit and run `docker-compose up -d` (daemon mode), or just open another terminal.

Let's start mining! In regtest mode, block rewards must be allowed to "mature" for 100 blocks. So let's start by mining 101 blocks.

```bash
./mine.sh 101
```

You should now see 101 hexadecimal strings printed to your console. That means it worked.

Let's check our wallet balance by running `./get-balance.sh`. It should print out some nonzero number.

Say we want to test with the address `mmGx9VsBsn1Mv3gERhXTAChASu8vqkeke6`. But it has no funds. Fortunately, we can easily donate 10 RBTC to it.

```bash
./fund-addr.sh mmGx9VsBsn1Mv3gERhXTAChASu8vqkeke6 10.0
```

That should print out a txid (e.g. `5d99d3f8f71a43d901c4600f7cd8d6d77ef5b9a2b365d9a86154c977cbdb5d44`). Let's check it out.

```bash
./get-tx.sh 5d99d3f8f71a43d901c4600f7cd8d6d77ef5b9a2b365d9a86154c977cbdb5d44
```

That should output a long hexadecimal string--a raw Bitcoin transaction. Let's see what's encoded in it.

```bash
./bitcoin-cli.sh decoderawtransaction "insert long hex string here"
```

You may have noticed that we used a different command format this time. `bitcoin-cli.sh` is the lowest-level connecter to the dockerized bitcoin daemon, and the other scripts are convenience wrappers around it. With `bitcoin-cli.sh`, you can execute [any valid Bitcoin command](https://en.bitcoin.it/wiki/Original_Bitcoin_client/API_calls_list).

With this newfound knowledge, let's take a look at the mempool (the set of as-yet-unconfirmed Bitcoin transactions).

```bash
./bitcoin-cli.sh getmempoolinfo
```

You should see something like this:

```json
{
  "size": 1,
  "bytes": 168,
  "usage": 1184,
  "maxmempool": 300000000,
  "mempoolminfee": 0.00001000,
  "minrelaytxfee": 0.00001000
}
```

`"size": 1` means that there's a single unconfirmed transaction. Hey, that's ours! Let's put it in a nice, comfy block.

```bash
./mine.sh 1
```

If we rerun `getmempoolinfo`, we should get a size of 0.

Once you're done messing around, run `docker-compose down` and the containers will stop running. If you want to reset the chain, delete the `regtest/data/` directory (this may require `sudo`).

## So how does this work with bitname?

Run any command with `--network retest`, or with a regtest service pubkey and it will automatically connect to the Docker image. Pretty nifty, huh?

### Getting a regtest service pubkey

Just run

```bash
bitname-cli key-info [key file] --network regtest
```

and you're good to go. The key *should* be prefixed with `rp`.

## I have a question/comment/concern

Make an issue, or shoot us a message on Gitter (link is in the README).

Have fun!
