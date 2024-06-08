import {ILogObj, Logger} from "tslog";
import {appendFileSync} from "fs";

const debug = true

export const log: Logger<ILogObj> = new Logger({
    minLevel: debug ? 0 : 3,
    prettyLogTemplate: "{{yyyy}}.{{mm}}.{{dd}} {{hh}}:{{MM}}:{{ss}}:{{ms}}\t{{logLevelName}}\t",
})
/*log.attachTransport((logObj) => {
    appendFileSync("./logs/logs.txt", JSON.stringify(logObj) + "\n");
})*/
