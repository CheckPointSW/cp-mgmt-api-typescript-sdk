import {ApiClient} from "../cpapi/apiClient";
import {AxiosResponse} from "axios";

function addFewHostsAsynchronously() {
    let apiClient = new ApiClient({server: '172.23.78.75'});
    let promise = apiClient.login({username: '****', password: '****'})
        .then(async () => {
            let hostPromises: Promise<AxiosResponse>[] = [];
            for (let i of Array(30).keys()) {
                hostPromises[i] = addHost(apiClient, 'host' + i, '1.2.3.' + i);
            }
            for (let hostPromise of hostPromises) {
                await hostPromise;
            }
        }).then(() => {
            return apiClient.publish();
        }).then(() => {
            return apiClient.logout();
        });
}

function addHost(apiClient: ApiClient, name: string, ip: string) {
    return apiClient.apiCall('add-host', {name: name, 'ip-address': ip});
}

addFewHostsAsynchronously();