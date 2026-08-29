export class RulesError extends Error {
    constructor(message) {
        super(message);
        this.name = "RulesError";
    }
}
