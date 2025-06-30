import path from "node:path";
import {UserSigner} from "@multiversx/sdk-wallet/out";
import {promises} from "fs";
import {proxyProviderAddress, walletsFolder} from "./config";
import {ProxyNetworkProvider} from "@multiversx/sdk-network-providers/out";
import {
    Account,
    Address,
    AddressComputer,
    SmartContractTransactionsFactory,
    TransactionsFactoryConfig
} from "@multiversx/sdk-core/out";
import {log} from "./utils/log";
import {ErrNetworkProvider} from "@multiversx/sdk-network-providers/out/errors";
import {claimContract} from "./utils/claimContract";
import {wallets} from "./wallets";
import {sleep} from "./utils/sleep";

(async () => {
    const provider = new ProxyNetworkProvider(proxyProviderAddress, {
        clientName: 'xPortal Daily Task bot',
    })
    const networkConfig = await provider.getNetworkConfig()
    const factoryConfig = new TransactionsFactoryConfig({
        chainID: networkConfig.ChainID,
    })
    const factory = new SmartContractTransactionsFactory({
        config: factoryConfig,
    })
    const folder = path.join(__dirname, walletsFolder)

    for (const walletJson of wallets) {
        const walletPath = path.join(folder, walletJson.file)
        const json = await promises.readFile(walletPath, {encoding: "utf8"})
        const walletSigner = UserSigner.fromWallet(JSON.parse(json), walletJson.password)
        const wallet = new Account(walletSigner.getAddress())
        const walletOnNetwork = await provider.getAccount(wallet.address)
        wallet.update(walletOnNetwork)

        const address = Address.fromBech32(wallet.address.bech32())
        const addressComputer = new AddressComputer()
        const shard = addressComputer.getShardOfAddress(address)
        log.info(`Claiming XP for ${wallet.address} (shard ${shard})`)

        const transaction = factory.createTransactionForExecute({
            sender: wallet.address,
            contract: claimContract(shard),
            function: "claim",
            gasLimit: 4_000_000n,
        })
        transaction.nonce = BigInt(wallet.getNonceThenIncrement().valueOf())
        transaction.signature = await walletSigner.sign(transaction.serializeForSigning())

        await provider
            .sendTransaction(transaction)
            .catch((reason: ErrNetworkProvider) => {
                log.error(reason.message)
            })
            .then((txHash) => {
                log.info(`Daily task sent: ${txHash}`)
            })

        await sleep(500)
    }
})()
