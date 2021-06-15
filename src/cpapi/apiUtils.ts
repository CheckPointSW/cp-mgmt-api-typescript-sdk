import log from '../decorators/loggingDecorator';

export default class ApiUtils {
    @log()
    static async sleep(ms: number) {
        return new Promise(resolve => setTimeout(resolve, 2000));
    }
}
