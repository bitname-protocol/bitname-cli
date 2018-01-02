import {
    crypto,
    hd as HD,
} from 'bcoin';

const hash256 = crypto.hash256;
const scrypt = crypto.scrypt;
const fromSeed = HD.fromSeed;

function keyFromPass(pass: string, net: string) {
    // const key = fromSeed(sha256(Buffer.from(pass, 'utf8')), NETWORK);
    const passBuff = Buffer.from(pass, 'utf8');
    const N = 1048576;
    const seed = scrypt.derive(passBuff, hash256(passBuff), N, 8, 1, 64);

    const key = fromSeed(seed, net);

    return key;
}

export { keyFromPass };
