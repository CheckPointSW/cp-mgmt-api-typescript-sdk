import getLogger from '../logger/log';
import ApiClient from '../cpapi/apiClient';

let logger = getLogger('addAccessRule');

function addAccessRule() {
    let apiClient = new ApiClient({server: '172.23.78.75'});
    let promise = apiClient.login({username: '****', password: '****'})
        .then(response => {
            logger.info('Hey! we managed to login :) Now trying to add the access-rule.');
            return apiClient.apiCall('add-access-rule', {name: 'rule1', position: 'top', layer: 'Network'});
        }).then(response => {
            return apiClient.publish();
        }).then(response => {
            return apiClient.logout();
        });
}

addAccessRule();