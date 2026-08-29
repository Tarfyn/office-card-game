import type { CardType, Department } from "./types.js";
export interface DepartmentContentAudit {
    department: Department;
    totalCards: number;
    cardTypes: Record<CardType, number>;
    cheapEmployeeDefinitions: number;
    topTags: Array<{
        tag: string;
        cards: number;
    }>;
    bridgeCards: string[];
    starterEmployees: number;
    starterCheapEmployees: number;
}
export interface ContentGapSignal {
    department: Department;
    kind: "POOL_DEPTH" | "REACTIVE_DEPTH" | "EARLY_EMPLOYEE_VARIETY";
    detail: string;
}
export interface ContentGapAudit {
    departments: DepartmentContentAudit[];
    gaps: ContentGapSignal[];
}
export declare function analyzeContentGaps(): ContentGapAudit;
