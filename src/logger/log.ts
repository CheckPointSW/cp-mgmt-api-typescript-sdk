/* eslint-disable no-console */
import {
    Category,
    CategoryConfiguration,
    CategoryLogFormat,
    CategoryServiceFactory,
    LoggerType,
    LogLevel, RuntimeSettings,
} from 'typescript-logging'
import {Guid} from 'guid-typescript'
import CustomLogger from './customLogger';

enum ItpLogLevel {
    Trace = LogLevel.Trace,
    Debug = LogLevel.Debug,
    Info = LogLevel.Info,
    Warn = LogLevel.Warn,
    Error = LogLevel.Error,
    Fatal = LogLevel.Fatal,
}

class log {
    private static readonly rootCategory = new Category(`API sdk`)
    private static readonly currentIterationId = Guid.create()
        .toString()
        .substr(24)

    private static readonly defaultConfig = new CategoryConfiguration(
        process.env.NODE_ENV === 'production' ? LogLevel.Info : LogLevel.Trace,
        LoggerType.Console,
        new CategoryLogFormat(undefined, false)
    )

    private static readonly customConfig = new CategoryConfiguration(
        LogLevel.Info, LoggerType.Custom, new CategoryLogFormat(),
        (category: Category, runtimeSettings: RuntimeSettings) => new CustomLogger(category, runtimeSettings)
    );

    private readonly category: Category

    static init() {
        //log.customConfig is using for our custom logger, if you want to change to the default logger (console) -
        // in the following two lines, replace log.customConfig with log.defaultConfig
        CategoryServiceFactory.setConfigurationCategory(log.defaultConfig, log.rootCategory, true)
        CategoryServiceFactory.setDefaultConfiguration(log.customConfig)

        const logMethod = console.log
        console.log = function() {
            // 1. Convert args to a normal array
            // eslint-disable-next-line prefer-rest-params
            const args = Array.prototype.slice.call(arguments)

            // 2. Prepend log prefix log string
            args.unshift(`${log.rootCategory.name}:console(${log.currentIterationId}):`)

            // 3. Pass along arguments to console.log
            logMethod.apply(console, args as any)
        }
    }

    constructor(component: string) {
        const componentName = `${log.rootCategory.name}:${component}(${log.currentIterationId})`
        this.category = new Category(componentName, log.rootCategory)
    }

    trace(message: string) {
        return this.category.trace(() => message)
    }

    debug(message: string) {
        return this.category.debug(() => message)
    }

    info(message: string) {
        return this.category.info(() => message)
    }

    warn(message: string) {
        return this.category.warn(() => message)
    }

    error(message: string, error?: Error) {
        return this.category.error(
            () => message,
            () => (!error ? null : error)
        )
    }

    fatal(message: string, error?: Error) {
        return this.category.fatal(
            () => message,
            () => (!error ? null : error)
        )
    }

    getLogLevel(): ItpLogLevel {
        return this.category.logLevel.valueOf()
    }
}
log.init()

export default function getLogger(componentName: string) {
    return new log(componentName)
}
