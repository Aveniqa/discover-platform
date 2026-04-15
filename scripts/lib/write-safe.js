const fs = require('fs');

/**
 * Atomic JSON write — writes to a .tmp file, then renames over the target.
 * If the process is killed mid-write, the original file remains intact.
 */
function writeJsonSafe(filePath, data) {
  const tmp = filePath + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n');
  fs.renameSync(tmp, filePath);
}

/**
 * Atomic text write — same rename trick for non-JSON content.
 */
function writeFileSafe(filePath, content) {
  const tmp = filePath + '.tmp';
  fs.writeFileSync(tmp, content);
  fs.renameSync(tmp, filePath);
}

module.exports = { writeJsonSafe, writeFileSafe };
