<h1 align="center">
    <br />
    <img src="graphics/logo.png" alt="bitname" width="512" />
    <br />
</h1>

<p align="center"><b>Associate public keys with names on the Bitcoin blockchain</b></p>

<p align="center">
    <a href="https://gitter.im/bitname-cli/Lobby">
        <img src="https://img.shields.io/gitter/room/nwjs/nw.js.svg?style=for-the-badge" alt="Chat on Gitter" />
    </a>
    <a href="https://travis-ci.org/bitname-protocol/bitname-cli">
        <img src="https://img.shields.io/travis/bitname-protocol/bitname-cli/master.svg?style=for-the-badge" alt="Travis" />
    </a>
<a href="https://app.fossa.io/projects/git%2Bgithub.com%2Fbitname-protocol%2Fbitname-cli?ref=badge_shield" alt="FOSSA Status"><img src="https://app.fossa.io/api/projects/git%2Bgithub.com%2Fbitname-protocol%2Fbitname-cli.svg?type=shield"/></a>
    <a href="https://codecov.io/gh/bitname-protocol/bitname-cli">
        <img src="https://img.shields.io/codecov/c/github/bitname-protocol/bitname-cli/master.svg?style=for-the-badge" alt="Codecov" />
    </a>
    <a href="https://waffle.io/bitname-protocol/bitname-cli">
        <img src="https://img.shields.io/github/issues/bitname-protocol/bitname-cli.svg?style=for-the-badge" alt="Issues" />
    </a>
    <a href="https://www.gnu.org/licenses/lgpl.html">
        <img src="https://img.shields.io/github/license/bitname-protocol/bitname-cli.svg?style=for-the-badge" alt="License" />
    </a>
</p>


[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2Fbitname-protocol%2Fbitname-cli.svg?type=large)](https://app.fossa.io/projects/git%2Bgithub.com%2Fbitname-protocol%2Fbitname-cli?ref=badge_large)

## What is this?

Besides being a store of value, Bitcoin is also useful as a distributed database. By embedding certain data in this database, it becomes possible to associate public keys and human-readable names. These pairs are registered for a set length of time, after which they must be renewed or become available to others.

This is a proof-of-concept CLI tool to create and parse this data.

## Installation

```bash
git clone https://github.com/bitname-protocol/bitname-cli.git
cd bitname-cli
```

### yarn

```bash
$ yarn
$ yarn build
$ yarn global add $PWD
```

### npm

```bash
$ npm install
$ npm run build
$ npm install -g .
```

## Usage

As of now, the package is unstable. As a result, everything shown below will be done on the testnet.

First, generate a new private key.

```bash
$ bitname key-gen -o mykey.wif --network testnet
```

You need to fund the address displayed. The easiest way to get tBTC is a faucet, such as:

* https://testnet.coinfaucet.eu/en/
* https://testnet.manu.backend.hamburg/faucet
* http://tpfaucet.appspot.com/

Once you have some coins, you can start your registration process!

First, pick a service to use. Here, we will use a service with the public key

    tp1qqdssqgmu777ddtsn2rv4uuwljy999dkz3zr8n2fwakw7xf4e5d5jg58ykmn

This key is equivalent to the testnet address `n4QtQVZF85XXB3rPTkb4B5c8THrp8uMiMb`.

Now, let's register a name! We're going to register the name 'bitname' until block 1283165. First, we have to "commit" to the name.

```bash
$ bitname commit tp1qqdssqgmu777ddtsn2rv4uuwljy999dkz3zr8n2fwakw7xf4e5d5jg58ykmn bitname 1283165 -w mykey.wif --push
```

The output of this command will be a 64-character hexadecimal string, like `8435f7d681828dd51077cf4d66b9300994b786cf8e647324f73ac31fde8bfe2c`. You can check its status on a block explorer, like [Blocktrail](https://www.blocktrail.com/tBTC). Here's the [example transaction](https://www.blocktrail.com/tBTC/tx/8435f7d681828dd51077cf4d66b9300994b786cf8e647324f73ac31fde8bfe2c).

Commitment is a process by which you call "dibs" on a name, and then wait 6 blocks (~1 hour) to finalize the registration. This makes the system much more secure. Note that on testnet, the time between blocks varies a great deal, so be prepared.

Once an hour has passed, we can publically register our name!

```bash
$ bitname register tp1qqdssqgmu777ddtsn2rv4uuwljy999dkz3zr8n2fwakw7xf4e5d5jg58ykmn 8435f7d681828dd51077cf4d66b9300994b786cf8e647324f73ac31fde8bfe2c bitname 1283165 -w mykey.wif --push
```

Note that the service pubkey, name, and time must match exactly. Replace the txid above with the one the commitment command output.

This will print the transaction id of your registration. Once it's been confirmed, we can see the names currently registered with the service.

```bash
$ bitname all-names tp1qqdssqgmu777ddtsn2rv4uuwljy999dkz3zr8n2fwakw7xf4e5d5jg58ykmn
```

This will output a list of all the names on this service, including yours! Nice!

But wait, what if you don't like or need that name anymore? Well, you can revoke it. The way registration works, half of your funds are instantly sent to the service, but the other half aren't valid until it expires. Before that, you can reclaim that half.

```bash
$ bitname revoke tp1qqdssqgmu777ddtsn2rv4uuwljy999dkz3zr8n2fwakw7xf4e5d5jg58ykmn <txid> -w mykey.wif --push
```

Fill in your own registration's txid, and bam, you've got half your money back.

## Testnet is annoying. Can I use regtest instead?

You betcha! Check out the [regtest guide](./REGTEST_GUIDE.md) for how to get started.

## I'm a developer, can I use this in my app?

Sure thing! Read our handy-dandy [API docs](https://docs.bitname.xyz/).

## Tell me more!

Glad you asked! For a more technical summary, check out the [protocol specification](./paper/paper.adoc).

## Future plans

* SegWit support to remove transaction malleability
* A switch to the open Electrum protocol instead of relying on a proprietary, rate-limited API
* Fixing a potential DoS attack vector (see the spec for a better description)

## Contributing

Please see the [code of conduct](CODE_OF_CONDUCT.md) and [contributor guidelines](CONTRIBUTING.md).

## Disclosure Policy

Please do not contact any contributors privately to disclose a bug. Make an issue so that this is immediately brought to light.

## Technologies Used

* Typescript
* bcoin for Bitcoin functionality
* BlockCypher's excellent REST API
* jest for testing
* chalk for pretty colors