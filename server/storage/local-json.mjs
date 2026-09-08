import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

/** Development persistence adapter. Domain services only depend on SnapshotPersistence. */
export function localJsonPersistence(storagePath, storageLabel = "FILE_JSON_LOCAL", options = {}) {
  let loadState = { status: "MISSING", reason: null };
  const validate = typeof options.validate === "function" ? options.validate : null;
  return {
    storageLabel,
    getLoadState() { return { ...loadState }; },
    load() {
      if (!existsSync(storagePath)) { loadState = { status: "MISSING", reason: null }; return null; }
      let raw;
      try {
        raw = readFileSync(storagePath, "utf8");
      } catch (error) {
        const reason = error instanceof Error && error.code ? error.code : "READ_FAILED";
        loadState = { status: "IO_ERROR", reason };
        console.warn(`Could not load ${storageLabel} snapshot:`, reason);
        return null;
      }
      try {
        const snapshot = JSON.parse(raw);
        if (validate && !validate(snapshot)) throw new Error("SNAPSHOT_STRUCTURE_INVALID");
        loadState = { status: "OK", reason: null };
        return snapshot;
      } catch (error) {
        const reason = error instanceof SyntaxError ? "JSON_INVALID" : error instanceof Error ? error.message : "SNAPSHOT_INVALID";
        loadState = { status: "CORRUPT", reason };
        console.warn(`Could not load ${storageLabel} snapshot:`, reason);
        return null;
      }
    },
    save(snapshot) {
      if (loadState.status === "CORRUPT" || loadState.status === "IO_ERROR") {
        const error = new Error(`${storageLabel}_UNAVAILABLE`);
        error.code = `${storageLabel}_UNAVAILABLE`;
        throw error;
      }
      mkdirSync(dirname(storagePath), { recursive:true });
      const temp = `${storagePath}.tmp`;
      writeFileSync(temp, JSON.stringify(snapshot, null, 2), "utf8");
      renameSync(temp, storagePath);
      loadState = { status: "OK", reason: null };
    }
  };
}
