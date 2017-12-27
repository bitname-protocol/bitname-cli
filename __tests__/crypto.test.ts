import { keyFromPass } from '../lib/crypto';

describe('cryptographic primitives', () => {
    it('deterministically derives private keys from passphrase', () => {
        // Hex form of expected derived private key
        const correctPrivKey = 'c8abc6569b01a5e9ec966b53d504174c575652705a71fd55116ae62b7bf555a0';

        const key = keyFromPass('correct horse stapler battery');
        expect(key.privateKey.toString('hex')).toBe(correctPrivKey);
    });
});
