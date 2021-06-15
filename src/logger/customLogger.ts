import {AbstractCategoryLogger, Category, CategoryLogMessage, LogLevel, RuntimeSettings} from 'typescript-logging';
import * as fs from 'fs';

export default class CustomLogger extends AbstractCategoryLogger {

    constructor(category: Category, runtimeSettings: RuntimeSettings) {
        super(category, runtimeSettings);
    }

    protected doLog(msg: CategoryLogMessage) {
        let message = LogLevel[msg.level].toUpperCase() + ' ';
        if (msg.categories.length > 0) {
            message += '[' + msg.categories[0].name + '] ';
        }
        message += msg.date.toString() + '\n'
        message += msg.messageAsString + '\n';
        fs.promises.writeFile('../cp-mgmt-typescript-sdk-log.txt', message, {flag: 'a'});
    }
}