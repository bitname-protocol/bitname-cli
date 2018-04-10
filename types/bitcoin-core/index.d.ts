declare module 'bitcoin-core' {
    export default class Client {
        constructor(args: {
            port: number | string,
            username: string,
            password: string,
            version?: string,
            host?: string,
            network: string,
        });

        generate(blocks: number): string[];

        getBlockCount(): number;

        sendToAddress(addr: string, amount: number): string;
    }
}
