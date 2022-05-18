"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.augustSetStatus = exports.augustGetLockStatus = exports.augustGetLocks = exports.augustGetHouses = exports.augustStartSession = exports.AugustLockStatus = void 0;
const https_1 = require("https");
const util_1 = require("util");
var AugustLockStatus;
(function (AugustLockStatus) {
    AugustLockStatus[AugustLockStatus["CLOSED"] = 0] = "CLOSED";
    AugustLockStatus[AugustLockStatus["OPEN"] = 1] = "OPEN";
})(AugustLockStatus = exports.AugustLockStatus || (exports.AugustLockStatus = {}));
async function augustStartSession(options, log) {
    const { uuid, code, idType, password, identifier } = options;
    const session = await augustLogin(uuid, idType, identifier, password, log);
    log.debug(JSON.stringify(session));
    const { status } = await augustGetMe(session, log);
    // Session isn't valid yet, so we need to validate it by sending a code
    if (status !== 200) {
        if (code === undefined || code.length === 0) {
            await augustSendCode(session, log);
            log.info('Session is not valid yet, but no code was provided. Please provide a code.');
        }
        else {
            const resp = await augustValidateCode(code, session, log);
            if (resp.status !== 200) {
                await augustSendCode(session, log);
                log.error(`Invalid code: ${resp.status}, new code sent, please provide the new code.`);
            }
            else {
                session.token = resp.token;
            }
        }
    }
    return session;
}
exports.augustStartSession = augustStartSession;
function getRequestOptions(path, method) {
    return {
        hostname: 'api-production.august.com',
        port: 443,
        path: path,
        method: method,
        headers: {
            'x-august-api-key': '7cab4bbd-2693-4fc1-b99b-dec0fb20f9d4',
            'x-kease-api-key': '7cab4bbd-2693-4fc1-b99b-dec0fb20f9d4',
            'Content-Type': 'application/json',
            'Accept-Version': '0.0.1',
            'User-Agent': 'August/Luna-3.2.2',
        },
    };
}
function addToken(options, token) {
    const newOptions = {
        ...options,
    };
    if (newOptions['headers']) {
        newOptions['headers']['x-august-access-token'] = token;
    }
    return newOptions;
}
async function makeRequest(options, data, log) {
    return new Promise((resolve, reject) => {
        const req = (0, https_1.request)(options, res => {
            res.on('data', d => {
                log.debug(`statusCode: ${res.statusCode}`);
                const buff = d;
                log.debug(buff.toString('utf-8'));
                resolve({
                    status: res.statusCode,
                    token: res.headers['x-august-access-token'],
                    payload: JSON.parse(buff.toString()),
                });
            });
        });
        req.on('error', error => {
            log.error(`request error: ${error}`);
            reject(error);
        });
        req.write(data);
        req.end();
    });
}
async function augustLogin(uuid, idType, identifier, password, log) {
    const data = new util_1.TextEncoder().encode(JSON.stringify({
        identifier: `${idType}:${identifier}`,
        password: password,
        installId: uuid,
    }));
    const options = getRequestOptions('/session', 'POST');
    const res = await makeRequest(options, data, log);
    if (res.status !== 200 || res.payload['userId'] === undefined || res.payload['userId'].length === 0) {
        throw new Error(`Invalid user credentials: ${res.status}`);
    }
    else {
        return {
            idType: idType,
            identifier: identifier,
            token: res.token,
        };
    }
}
async function augustGetMe(session, log) {
    const options = addToken(getRequestOptions('/users/me', 'GET'), session.token);
    return makeRequest(options, new util_1.TextEncoder().encode(''), log);
}
async function augustSendCode(session, log) {
    const data = new util_1.TextEncoder().encode(JSON.stringify({
        value: session.identifier,
    }));
    const options = addToken(getRequestOptions(`/validation/${session.idType}`, 'POST'), session.token);
    return makeRequest(options, data, log);
}
async function augustValidateCode(code, session, log) {
    const payload = {
        code,
    };
    payload[session.idType] = session.identifier;
    const data = new util_1.TextEncoder().encode(JSON.stringify(payload));
    const options = addToken(getRequestOptions(`/validate/${session.idType}`, 'POST'), session.token);
    return makeRequest(options, data, log);
}
async function augustGetHouses(session, log) {
    const options = addToken(getRequestOptions('/users/houses/mine', 'GET'), session.token);
    const results = await makeRequest(options, new Uint8Array(), log);
    if (results.status === 200 && Array.isArray(results.payload)) {
        const homes = (results.payload).map(home => ({
            id: home['HouseID'],
            name: home['HouseName'],
        }));
        return homes;
    }
    else {
        return [];
    }
}
exports.augustGetHouses = augustGetHouses;
async function augustGetLocks(session, log) {
    const options = addToken(getRequestOptions('/users/locks/mine', 'GET'), session.token);
    const results = await makeRequest(options, new Uint8Array(), log);
    if (results.status === 200 && results.payload) {
        const locks = Object.keys(results.payload).map(id => {
            const lock = results.payload[id];
            return {
                id: id,
                name: lock['LockName'],
                macAddress: lock['macAddress'],
                houseId: lock['HouseID'],
                houseName: lock['HouseName'],
            };
        });
        return locks;
    }
    else {
        return [];
    }
}
exports.augustGetLocks = augustGetLocks;
async function augustGetLockStatus(session, lockId, log) {
    const options = addToken(getRequestOptions(`/remoteoperate/${lockId}/status`, 'PUT'), session.token);
    const results = await makeRequest(options, new Uint8Array(), log);
    const status = results.payload['status'];
    console.log(JSON.stringify(status));
    if (status === 'kAugLockState_Closed') {
        return AugustLockStatus.CLOSED;
    }
    else if (status === 'kAugLockState_Open') {
        return AugustLockStatus.OPEN;
    }
    else {
        log.info(JSON.stringify(results.payload));
        throw new Error(`Unknown lock status for lock ${lockId}`);
    }
}
exports.augustGetLockStatus = augustGetLockStatus;
async function augustSetStatus(session, lockId, status, log) {
    const url = status === AugustLockStatus.CLOSED ? `/remoteoperate/${lockId}/lock` : `/remoteoperate/${lockId}/unlock`;
    const options = addToken(getRequestOptions(url, 'PUT'), session.token);
    const results = await makeRequest(options, new Uint8Array(), log);
    const update = results.payload['status'] === 'kAugLockState_Closed' ? AugustLockStatus.CLOSED : AugustLockStatus.OPEN;
    return update;
}
exports.augustSetStatus = augustSetStatus;
//# sourceMappingURL=august.js.map