import {
    Account,
    AddressComputer,
    ErrNetworkProvider,
    Message,
    SmartContractTransactionsFactory,
    TransactionsFactoryConfig,
} from '@multiversx/sdk-core/out';
import { ProxyNetworkProvider } from '@multiversx/sdk-network-providers';
import { NativeAuthClient } from '@multiversx/sdk-native-auth-client';
import moment from 'moment';
import path from 'node:path';
import { xPortalApi } from './classes/xPortalApi';
import { apiAddress, proxyProviderAddress, walletsFolder } from './config';
import { boostContract, dailyTasksContract } from './utils/contracts';
import { log } from './utils/log';
import { wallets } from './wallets';
import { getEpochInfo } from './utils/epochInfo';
import { extractErrorMessage } from './utils/extractError';
import { BoostInfo } from './types/boostInfo.types';
import { DailyInfo } from './types/dailyInfo.types';
import { handleAxiosError } from './utils/errorHandler';

function scheduleProcessWallet(wallet: typeof wallets[0], delaySeconds: number) {
    let remainingSeconds = delaySeconds;

    const intervalId = setInterval(() => {
        if (remainingSeconds <= 0) {
            clearInterval(intervalId);
            processWallet(wallet);
            return;
        }

        const hours = Math.floor((remainingSeconds % 86400) / 3600);
        const minutes = Math.floor((remainingSeconds % 3600) / 60);
        const seconds = remainingSeconds % 60;

        const display = `⏳ Time until next execution: ${String(hours).padStart(2, '0')}h:${String(minutes).padStart(2, '0')}m:${String(seconds).padStart(2, '0')}s`;

        process.stdout.write('\r' + display);

        remainingSeconds--;
    }, 1000);
}

async function processWallet(walletJson: typeof wallets[0]) {
    const folder = path.join(__dirname, walletsFolder);
    const addressComputer = new AddressComputer();
    const nativeAuthClient = new NativeAuthClient({
        apiUrl: apiAddress,
        origin: 'multiversx://xportal',
        expirySeconds: 120,
    });
    const provider = new ProxyNetworkProvider(proxyProviderAddress, {
        clientName: 'xPortal bot',
    });

    const networkConfig = await provider.getNetworkConfig();
    const factoryConfig = new TransactionsFactoryConfig({
        chainID: networkConfig.ChainID,
    });
    const factory = new SmartContractTransactionsFactory({
        config: factoryConfig,
    });

    try {
        const walletPath = path.join(folder, walletJson.file);
        const wallet = Account.newFromKeystore(walletPath, walletJson.password);
        const address = wallet.address.toBech32();
        const shard = addressComputer.getShardOfAddress(wallet.address);
        log.info(`Script started for wallet ${address} on shard ${shard}`);

        const accountOnNetwork = await provider.getAccount(wallet.address);
        wallet.nonce = BigInt(accountOnNetwork.nonce);

        const nativeAuthInit = await nativeAuthClient.initialize();
        const signedMessage = await wallet.signMessage(new Message({
            data: Buffer.from(`${address}${nativeAuthInit}`),
        }));
        const signature = Buffer.from(signedMessage).toString('hex');
        const accessToken = nativeAuthClient.getToken(address, nativeAuthInit, signature);

        const api = new xPortalApi(accessToken);

        const responseDailyInfo = await api.get<DailyInfo>('/gamification-api-proxy/on-chain-claims/info');
        const claimInfo = responseDailyInfo.data;
        const responseBoostInfo = await api.get<BoostInfo>('/gamification-api-proxy/boost-claim/info');
        const boostInfo = responseBoostInfo.data;

        const epochInfo = await getEpochInfo(provider);

        const now = moment();

        const nextBoostMoment = moment.unix(boostInfo.nextClaimTimestamp);
        const boostDelay = Math.max(nextBoostMoment.diff(now), 0);

        const nextEpochMoment = moment(epochInfo.nextEpochTimestamp);
        const epochDelay = Math.max(nextEpochMoment.diff(now), 0);


        let delayBeforeNextCall = Math.min(
            epochDelay > 0 ? epochDelay : Infinity,
            boostDelay > 0 ? boostDelay : Infinity,
        ) + 10_000;

        if (!isFinite(delayBeforeNextCall) || delayBeforeNextCall <= 0) {
            delayBeforeNextCall = 60 * 1000;
        }

        if (claimInfo.currentEpoch > claimInfo.lastEpochClaimed) {
            log.info(`Daily claim available! Sending claim transaction...`);
            try {
                await sendClaimTransaction(wallet, shard, factory, provider);
                delayBeforeNextCall = 60 * 1000;
            } catch (err) {
                log.error(`Error during daily claim:`);
                log.error(err as Error);
            }
        } else {
            log.info(`Next daily claim available at ${nextEpochMoment.format('DD/MM/YYYY HH:mm:ss')} (in ${Math.floor(epochDelay / 1000)} seconds)`);
        }

        if (boostDelay <= 0) {
            log.info(`Boost claim available! Sending boost transaction...`);
            try {
                await sendBoostTransaction(wallet, shard, factory, provider);
                delayBeforeNextCall = 60 * 1000;
            } catch (err) {
                log.error(`Error during boost claim:`);
                log.error(err as Error);
            }
        } else {
            log.info(`Next boost claim available at ${nextBoostMoment.format('DD/MM/YYYY HH:mm:ss')} (in ${Math.round(boostDelay / 1000)} seconds)`);
        }

        // Convertir en secondes pour scheduleProcessWallet
        const delaySeconds = Math.floor(delayBeforeNextCall / 1000);

        log.info(`Scheduling next processWallet call in ${delaySeconds} seconds.`);

        scheduleProcessWallet(walletJson, delaySeconds);

    } catch (error: unknown) {
        log.error(`Unexpected error processing wallet ${walletJson.file}:`);

        if (error instanceof Error) {
            log.error(error.stack ?? error.message);
        } else {
            log.error(String(error));
        }

        const shouldRetry = handleAxiosError(error, { walletFile: walletJson.file, log });

        if (shouldRetry) {
            log.info(`Retrying to process wallet ${walletJson.file} in 60 seconds...`);
            setTimeout(() => processWallet(walletJson), 60 * 1000);
        } else {
            log.error(`No retry for wallet ${walletJson.file} due to error type.`);
        }
    }

}

async function sendClaimTransaction(
    wallet: Account,
    shard: number,
    factory: SmartContractTransactionsFactory,
    provider: ProxyNetworkProvider
) {
    log.info(`Sending daily claim transaction...`);
    const transaction = factory.createTransactionForExecute(wallet.address, {
        contract: dailyTasksContract(shard),
        function: 'claim',
        gasLimit: 4_000_000n,
    });
    transaction.nonce = wallet.getNonceThenIncrement();
    transaction.signature = await wallet.signTransaction(transaction);

    await provider.sendTransaction(transaction)
        .then((txHash) => {
            log.info(`Daily claim sent: ${txHash}`);
        })
        .catch((reason: unknown) => {
            if (reason instanceof ErrNetworkProvider) {
                log.error(`Daily claim error: ${reason.message}`);

                const detailedMsg = extractErrorMessage((reason as any).tx ?? reason);
                if (detailedMsg) {
                    log.error(`Detailed VM error: ${detailedMsg}`);
                }
            } else {
                log.error(`Daily claim error unknown:`, reason);
            }
        });
}

async function sendBoostTransaction(
    wallet: Account,
    shard: number,
    factory: SmartContractTransactionsFactory,
    provider: ProxyNetworkProvider
) {
    log.info(`Sending boost claim transaction...`);
    const transaction = factory.createTransactionForExecute(wallet.address, {
        contract: boostContract(shard),
        function: 'claim',
        gasLimit: 4_000_000n,
    });
    transaction.nonce = wallet.getNonceThenIncrement();
    transaction.signature = await wallet.signTransaction(transaction);

    await provider.sendTransaction(transaction)
        .then((txHash) => {
            log.info(`Boost claim sent: ${txHash}`);
        })
        .catch((reason: unknown) => {
            if (reason instanceof ErrNetworkProvider) {
                log.error(`Boost claim error: ${reason.message}`);

                // Cast en any pour accéder à tx même si ça n'existe pas dans le type officiel
                const detailedMsg = extractErrorMessage((reason as any).tx ?? reason);
                if (detailedMsg) {
                    log.error(`Detailed VM error: ${detailedMsg}`);
                }
            } else {
                log.error(`Boost claim error unknown:`, reason);
            }
        });
}

(async () => {
    for (const walletJson of wallets) {
        processWallet(walletJson);
    }
})();
