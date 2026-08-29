import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

/** Development persistence adapter. Domain services only depend on SnapshotPersistence. */
export function localJsonPersistence(storagePath, storageLabel = "FILE_JSON_LOCAL") {
  return {
    storageLabel,
    load() {
      try {
        if (!existsSync(storagePath)) return null;
        return JSON.parse(readFileSync(storagePath, "utf8"));
      } catch (error) {
        console.warn(`Could not load ${storageLabel} store ${storagePath}:`, error instanceof Error ? error.message : error);
        return null;
      }
    },
    save(snapshot) {
      mkdirSync(dirname(storagePath), { recursive:true });
      const temp = `${storagePath}.tmp`;
      writeFileSync(temp, JSON.stringify(snapshot, null, 2), "utf8");
      renameSync(temp, storagePath);
    }
  };
}
