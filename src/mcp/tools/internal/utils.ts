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

		process.stdout.on('data', (data) => {
			stdout += data.toString();
		});
		process.stderr.on('data', (data) => {
			stderr += data.toString();
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
