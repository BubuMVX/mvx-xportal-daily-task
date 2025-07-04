import { Logger, ILogObj } from "tslog";
import * as fs from "fs";
import * as path from "path";

const logFilePath = path.join(__dirname, "../../logs/errors.log");

export const log: Logger<ILogObj> = new Logger({
    prettyLogTemplate: "{{yyyy}}.{{mm}}.{{dd}} {{hh}}:{{MM}}:{{ss}}:{{ms}}\t{{logLevelName}}\t",
});

function writeLogToFile(message: string) {
    const dir = path.dirname(logFilePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.appendFileSync(logFilePath, message + "\n");
}

const originalError = log.error.bind(log);

log.error = (...args: unknown[]) => {
    const ret = originalError(...args);
    writeLogToFile("[ERROR] " + args.map(String).join(" "));
    return ret;
};
