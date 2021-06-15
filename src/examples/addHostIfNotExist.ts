import getLogger from '../logger/log';
import ApiClient from '../cpapi/apiClient';

let logger = getLogger('addHostIfNotExist');

function addHostIfNotExist() {
    let apiClient = new ApiClient({server: '172.23.78.75'});
    let promise = apiClient.login({username: '****', password: '****'})
        .then(response => {
            return  apiClient.apiCall('show-host', {name: 'host1'})
                .catch(err => {
                    return apiClient.apiCall('add-host', {name: 'host1', 'ip-address': '1.2.3.4'})
                        .then(response => {
                            return apiClient.publish();
                        });
                });
        }).then(response => {
            return apiClient.logout();
        });
}

addHostIfNotExist();
