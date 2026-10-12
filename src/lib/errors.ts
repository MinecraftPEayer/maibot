export class MaimaiDXNetMaintenanceError extends Error {
    constructor() {
        super('The maimai DX server is under maintenance.');
        this.name = 'MaimaiDXNetMaintenanceError';
    }
}

export class PlayerDataFetchError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'PlayerDataFetchError';
    }
}