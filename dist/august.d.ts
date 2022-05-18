import { Logger } from 'homebridge';
export declare type AugustHome = {
    id: string;
    name: string;
};
export declare type AugustLock = {
    id: string;
    name: string;
    macAddress: string;
    houseId: string;
    houseName: string;
};
export declare enum AugustLockStatus {
    CLOSED = 0,
    OPEN = 1
}
export declare type AugustSession = {
    idType: string;
    identifier: string;
    token: string;
};
export declare type AugustSessionOptions = {
    uuid: string;
    idType: string;
    identifier: string;
    password: string;
    code: string;
};
export declare function augustStartSession(options: AugustSessionOptions, log: Logger): Promise<AugustSession>;
export declare function augustGetHouses(session: AugustSession, log: Logger): Promise<AugustHome[]>;
export declare function augustGetLocks(session: AugustSession, log: Logger): Promise<AugustLock[]>;
export declare function augustGetLockStatus(session: AugustSession, lockId: string, log: Logger): Promise<AugustLockStatus>;
export declare function augustSetStatus(session: AugustSession, lockId: string, status: AugustLockStatus, log: Logger): Promise<AugustLockStatus>;
//# sourceMappingURL=august.d.ts.map