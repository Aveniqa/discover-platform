import { writeFileSync, renameSync } from 'fs';

/**
 * Atomic JSON write — writes to a .tmp file, then renames over the target.
 * If the process is killed mid-write, the original file remains intact.
 */
export function writeJsonSafe(filePath, data) {
  const tmp = filePath + '.tmp';
  writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n');
  renameSync(tmp, filePath);
}

/**
 * Atomic text write — same rename trick for non-JSON content.
 */
export function writeFileSafe(filePath, content) {
  const tmp = filePath + '.tmp';
  writeFileSync(tmp, content);
  renameSync(tmp, filePath);
}
