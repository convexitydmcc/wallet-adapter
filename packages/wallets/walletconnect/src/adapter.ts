import type { WalletName } from '@solana/wallet-adapter-base';
import {
    BaseSignerWalletAdapter,
    WalletConnectionError,
    WalletDisconnectionError,
    WalletError,
    WalletNotConnectedError,
    WalletPublicKeyError,
    WalletReadyState,
    WalletSignTransactionError,
    WalletWindowClosedError,
} from '@solana/wallet-adapter-base';
import SignClient from '@walletconnect/sign-client';
import type { Transaction } from '@solana/web3.js';
import { PublicKey } from '@solana/web3.js';
import QRCodeModal from '@walletconnect/qrcode-modal';
import type { SessionTypes, SignClientTypes } from '@walletconnect/types';
import bs58 from 'bs58';

export enum WalletConnectChainID {
    Mainnet = 'solana:4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZ',
    Devnet = 'solana:8E9rvCKLFQia2Y35HXjjpWzj8weVo44K',
}

export enum WalletConnectRPCMethod {
    SOLANA_GET_ACCOUNTS = 'solana_getAccounts',
    SOLANA_SIGN_TRANSACTION = 'solana_signTransaction',
    SOLANA_SIGN_MESSAGE = 'solana_signMessage',
}

export interface WalletConnectWalletAdapterConfig {
    chainId: string;
    options: SignClientTypes.Options;
    params?: any;
}

export const WalletConnectWalletName = 'WalletConnect' as WalletName;

export class WalletConnectWalletAdapter extends BaseSignerWalletAdapter {
    name = WalletConnectWalletName;
    url = 'https://walletconnect.org';
    // eslint-disable-next-line max-len
    icon = 'data:image/svg+xml;base64,PHN2ZyBoZWlnaHQ9IjE4NSIgdmlld0JveD0iMCAwIDMwMCAxODUiIHdpZHRoPSIzMDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0ibTYxLjQzODU0MjkgMzYuMjU2MjYxMmM0OC45MTEyMjQxLTQ3Ljg4ODE2NjMgMTI4LjIxMTk4NzEtNDcuODg4MTY2MyAxNzcuMTIzMjA5MSAwbDUuODg2NTQ1IDUuNzYzNDE3NGMyLjQ0NTU2MSAyLjM5NDQwODEgMi40NDU1NjEgNi4yNzY1MTEyIDAgOC42NzA5MjA0bC0yMC4xMzY2OTUgMTkuNzE1NTAzYy0xLjIyMjc4MSAxLjE5NzIwNTEtMy4yMDUzIDEuMTk3MjA1MS00LjQyODA4MSAwbC04LjEwMDU4NC03LjkzMTE0NzljLTM0LjEyMTY5Mi0zMy40MDc5ODE3LTg5LjQ0Mzg4Ni0zMy40MDc5ODE3LTEyMy41NjU1Nzg4IDBsLTguNjc1MDU2MiA4LjQ5MzYwNTFjLTEuMjIyNzgxNiAxLjE5NzIwNDEtMy4yMDUzMDEgMS4xOTcyMDQxLTQuNDI4MDgwNiAwbC0yMC4xMzY2OTQ5LTE5LjcxNTUwMzFjLTIuNDQ1NTYxMi0yLjM5NDQwOTItMi40NDU1NjEyLTYuMjc2NTEyMiAwLTguNjcwOTIwNHptMjE4Ljc2Nzc5NjEgNDAuNzczNzQ0OSAxNy45MjE2OTcgMTcuNTQ2ODk3YzIuNDQ1NTQ5IDIuMzk0Mzk2OSAyLjQ0NTU2MyA2LjI3NjQ3NjkuMDAwMDMxIDguNjcwODg5OWwtODAuODEwMTcxIDc5LjEyMTEzNGMtMi40NDU1NDQgMi4zOTQ0MjYtNi40MTA1ODIgMi4zOTQ0NTMtOC44NTYxNi4wMDAwNjItLjAwMDAxLS4wMDAwMS0uMDAwMDIyLS4wMDAwMjItLjAwMDAzMi0uMDAwMDMybC01Ny4zNTQxNDMtNTYuMTU0NTcyYy0uNjExMzktLjU5ODYwMi0xLjYwMjY1LS41OTg2MDItMi4yMTQwNCAwLS4wMDAwMDQuMDAwMDA0LS4wMDAwMDcuMDAwMDA4LS4wMDAwMTEuMDAwMDExbC01Ny4zNTI5MjEyIDU2LjE1NDUzMWMtMi40NDU1MzY4IDIuMzk0NDMyLTYuNDEwNTc1NSAyLjM5NDQ3Mi04Ljg1NjE2MTIuMDAwMDg3LS4wMDAwMTQzLS4wMDAwMTQtLjAwMDAyOTYtLjAwMDAyOC0uMDAwMDQ0OS0uMDAwMDQ0bC04MC44MTI0MTk0My03OS4xMjIxODVjLTIuNDQ1NTYwMjEtMi4zOTQ0MDgtMi40NDU1NjAyMS02LjI3NjUxMTUgMC04LjY3MDkxOTdsMTcuOTIxNzI5NjMtMTcuNTQ2ODY3M2MyLjQ0NTU2MDItMi4zOTQ0MDgyIDYuNDEwNTk4OS0yLjM5NDQwODIgOC44NTYxNjAyIDBsNTcuMzU0OTc3NSA1Ni4xNTUzNTdjLjYxMTM5MDguNTk4NjAyIDEuNjAyNjQ5LjU5ODYwMiAyLjIxNDAzOTggMCAuMDAwMDA5Mi0uMDAwMDA5LjAwMDAxNzQtLjAwMDAxNy4wMDAwMjY1LS4wMDAwMjRsNTcuMzUyMTAzMS01Ni4xNTUzMzNjMi40NDU1MDUtMi4zOTQ0NjMzIDYuNDEwNTQ0LTIuMzk0NTUzMSA4Ljg1NjE2MS0uMDAwMi4wMDAwMzQuMDAwMDMzNi4wMDAwNjguMDAwMDY3My4wMDAxMDEuMDAwMTAxbDU3LjM1NDkwMiA1Ni4xNTU0MzJjLjYxMTM5LjU5ODYwMSAxLjYwMjY1LjU5ODYwMSAyLjIxNDA0IDBsNTcuMzUzOTc1LTU2LjE1NDMyNDljMi40NDU1NjEtMi4zOTQ0MDkyIDYuNDEwNTk5LTIuMzk0NDA5MiA4Ljg1NjE2IDB6IiBmaWxsPSIjM2I5OWZjIi8+PC9zdmc+';

    publicKey: PublicKey | null = null;
    connecting = false;
    readyState: WalletReadyState = typeof window === 'undefined' || typeof document === 'undefined'
        ? WalletReadyState.Unsupported
        : WalletReadyState.Installed;
    private chainId: string;
    private params: any;
    private session: SessionTypes.Struct | null = null;
    private client: SignClient | undefined;

    constructor(config: WalletConnectWalletAdapterConfig) {
        super();
        this.init(config).then(() => {
            this.emit('readyStateChange', this.readyState);
        });

        // this._options = config.options;
        this.chainId = config.chainId;
        this.params = config.params || {
            permissions: {
                blockchain: { chains: Object.values(WalletConnectChainID) },
                jsonrpc: { methods: [WalletConnectRPCMethod.SOLANA_SIGN_TRANSACTION, WalletConnectRPCMethod.SOLANA_GET_ACCOUNTS, WalletConnectRPCMethod.SOLANA_SIGN_MESSAGE] },
            },
        };
    }

    async init(config: WalletConnectWalletAdapterConfig): Promise<void> {
        const signClient = await SignClient.init({
            projectId: config.options.projectId,
            metadata: config.options.metadata,
        });
        this.client = signClient;
        this.restoreSession(signClient);
    }

    get ready(): boolean {
        return typeof window !== 'undefined';
    }

    get connected(): boolean {
        return !!this.publicKey;
    }

    async connect(): Promise<void> {
        try {
            if (!this.client || this.connected || this.connecting) return;
            this.connecting = true;
            const { uri, approval } = await this.client.connect({
                requiredNamespaces: {
                    solana: {
                        methods: [
                            WalletConnectRPCMethod.SOLANA_GET_ACCOUNTS,
                            WalletConnectRPCMethod.SOLANA_SIGN_MESSAGE,
                            WalletConnectRPCMethod.SOLANA_SIGN_TRANSACTION,
                        ],
                        chains: [WalletConnectChainID.Mainnet, WalletConnectChainID.Devnet],
                        events: [],
                    },
                },
            });

            // Await session approval from the wallet.
            // eslint-disable-next-line no-async-promise-executor
            const session = await new Promise<SessionTypes.Struct>(async (resolve, reject) => {
                if (uri) {
                    QRCodeModal.open(uri, () => {
                        console.log('EVENT', 'QR Code Modal closed');
                        reject(new WalletWindowClosedError());
                    });
                }
                const response = await approval();
                resolve(response);
            });
            const allNamespaceAccounts = Object.values(session.namespaces)
                .map((namespace) => namespace.accounts)
                .flat();
            const addresses = allNamespaceAccounts
                // Filter out any non-solana accounts.
                .filter((account) => account.startsWith('solana:'))
                // Create a map of Solana address -> publicKey.
                .reduce((map: Record<string, PublicKey>, account) => {
                    const address = account.split(':').pop();
                    if (!address) {
                        throw new Error(
                            `Could not derive Solana address from CAIP account: ${account}`,
                        );
                    }
                    map[address] = new PublicKey(address);
                    return map;
                }, {});
            let publicKey: PublicKey;
            try {
                publicKey = Object.values(addresses)[0];
            } catch (error: any) {
                QRCodeModal.close();
                throw new WalletPublicKeyError(error?.message, error);
            }

            this.saveSession(session, publicKey);
            this.emit('connect', publicKey);
        } catch (error: any) {
            this.emit('error', error);
            if (error instanceof WalletError) throw error;
            throw new WalletConnectionError(error?.message, error);
        } finally {
            this.connecting = false;
            QRCodeModal.close();
        }
    }

    async disconnect(): Promise<void> {
        const client = this.client;
        if (client && this.session) {
            try {
                await client.disconnect({
                    topic: this.session.topic,
                    reason: { code: 0, message: '' },
                });
            } catch (error: any) {
                this.emit('error', new WalletDisconnectionError(error?.message, error));
            } finally {
                this.removeSession();
            }
        }
        this.emit('disconnect');
    }

    private saveSession(session: SessionTypes.Struct, publicKey: PublicKey): void {
        this.session = session;
        this.publicKey = publicKey;

        const serializedSession = JSON.stringify(session);
        const serializedPublicKey = publicKey.toString();

        window.localStorage.setItem('walletconnect-session', serializedSession);
        window.localStorage.setItem('walletconnect-publickey', serializedPublicKey);
    }

    private removeSession(): void {
        this.session = null;
        this.publicKey = null;

        window.localStorage.removeItem('walletconnect-session');
        window.localStorage.removeItem('walletconnect-publickey');
    }

    private restoreSession(client: SignClient): void {
        try {
            const serializedSession = window.localStorage.getItem('walletconnect-session');
            const publicKeyAsString = window.localStorage.getItem('walletconnect-publickey');

            if (!serializedSession || !publicKeyAsString) {
                return;
            }
            const session = JSON.parse(serializedSession);
            const publicKey = new PublicKey(publicKeyAsString);

            this.session = session;
            this.publicKey = publicKey;

            client.on('session_delete', () => {
                this.handleDisconnect();
            });
            this.emit('connect', publicKey);
        } catch (error: any) {
            console.error('Could not restore WalletConnect session', error);
        }
    }

    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    async signMessage(message: Uint8Array) {
        try {
            if (!this.client || !this.publicKey || !this.session) throw new WalletNotConnectedError();

            try {
                const requestParams = {
                    id: 1,
                    jsonrpc: '2.0',
                    method: WalletConnectRPCMethod.SOLANA_SIGN_MESSAGE,
                    params: {
                        message: bs58.encode(message),
                        pubkey: this.publicKey.toString(),
                    },
                };

                const signature = await this.client.request<string>({
                    topic: this.session.topic,
                    chainId: this.chainId,
                    request: requestParams,
                });

                if (signature) {
                    return bs58.decode(signature);
                }
            } catch (error: any) {
                throw new WalletSignTransactionError(error?.message, error);
            }
        } catch (error: any) {
            this.emit('error', error);
            throw error;
        }
    }

    async signTransaction(transaction: Transaction): Promise<Transaction> {
        if (!this.client || !this.publicKey || !this.session) {
            throw new WalletNotConnectedError();
        }

        try {
            // TODO uncomment when the mobile app fix will be ready
            // const requestParams = this.createRequestParams(transaction);
            const requestParams = {
                id: 1,
                jsonrpc: '2.0',
                topic: this.session.topic,
                chainId: this.chainId,
                request: {
                    method: WalletConnectRPCMethod.SOLANA_SIGN_MESSAGE,
                    params: {
                        message: bs58.encode(transaction.serializeMessage()),
                        pubkey: this.publicKey.toString(),
                    },
                },
            };

            const signature = await this.client.request<string>(requestParams);

            if (signature) {
                transaction.addSignature(this.publicKey, Buffer.from(bs58.decode(signature)));
            }

            return transaction;
        } catch (error: any) {
            console.error(error);
            const errorMessage = error?.message === 'Reject request'
                ? 'Transaction has been rejected'
                : error?.message;

            this.emit('error', error);
            throw new WalletSignTransactionError(errorMessage, error);
        }
    }

    async signAllTransactions(transactions: Transaction[]): Promise<Transaction[]> {
        if (!this.client || !this.publicKey || !this.session) throw new WalletNotConnectedError();
        const signedTransactions = [];

        // eslint-disable-next-line no-restricted-syntax
        for (const transaction of transactions) {
            const tx = await this.signTransaction(transaction);
            signedTransactions.push(tx);
        }

        return signedTransactions;
    }

    private createRequestParams(transaction: Transaction): any {
        return {
            id: 1,
            jsonrpc: '2.0',
            method: WalletConnectRPCMethod.SOLANA_SIGN_TRANSACTION,
            params: {
                feePayer: transaction.feePayer!.toBase58(),
                instructions: transaction.instructions.map((instruction) => ({
                    programId: instruction.programId.toBase58(),
                    data: bs58.encode(instruction.data),
                    keys: instruction.keys.map((key) => ({
                        isSigner: key.isSigner,
                        isWritable: key.isWritable,
                        pubkey: key.pubkey.toBase58(),
                    })),
                })),
                recentBlockhash: transaction.recentBlockhash,
                // TODO check if this field needed
                // "signatures": [{
                //   "pubkey": "AqP3MyNwDP4L1GJKYhzmaAUdrjzpqJUZjahM7kHpgavm",
                //   "signature": "2Lb1KQHWfbV3pWMqXZveFWqneSyhH95YsgCENRWnArSkLydjN1M42oB82zSd6BBdGkM9pE6sQLQf1gyBh8KWM2c4"
                // }]
            },
        };
    }

    // from mobile
    private handleDisconnect = (): void => {
        if (this.client) {
            this.session = null;
            this.publicKey = null;
            this.emit('disconnect');
        }
    };
}
