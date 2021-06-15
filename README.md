# cp-mgmt-api-typescript-sdk

Check Point API Typescript Development Kit simplifies the use of the Check Point Management APIs.
The kit contains the API library files, and sample files demonstrating the capabilities of the library.

## Installation

```
$ npm install @chkp/cp-mgmt-api-typescript-sdk
```

## Basic Usage

```jsx
import {ApiClient, getLogger} from '@chkp/cp-mgmt-api-typescript-sdk';

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
```

## Content

- `ApiClient` - The main class that contains the object which interacts with the Check Point Management API with the following methods:
    - `apiCall`
    - `login`
    - `logout`
    - `publish`
    - `discard`
- Examples:
    - `addAccessRule` - Simple usage for adding an Access Rule.
    - `addHostIfNotExist` - Adding a Host only if doesn't exist already.
    - `addFewHostsSynchronously` - Adding few Hosts Synchronously.
    - `addFewHostsAsynchronously` - Adding few Hosts Asynchronously.
