import type { FactLedger } from "./types.js";
export declare function buildFactLedger(masterResume: string): FactLedger;
export declare function validateFacts(masterResume: string, tailoredResume: string, ledger: FactLedger): {
    ok: boolean;
    violations: string[];
};
//# sourceMappingURL=facts.d.ts.map