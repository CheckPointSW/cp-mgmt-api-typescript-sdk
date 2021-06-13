//Only errors from this type will be displayed in the client
import {log} from "../decorators/loggingDecorator";
import getLogger from "../logger/log";

export class ApiError extends Error {
    //The message to display in the client
    message: string
    //Error response code if applicable
    statusCode?: number
    //Error response code text if applicable
    statusText?: string;
    //original received error if applicable
    originalError?: Error

    constructor(error?: any, message?: string, statusCode?: number, statusText?: string) {
        if (error && 'response' in error && error.response &&
            'statusText' in error.response) {
            if (!message && 'data' in error.response) {
                message = error.response.data;
            }
            if (!statusCode && 'status' in error.response) {
                statusCode = error.response.status;
            }
            if (!statusText && 'statusText' in error.response) {
                statusText = error.response.statusText;
            }
        }
        if (!message) {
            message = "API Error";
        }
        super(message)
        this.message = message;
        this.statusCode = statusCode;
        this.statusText = statusText;
        this.originalError = error;

        this.logError();
    }

    private logError() {
        let errorMessage: string = 'API ERROR RESPONSE:\n';
        if (this.statusCode) {
            errorMessage += `STATUS: ${JSON.stringify(this.statusCode)}\n`;
        }
        if (this.statusText) {
            errorMessage += `STATUS TEXT: ${JSON.stringify(this.statusText)}\n`;
        }
        errorMessage += `DATA: ${JSON.stringify(this.message, null, 2)}\n`;
        if (this.originalError) {
            errorMessage += `ORIGINAL ERROR: ${JSON.stringify(this.originalError, (() => {
                let cache: any[] = [];
                return (key: any, value: any) => {
                    if (typeof value === 'object' && value !== null) {
                        if (cache.includes(value)) {
                            return '[CIRCULAR]';
                        }
                        cache.push(value);
                    }
                    return value;
                }
            })())}`;
        }
        logger.error(errorMessage);
        console.log(errorMessage);
    }
}

const logger = getLogger(ApiError.name);