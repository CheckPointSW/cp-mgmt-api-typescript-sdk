import getLogger from '../logger/log';

const logger = getLogger('loggingDecorator')

export default function log() {
    return function (target: Object, propertyKey: string, descriptor?: PropertyDescriptor) {
        // If the method we want to decorate is a regular method then the descriptor.value is the originalMethod.
        // But if it's an arrow function,
        // then it's actually a property so the variable originalMethod will be assign when 'set' is called.
        let originalMethod: Function = descriptor != null ? descriptor.value : null;

        let decoratorFunction = function (this: any, ...args: any[]) {
            function logRequest(args: any[], propertyKey: string) {
                let argsToLog = args;
                if ((propertyKey === 'apiCall' || propertyKey === 'apiCallFewTimesOnError') &&
                    args != null && args.length > 0) {
                    // log only the command name
                    argsToLog=[args[0]];
                }
                logger.info(`Calling function: ${propertyKey}
Function arguments: ${JSON.stringify(argsToLog)}`);
            }

            function logResponse(propertyKey: string, returnValue: any) {
                let finishingMessage: string = `Finishing function: ${propertyKey}`;
                if (propertyKey !== 'apiCall' && propertyKey !== 'apiCallFewTimesOnError') {
                    finishingMessage += `\nReturn value: ${returnValue}`
                }
                logger.info(finishingMessage);
            }

            logRequest(args, propertyKey);
            let returnValue = originalMethod.apply(this, args);
            logResponse(propertyKey, returnValue);
            return returnValue;
        };

        if (descriptor != null) {
            descriptor.value = decoratorFunction;
        } else {
            Object.defineProperty(target, propertyKey, {
                get: () => {
                    return decoratorFunction
                },
                set: (method: Function) => {
                    originalMethod = method
                },
                enumerable: true,
                configurable: true
            });
        }
    }
}
