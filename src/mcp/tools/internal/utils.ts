/**
 * Spawns a child process and captures its stdout/stderr.
 *
 * Buffers up to 10 MB per stream and truncates (killing the process) if exceeded,
 * preventing memory exhaustion from runaway commands.
 *
 * @param command - Executable to run (e.g. `'bun'`, `'git'`).
 * @param args - Argument list passed to the executable.
 * @param cwd - Working directory for the spawned process. Defaults to the current process cwd.
 * @returns Resolves with `{ stdout, stderr }` on exit code 0.
 * @throws When the process exits with a non-zero code or emits an `'error'` event.
 * The thrown `Error` has `stdout` and `stderr` attached as extra properties.
 *
 * @see {@link QRunTestsTool} — uses this to spawn `bun test`
 * @see {@link QLintCheckTool} — uses this to spawn `bun run lint`
 * @see {@link QTypecheckTool} — uses this to spawn `bunx tsc --noEmit`
 *
 * @internal
 */
export const spawnCommand = async (
	command: string,
	args: string[],
	cwd?: string
): Promise<{ stdout: string; stderr: string }> => {
	const { spawn } = await import('child_process');
	return new Promise((resolve, reject) => {
		const process = spawn(command, args, { cwd: cwd || undefined });
		let stdout = '';
		let stderr = '';
		const MAX_BUFFER = 10 * 1024 * 1024; // 10MB Limit

		process.stdout.on('data', (data) => {
			if (stdout.length < MAX_BUFFER) {
				const chunk = data.toString();
				stdout += chunk;
				if (stdout.length > MAX_BUFFER) {
					stdout =
						stdout.slice(0, MAX_BUFFER) +
						'\n... [TRUNCATED DUE TO SIZE]';
					process.kill(); // Kill process if rogue
				}
			}
		});
		process.stderr.on('data', (data) => {
			if (stderr.length < MAX_BUFFER) {
				stderr += data.toString();
			}
		});

		process.on('close', (code) => {
			if (code === 0) {
				resolve({ stdout, stderr });
			} else {
				const error = new Error(`Command failed with code ${code}`);
				Object.assign(error, { stdout, stderr });
				reject(error);
			}
		});

		process.on('error', (err) => {
			Object.assign(err, { stdout, stderr });
			reject(err);
		});
	});
};
