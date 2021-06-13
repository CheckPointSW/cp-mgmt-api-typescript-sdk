import {ApiClient} from "../cpapi/apiClient";

function addFewHostsSynchronously() {
    let apiClient = new ApiClient({server: '172.23.78.75'});
    let promise = apiClient.login({username: '****', password: '****'})
        .then(async () => {
            for (let i of Array(30).keys()) {
                await addHost(apiClient, 'host' + i, '1.2.3.' + i);
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

addFewHostsSynchronously();