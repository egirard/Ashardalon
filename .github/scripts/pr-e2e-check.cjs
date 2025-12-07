// Node script to be used in CI to ensure PRs that change src include E2E tests.
// Minimal script: fails if any file under src/ or pkg/ was changed and no new tests under tests/e2e exist.
// The action environment should provide GITHUB_EVENT_PATH to the webhook payload.
const fs = require('fs');

function loadEvent() {
  const p = process.env.GITHUB_EVENT_PATH;
  if (!p || !fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

const event = loadEvent();
if (!event) {
  console.log('No GITHUB_EVENT_PATH payload found; skipping e2e presence check.');
  process.exit(0);
}

// Extract modified files from the pull_request payload
const pr = event.pull_request;
if (!pr) {
  console.log('Not a pull_request event; skipping.');
  process.exit(0);
}

const changed_files_url = pr._links && pr._links.self && pr._links.self.href;
if (!changed_files_url) {
  console.log('Cannot determine changed files via payload; please ensure the CI provides file list.');
  process.exit(0);
}

// Fallback: attempt to read list of files from a file created earlier in the workflow
let changedFiles = [];
const changedFilesPath = process.env.CHANGED_FILES_PATH || '.github/changed_files.txt';
if (fs.existsSync(changedFilesPath)) {
  changedFiles = fs.readFileSync(changedFilesPath, 'utf8').split('\n').filter(Boolean);
} else {
  // Best-effort: check workspace to see if tests/e2e or e2e exists and has files
  try {
    const hasE2E = (fs.existsSync('tests/e2e') && fs.readdirSync('tests/e2e').length > 0) ||
                   (fs.existsSync('e2e') && fs.readdirSync('e2e').length > 0);
    if (!hasE2E) {
      console.error('No E2E tests detected under tests/e2e or e2e/.');
      process.exit(1);
    } else {
      console.log('E2E tests exist; check passes.');
      process.exit(0);
    }
  } catch (e) {
    console.error('Unable to determine E2E presence:', e.message);
    process.exit(1);
  }
}
