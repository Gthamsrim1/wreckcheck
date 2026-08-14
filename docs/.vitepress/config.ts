import { defineConfig } from 'vitepress';

export default defineConfig({
	lang: 'en-US',
	title: 'WreckCheck',
	description: 'Find what will wreck your release.',
	base: process.env.DOCS_BASE ?? '/wreckcheck/',
	cleanUrls: true,
	lastUpdated: true,
	head: [
		['meta', { name: 'theme-color', content: '#0b1020' }],
		[
			'meta',
			{
				name: 'keywords',
				content:
					'release readiness, security scanner, CI, Docker, dependency audit',
			},
		],
	],
	themeConfig: {
		nav: [
			{ text: 'Guide', link: '/getting-started' },
			{ text: 'Checks', link: '/checks' },
			{ text: 'API', link: '/api/' },
			{ text: 'GitHub', link: 'https://github.com/Gthamsrim1/wreckcheck' },
		],
		sidebar: {
			'/api/': [
				{
					text: 'API reference',
					items: [{ text: 'Overview', link: '/api/' }],
				},
			],
			'/': [
				{
					text: 'Start here',
					items: [
						{ text: 'Introduction', link: '/getting-started' },
						{ text: 'Installation', link: '/installation' },
						{ text: 'Usage', link: '/usage' },
					],
				},
				{
					text: 'Reference',
					items: [
						{ text: 'Checks', link: '/checks' },
						{ text: 'Configuration', link: '/configuration' },
						{ text: 'Architecture', link: '/architecture' },
						{ text: 'API reference', link: '/api/' },
					],
				},
			],
		},
		socialLinks: [
			{ icon: 'github', link: 'https://github.com/Gthamsrim1/wreckcheck' },
		],
		search: { provider: 'local' },
		footer: {
			message: 'Released under the BSD 3-Clause License.',
			copyright: 'Copyright © 2026 Gautham Sriram',
		},
		outline: { label: 'On this page', level: [2, 3] },
		docFooter: { prev: 'Previous', next: 'Next' },
	},
});
