import ApiClient from '../cpapi/apiClient';
import {AxiosResponse} from 'axios';

export default function addFewHostsAsynchronously(conf: { server: string, user: string, password: string, fingerprint?: string}) {
    let apiClient = new ApiClient({server: conf.server, fingerprint: conf.fingerprint});
    return apiClient.login({username: conf.user, password: conf.password})
        .then(async () => {
            let hostPromises: Promise<AxiosResponse>[] = [];
            for (let i of Array(30).keys()) {
                hostPromises[i] = apiClient.apiCall('add-host', {name: 'host' + i, 'ip-address': '1.2.3.' + i});
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

// addFewHostsAsynchronously({server: '172.23.78.75', user: '****', password: '****'});
