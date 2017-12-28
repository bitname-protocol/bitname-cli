import { genRedeemScript } from '../lib/txs';
import { BadUserPublicKeyError, BadServicePublicKeyError } from '../lib/errors';

describe('tx generation', () => {
    it('generates a valid redeem script', () => {
        const serviceKey = Buffer.from('02a1633cafcc01ebfb6d78e39f687a1f0995c62fc95f51ead10a02ee0be551b5dc', 'hex');
        const userKey = Buffer.from('030589ee559348bd6a7325994f9c8eff12bd5d73cc683142bd0dd1a17abc99b0dc', 'hex');
        const script = genRedeemScript(userKey, serviceKey, 5);

        const expected = [
            'OP_IF',
            userKey.toString('hex'),
            'OP_CHECKSIG',
            'OP_ELSE',
            'OP_5',
            'OP_CHECKSEQUENCEVERIFY',
            'OP_DROP',
            serviceKey.toString('hex'),
            'OP_CHECKSIG',
            'OP_ENDIF',
        ];

        expect(script.toASM().split(' ')).toEqual(expected);
    });

    it('fails if user pubkey is invalid', () => {
        const serviceKey = Buffer.from('02a1633cafcc01ebfb6d78e39f687a1f0995c62fc95f51ead10a02ee0be551b5dc', 'hex');
        const userKey = Buffer.from('030000000000000000000000000000000000000000000000000000000000000000', 'hex');
        expect(() => {
            genRedeemScript(userKey, serviceKey, 5);
        }).toThrowError(BadUserPublicKeyError);
    });

    it('fails if service pubkey is invalid', () => {
        const serviceKey = Buffer.from('021111111111111111111111111111111111111111111111111111111111111111', 'hex');
        const userKey = Buffer.from('030589ee559348bd6a7325994f9c8eff12bd5d73cc683142bd0dd1a17abc99b0dc', 'hex');
        expect(() => {
            genRedeemScript(userKey, serviceKey, 1);
        }).toThrowError(BadServicePublicKeyError);
    });
});
