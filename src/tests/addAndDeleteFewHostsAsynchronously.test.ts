import addFewHostsAsynchronously from "../examples/addFewHostsAsynchronously";
import deleteFewHostsAsynchronously from "../examples/deleteFewHostsAsynchronously";

let conf = {server: '172.23.78.75', user: 'aa', password: 'aaaa', fingerprint: '73:2F:25:6C:A6:B5:D9:D2:2B:D0:03:9A:05:B3:7E:39:FF:2E:A6:52:29:D5:F3:E7:99:62:1B:E8:20:9E:F4:67'};

jest.setTimeout(120000);

test('addFewHostsAsynchronously', async () => {
    await addFewHostsAsynchronously(conf);
});
test('deleteFewHostsAsynchronously', async () => {
    await deleteFewHostsAsynchronously(conf);
});
