import {ILogObj, Logger} from "tslog";

const debug = true

export const log: Logger<ILogObj> = new Logger({
    minLevel: debug ? 0 : 3,
    prettyLogTemplate: "{{yyyy}}.{{mm}}.{{dd}} {{hh}}:{{MM}}:{{ss}}:{{ms}}\t{{logLevelName}}\t",
})
