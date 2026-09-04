import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = (name: string) => readFileSync(fileURLToPath(new URL(`../../${name}`, import.meta.url)), "utf8");
const deploy = root("ops/deploy.sh");
const docs = root("ops/DEPLOYMENT_HARDENING.md");
const packageJson = JSON.parse(root("package.json"));

assert.equal(packageJson.scripts["ops:security-audit"], "npm audit");
assert.match(deploy, /npm ci --no-audit --no-fund --foreground-scripts/);
assert.match(deploy, /NPM_CI_TIMEOUT_SECONDS="\$\{NPM_CI_TIMEOUT_SECONDS:-600\}"/);
assert.match(deploy, /flock -n 9/);
assert.match(deploy, /check_endpoint \/api\/ready/);
assert.match(deploy, /check_endpoint \/api\/health/);
assert.match(deploy, /ROLLBACK_ATTEMPTED/);
assert.match(deploy, /git show-ref --verify/);
assert.match(deploy, /CHECK_ONLY.*-eq 0.*RELEASE_DIR.*PREVIOUS/);
assert.match(deploy, /refusing to reuse existing target release directory/);
assert.match(deploy, /refusing to overwrite existing immutable release/);
assert.match(docs, /npm advisory service is intentionally not on the\s+deployment-critical path/);
assert.match(docs, /deploy\.sh --check <tag>/);

console.log("Deployment hardening markers passed.");
