import axios, {AxiosProxyConfig, AxiosRequestConfig, AxiosResponse} from "axios";
import {Agent} from "https";
import getLogger from "../logger/log";
import {Md5} from "ts-md5";
import {ApiError} from "../errors/apiError";
import {log} from "../decorators/loggingDecorator";
import {ApiUtils} from "./apiUtils";
import * as tls from "tls";
import {ConnectionOptions} from "tls";
import * as readline from "readline";
import * as fs from "fs";


const SID_HEADER = 'X-chkp-sid'
const SID = 'sid'
const TASK_ID = 'task-id';
const SHOW_TASK = 'show-task';
const SENSITIVE_REQUEST_COMMANDS = ['login', 'add-administrator', 'set-administrator', 'add-opsec-application', 'set-opsec-application',
    'add-vpn-community-meshed', 'set-vpn-community-meshed', 'add-vpn-community-star', 'set-vpn-community-star', 'add-simple-gateway',
    'set-simple-gateway', 'add-data-center-server', 'set-data-center-server', 'delete-api-key', 'add-server-certificate',
    'set-server-certificate', 'add-user', 'set-user', 'add-mds', 'set-mds', 'add-checkpoint-host', 'set-checkpoint-host']
const FINGERPRINTS_FILE = '../fingerprints.json';


export interface ApiClientArgs
{
    port?: number;
    fingerprint?: string;
    sid?: string;
    server?: string;
    proxy?: AxiosProxyConfig;
    apiVersion?: string;
    unsafe?: boolean;
    unsafeAutoAccept?: boolean;
    context?: string;
}

export interface LoginArgs
{
    username?: string,
    password?: string,
    apiKey?: string,
    continueLastSession?: boolean,
    domain?: string,
    readOnly?: boolean
}


export class ApiClient {
    private _port: number;
    private _fingerprint?: string;
    private _sid?: string;
    private _server: string;
    private _proxy?: AxiosProxyConfig;
    private _apiVersion?: string;
    private _unsafe: boolean;
    private _unsafeAutoAccept: boolean;
    private _approvedFingerprint: boolean;
    private _context: string;
    private _agent: Agent;

    constructor({
                    port = 443,
                    fingerprint,
                    sid,
                    server = '127.0.0.1',
                    proxy,
                    apiVersion,
                    unsafe = false,
                    unsafeAutoAccept = false,
                    context = 'web_api'
                }: ApiClientArgs){
        this._port = port;
        this._fingerprint = fingerprint;
        this._sid = sid;
        this._server = server;
        this._proxy = proxy;
        this._apiVersion = apiVersion;
        this._unsafe = unsafe;
        this._unsafeAutoAccept = unsafeAutoAccept
        this._approvedFingerprint = false;
        this._context = context;
        this._agent = new Agent({
            rejectUnauthorized: false,
            keepAlive: true
        })
    }

    login(
        {
              username,
              password,
              apiKey,
              continueLastSession = false,
              domain,
              readOnly = false
        }: LoginArgs)
    {
        let credentials: {[key: string]: Object} = {};

        if (username) {
            credentials['user'] = username;
        }
        if (password) {
            credentials['password'] = password;
        }
        if (apiKey) {
            credentials['api-key'] = apiKey;
        }

        if (this._context === 'web_api') {
            credentials['continue-last-session'] = continueLastSession;
            credentials['read-only'] = readOnly;
        }

        if (domain != null) {
            credentials['domain'] = domain;
        }

        return this.apiCall('login', credentials);
    }

    @log()
    logout() {
        return this.apiCall("logout")
            .then(response => {
                this.agent.destroy();
                return response;
            });
    }

    @log()
    publish() {
        return this.apiCall("publish");
    }

    @log()
    discard() {
        return this.apiCall("discard");
    }

    @log()
    async apiCall(command: string,
            payload: { [p: string]: Object } = {},
            sid?: string,
            waitForTask: boolean = true) {
        function logRequest(config: AxiosRequestConfig, command: string) {

            function isSensitiveRequest(command: string) {
                return SENSITIVE_REQUEST_COMMANDS.includes(command);
            }

            let headersForrLog = JSON.parse(JSON.stringify(config.headers));
            if (SID_HEADER in headersForrLog) {
                let hashedSid = Md5.hashStr(headersForrLog[SID_HEADER]);
                headersForrLog[SID_HEADER] = hashedSid;
            }

            let payloadForLog = config.data;
            if (isSensitiveRequest(command)) {
                payloadForLog = '****';
            }

            logger.info(`API REQUEST:
COMMAND: ${command}
HEADERS: ${JSON.stringify(headersForrLog, null, 2)}
PAYLOAD: ${JSON.stringify(payloadForLog, null, 2)}`);
        }

        if (!await this.isFingerprintOK()) {
            throw new ApiError('Fingerprint is not OK.');
        }

        // Set headers
        let headers: any = {
            "User-Agent": "typescript-api-wrapper",// If we run node.js need this header, and if we run through browser we don't
            "Accept": "*/*",
            "Content-Type": "application/json",
            "Content-Length": Object.keys(payload).length// If we run node.js need this header, and if we run through browser we don't
        };
        if (sid != null) {
            this.sid = sid;
        }
        if (this.sid != null) {
            headers[SID_HEADER] = this.sid;
        }

        let url: string = `https://${this._server}:${this._port}/${this._context}/${(this._apiVersion ? `v${this._apiVersion}/` : "")}${command}`;

        const config: AxiosRequestConfig = {
            method: 'post',
            url: url,
            headers: headers,
            data: payload,
            httpsAgent: this.agent
            // httpsAgent: new Agent({ // If there will be parallel problems, we can create new Agent (without keepAlive) for each API request.
            //     rejectUnauthorized: false
            // })
        };
        if (this.proxy != null) {
            config.proxy = this.proxy;
        }

        logRequest(config, command);

        return axios(config)
            .then(async (response) => {
                // handle success

                function logResponse(data: any, command: string) {

                    function isSensitiveReply(command: string) {
                        return command === 'add-api-key';
                    }

                    if (!isSensitiveReply(command)) {
                        let dataForLog = data;
                        if (containsSid(command, data)) {
                            dataForLog = JSON.parse(JSON.stringify(data));
                            let hashedSid = Md5.hashStr(dataForLog[SID]);
                            dataForLog[SID] = hashedSid;
                        }
                        const responseMessage = `API RESPONSE:
COMMAND: ${command}
DATA: ${JSON.stringify(dataForLog, null, 2)}`;
                        logger.info(responseMessage);
                        console.log(responseMessage);
                    }
                }

                function containsSid(command: string, data: any) {
                    return (command === 'login' || command === 'login-to-domain') && SID in data
                }

                logResponse(response.data, command)

                if (containsSid(command, response.data)) {
                    this.sid = response.data.sid;
                }

                let responseToUser: AxiosResponse<any> = response;
                if (waitForTask && command != SHOW_TASK && command != 'show-tasks') {
                    if (TASK_ID in response.data) {
                        responseToUser = await this.waitForTaskFun(response.data[TASK_ID]);
                    } else if ('tasks' in response.data) {
                        responseToUser = await this.waitForTasksFun(response.data['tasks']);
                    }
                }

                return responseToUser;
            })
            .catch(error => {
                throw new ApiError(error);
            })
    }

    @log()
    async isFingerprintOK() {
        if (this.unsafe || this.approvedFingerprint) {
            return true;
        }

        const serverFingerprint = await this.getServerFingerprint();
        if (serverFingerprint === '') {
            throw new ApiError('Fingerprint returned from the server is empty.');
        }
        if (this.fingerprint === serverFingerprint) {
            logger.info('Server Fingerprint equals to field fingerprint');
            this.approvedFingerprint = true;
            return true;
        }

        const localFingerprint = this.readFingerprintFromFile();
        if (serverFingerprint === localFingerprint) {
            logger.info('Server Fingerprint equals to local fingerprint');
            this.fingerprint = serverFingerprint;
            this.approvedFingerprint = true;
            return true;
        }

        if (!this.unsafeAutoAccept) {
            if (localFingerprint === '') {
                console.log('You currently do not have a record of this server\'s fingerprint.');
            } else {
                console.log('The server\'s fingerprint is different from your local record of this server\'s fingerprint.\n' +
                    'You maybe a victim to a Man-in-the-Middle attack, please beware.');
            }
            console.log(`Server Fingerprint (SHA-256): ${serverFingerprint}`)
            if (!await this.askYesNoQuestion('Do you accept this fingerprint?')) {
                return false;
            }
        }
        this.saveFingerprintToFile(serverFingerprint);
        this.fingerprint = serverFingerprint;
        this.approvedFingerprint = true;
        return true;
    }

    @log()
    private askYesNoQuestion(question: string) {
        let rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        return new Promise<boolean>(resolve => {
            rl.question(question + ' [y/n]\n', (answer) => {
                let lowerCaseAnswer = answer.toLowerCase();
                const userAnswer: boolean = lowerCaseAnswer === 'y' || lowerCaseAnswer === 'yes'
                logger.info(`User answer for whether he accepts the fingerprint is: ${userAnswer}`)
                resolve(userAnswer);
            });
        }).then(respone => {
            rl.close();
            return respone;
        })
    }

    @log()
    private saveFingerprintToFile(serverFingerprint: string) {
        let fingerprints = ApiClient.getAllFingerprints();
        fingerprints[this.server] = serverFingerprint;
        fs.promises.writeFile(FINGERPRINTS_FILE, JSON.stringify(fingerprints, null, 2), {flag: 'w'});
    }

    @log()
    private readFingerprintFromFile() {
        let fingerprints = ApiClient.getAllFingerprints();
        if (this.server in fingerprints) {
            return fingerprints[this.server];
        }
        return '';
    }

    private static isFingerprintsFileExist() {
        return fs.existsSync(FINGERPRINTS_FILE);
    }

    private static getAllFingerprints() {
        let fingerprints: { [p: string]: string } = {};
        if (ApiClient.isFingerprintsFileExist()) {
            try {
                fingerprints = <{ [p: string]: string }> require(FINGERPRINTS_FILE);
            } catch (e) {
                logger.error('The fingerprint file is not in Json format.');
            }
        }
        return fingerprints;
    }

    @log()
    private getServerFingerprint() {
        let fingerprint: string;
        let options: ConnectionOptions = {
            host: this.server,
            port: this.port,
            rejectUnauthorized: false
        }
        return new Promise<string>((resolve) => {
            let client = tls.connect(options, () => {
                fingerprint = client.getPeerCertificate(false).fingerprint256;
                logger.info(`Server Fingerprint (SHA-256): ${fingerprint}`);
                resolve(fingerprint);
                client.end(() => {
                    logger.info("Client closed successfully after getting the server fingerprint.");
                });
            });
        })
    }

    @log()
    async waitForTasksFun(tasks: any[]) {
        let taskIds: string[] = [];
        tasks.forEach(task => {
            if (TASK_ID in task) {
                taskIds.push(task[TASK_ID])
                this.waitForTaskFun(TASK_ID);
            }
        })
        return await this.apiCall(SHOW_TASK, {'task-id': taskIds, 'details-level': 'full'})
    }

    @log()
    async waitForTaskFun(taskId: string) {
        let taskComplete = false;
        let taskResult: AxiosResponse<any>;

        do {
            taskResult = await this.apiCallFewTimesOnError(
                SHOW_TASK, {'task-id': taskId, 'details-level': 'full'}, 5)
            let commpletedTasks = taskResult.data['tasks'].filter((task: any) => task['status'] != 'in progress').length;
            let totalTasks = taskResult.data['tasks'].length;
            if (commpletedTasks == totalTasks) {
                taskComplete = true;
            } else {
                await ApiUtils.sleep(2000);
            }
        }
        while (!taskComplete);
        return taskResult;
    }

    @log()
    async apiCallFewTimesOnError(command: string, payload: { [p: string]: Object }, attempts: number): Promise<AxiosResponse> {
        return this.apiCall(command, payload)
            .catch(error => {
                if (attempts <= 1) {
                    throw new ApiError(error);
                }
                return this.apiCallFewTimesOnError(command, payload, attempts - 1);
            })
    }


    get port(): number {
        return this._port;
    }

    set port(value: number) {
        this._port = value;
    }

    get fingerprint(): string | undefined {
        return this._fingerprint;
    }

    set fingerprint(value: string | undefined) {
        this._fingerprint = value;
    }

    get sid(): string | undefined {
        return this._sid;
    }

    set sid(value: string | undefined) {
        this._sid = value;
    }

    get server(): string {
        return this._server;
    }

    set server(value: string) {
        if (this.server != value) {
            this.approvedFingerprint = false;
        }
        this._server = value;
    }

    get proxy(): AxiosProxyConfig | undefined {
        return this._proxy;
    }

    set proxy(value: AxiosProxyConfig | undefined) {
        this._proxy = value;
    }

    get apiVersion(): string | undefined {
        return this._apiVersion;
    }

    set apiVersion(value: string | undefined) {
        this._apiVersion = value;
    }

    get unsafe(): boolean {
        return this._unsafe;
    }

    set unsafe(value: boolean) {
        this._unsafe = value;
    }

    get unsafeAutoAccept(): boolean {
        return this._unsafeAutoAccept;
    }

    set unsafeAutoAccept(value: boolean) {
        this._unsafeAutoAccept = value;
    }

    get approvedFingerprint(): boolean {
        return this._approvedFingerprint;
    }

    set approvedFingerprint(value: boolean) {
        this._approvedFingerprint = value;
    }

    get context(): string {
        return this._context;
    }

    set context(value: string) {
        this._context = value;
    }


    get agent(): Agent {
        return this._agent;
    }

    set agent(value: Agent) {
        this._agent = value;
    }
}

const logger = getLogger(ApiClient.name)