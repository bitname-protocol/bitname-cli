/* tslint:disable:max-classes-per-file */

export class BadUserPublicKeyError extends Error {
    // tslint:disable:variable-name
    public __proto__: Error;
    constructor() {
        const trueProto = new.target.prototype;
        super('Invalid user public key');

        // Alternatively use Object.setPrototypeOf if you have an ES6 environment.
        this.__proto__ = trueProto;
    }
}

export class BadServicePublicKeyError extends Error {
    // tslint:disable:variable-name
    public __proto__: Error;
    constructor() {
        const trueProto = new.target.prototype;
        super('Invalid service public key');

        // Alternatively use Object.setPrototypeOf if you have an ES6 environment.
        this.__proto__ = trueProto;
    }
}

/* tslint:enable:max-classes-per-file */
