import * as fs from 'fs';
import {script as Script, address as Address, util} from 'bcoin';
const revHex = util.revHex;

// function addrToScriptHash(addr: Address): string {
//     const script = Script.fromAddress(addr);
//     const origHash = script.sha256('hex') as string;
//     return revHex(origHash);
// }

function addrStrToScriptHash(addrStr: string): string {
    const addr = Address.fromBase58(addrStr);
    const script = Script.fromAddress(addr);
    const origHash = script.sha256('hex') as string;
    return revHex(origHash);
}

const files = ['./__mocks__/unspent.json', './__mocks__/history.json'];

for (const file of files) {
    const curObj = JSON.parse(fs.readFileSync(file, 'utf8'));

    const newObj: {[key: string]: any} = {};

    Object.keys(curObj).map((key) => {
        const hash = addrStrToScriptHash(key);
        newObj[hash] = curObj[key];
    });

    const json = JSON.stringify(newObj, null, 4);

    fs.writeFileSync(file, json);
}
