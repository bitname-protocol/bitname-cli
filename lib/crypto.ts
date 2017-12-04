import {
    sha256,
} from 'bcoin/lib/crypto';
import {
    fromSeed,
} from 'bcoin/lib/hd/hd';

import { config } from '../config';
const NETWORK = config.network;

function keyFromPass(pass) {
    const key = fromSeed(sha256(Buffer.from(pass, 'utf8')), NETWORK);

    return key;
}

export { keyFromPass };
