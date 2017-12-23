import {
    crypto,
    hd as HD,
} from 'bcoin';

const sha256 = crypto.sha256;
const fromSeed = HD.fromSeed;

import { config } from '../config';
const NETWORK = config.network;

function keyFromPass(pass: string) {
    const key = fromSeed(sha256(Buffer.from(pass, 'utf8')), NETWORK);

    return key;
}

export { keyFromPass };
