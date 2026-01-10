<template>
	<div class="custom-footer-links">
		<a
			href="https://github.com/CartagoGit"
			target="_blank"
			rel="noopener"
			title="GitHub"
			aria-label="GitHub">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="24"
				height="24"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round">
				<path
					d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
				<path d="M9 18c-4.51 2-5-2-7-2" />
			</svg>
		</a>
		<a
			href="https://www.linkedin.com/in/mario-cabrero-volarich/"
			target="_blank"
			rel="noopener"
			title="LinkedIn"
			aria-label="LinkedIn">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="24"
				height="24"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round">
				<path
					d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
				<rect
					width="4"
					height="12"
					x="2"
					y="9" />
				<circle
					cx="4"
					cy="4"
					r="2" />
			</svg>
		</a>
		<a
			href="https://hub.docker.com/u/cartagodocker"
			target="_blank"
			rel="noopener"
			title="Docker Hub"
			aria-label="Docker Hub">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="24"
				height="24"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round">
				<path d="M20 9V7a2 2 0 0 0-2-2h-6" />
				<path d="M4 3h2a2 2 0 0 1 2 2v2" />
				<path d="M20 21v-2a2 2 0 0 0-2-2h-2" />
				<path d="M4 15h2a2 2 0 0 1 2 2v2" />
				<path d="M9 3h1" />
				<path d="M9 21h2" />
				<path d="M3 9h1" />
				<path d="M21 9h1" />
				<path d="M3 14v1" />
				<path d="M3 19v2" />
				<path d="M21 14v1" />
				<path d="M14 3v1" />
				<path d="M14 21v1" />
			</svg>
		</a>
		<a
			href="https://www.npmjs.com/~cartago-git"
			target="_blank"
			rel="noopener"
			title="npm"
			aria-label="npm">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="24"
				height="24"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round">
				<path d="M4 17v-5h4v5" />
				<path d="M12 17v-9h4v9" />
				<path d="M20 17v-9h-4" />
				<path d="M4 7h16v10H4z" />
			</svg>
		</a>
	</div>
</template>

<style scoped>
.custom-footer-links {
	display: flex;
	gap: 12px;
	justify-content: center;
	align-items: center;
	padding: 0;
	margin: 0;
}

.custom-footer-links a {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	text-decoration: none;
	color: var(--vp-c-text-2);
	transition: color 0.25s;
	padding: 4px;
	border-radius: 4px;
}

.custom-footer-links a:hover {
	color: var(--vp-c-brand-1);
	background-color: var(--vp-c-bg-soft);
}

.custom-footer-links svg {
	width: 20px;
	height: 20px;
	flex-shrink: 0;
}
</style>
