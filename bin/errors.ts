import chalk from 'chalk';

/* tslint:disable:no-console */
export function error(msg: string): never {
    console.error(chalk`{red Error: ${msg}}`);
    // process.exit(1);
    // throw new Error('Somehow, exiting the process failed?');
    throw new Error(msg);
}

export function errorUnfoundTx(): never {
    return error('Could not find the transaction. Check the txid or try again later.');
}

export function errorBadHRP() {
    return error('Invalid pubkey HRP');
}

export function errorNoFees() {
    return error('Could not fetch fee information. Try again later.');
}

export function errorInvalidLock() {
    return error('This is not a valid bitname registration tx');
}

export function errorCantPush() {
    return error('There was a problem publishing the tx. Try again later.');
}
