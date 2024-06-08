import {Address} from "@multiversx/sdk-network-providers/out/primitives";
import {dailyTasksContracts} from "../config";

export const claimContract = (shard: number) => {
    return new Address(dailyTasksContracts[shard])
}
