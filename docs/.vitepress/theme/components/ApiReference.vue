<script setup lang="ts">
import api from '../../data/api.json';

type TypeDocType = {
	type?: string;
	name?: string;
	typeArguments?: TypeDocType[];
	elementType?: TypeDocType;
	types?: TypeDocType[];
	value?: unknown;
	operator?: string;
	target?: number | { qualifiedName?: string };
	declaration?: Reflection;
	elements?: TypeDocType[];
	objectType?: TypeDocType;
	indexType?: TypeDocType;
};

type CommentPart = { kind?: string; text?: string };

type Reflection = {
	id: number;
	name: string;
	kind: number;
	variant?: string;
	target?: number;
	flags?: { isOptional?: boolean; isConst?: boolean };
	comment?: { summary?: CommentPart[] };
	sources?: { url?: string; fileName?: string; line?: number }[];
	type?: TypeDocType;
	defaultValue?: string;
	children?: Reflection[];
	signatures?: Reflection[];
	parameters?: Reflection[];
};

type ApiItem = {
	id: number;
	name: string;
	kind: string;
	summary: string;
	signature: string;
	source?: string;
	parameters: {
		name: string;
		type: string;
		optional: boolean;
		defaultValue?: string;
	}[];
	returns?: string;
	members: { name: string; type: string; optional: boolean; summary: string }[];
};

type ApiGroup = {
	name: string;
	packageName: string;
	description: string;
	items: ApiItem[];
};

const kindNames: Record<number, string> = {
	32: 'constant',
	64: 'function',
	128: 'class',
	256: 'interface',
	2097152: 'type',
};

const reflectionIndex = new Map<number, Reflection>();

function indexReflection(reflection: Reflection) {
	reflectionIndex.set(reflection.id, reflection);

	for (const child of reflection.children ?? []) indexReflection(child);
	for (const signature of reflection.signatures ?? [])
		indexReflection(signature);
	for (const parameter of reflection.parameters ?? [])
		indexReflection(parameter);
}

indexReflection(api as Reflection);

function commentText(reflection?: Reflection) {
	return (reflection?.comment?.summary ?? [])
		.map((part) => part.text ?? '')
		.join('')
		.trim();
}

function typeText(type?: TypeDocType): string {
	if (!type) return 'unknown';

	switch (type.type) {
		case 'intrinsic':
		case 'reference': {
			const name = type.name ?? 'unknown';
			const argumentsText = type.typeArguments?.length
				? `<${type.typeArguments.map(typeText).join(', ')}>`
				: '';
			return `${name}${argumentsText}`;
		}
		case 'array':
			return `${typeText(type.elementType)}[]`;
		case 'union':
			return (type.types ?? []).map(typeText).join(' | ');
		case 'intersection':
			return (type.types ?? []).map(typeText).join(' & ');
		case 'literal':
			return typeof type.value === 'string'
				? `'${type.value}'`
				: String(type.value);
		case 'typeOperator':
			return `${type.operator ?? ''} ${typeText(type.target as TypeDocType)}`.trim();
		case 'tuple':
			return `[${(type.elements ?? []).map(typeText).join(', ')}]`;
		case 'reflection':
			return type.declaration?.children?.length ? '{ … }' : 'object';
		case 'indexedAccess':
			return `${typeText(type.objectType)}[${typeText(type.indexType)}]`;
		default:
			return type.name ?? type.type ?? 'unknown';
	}
}

function resolveReflection(reflection: Reflection): Reflection {
	if (reflection.variant === 'reference' && reflection.target) {
		return reflectionIndex.get(reflection.target) ?? reflection;
	}

	return reflection;
}

function itemFromReflection(reflection: Reflection): ApiItem {
	const resolved = resolveReflection(reflection);
	const signature = resolved.signatures?.[0];
	const parameters = (signature?.parameters ?? []).map((parameter) => ({
		name: parameter.name,
		type: typeText(parameter.type),
		optional: parameter.flags?.isOptional ?? false,
		...(parameter.defaultValue ? { defaultValue: parameter.defaultValue } : {}),
	}));
	const members = (resolved.children ?? []).map((member) => {
		const memberSignature = member.signatures?.[0];
		return {
			name: member.name,
			type: memberSignature
				? `(${(memberSignature.parameters ?? [])
						.map(
							(parameter) =>
								`${parameter.name}${parameter.flags?.isOptional ? '?' : ''}: ${typeText(parameter.type)}`,
						)
						.join(', ')}) => ${typeText(memberSignature.type)}`
				: typeText(member.type),
			optional: member.flags?.isOptional ?? false,
			summary: commentText(memberSignature) || commentText(member),
		};
	});
	const kind = kindNames[resolved.kind] ?? 'export';
	const valueType = typeText(resolved.type);
	const declaration =
		kind === 'function' && signature
			? `function ${resolved.name}(${parameters
					.map(
						(parameter) =>
							`${parameter.name}${parameter.optional ? '?' : ''}: ${parameter.type}`,
					)
					.join(', ')}): ${typeText(signature.type)}`
			: kind === 'interface'
				? `interface ${resolved.name}`
				: kind === 'type'
					? `type ${resolved.name} = ${valueType}`
					: kind === 'constant'
						? `const ${resolved.name}: ${valueType}`
						: `${kind} ${resolved.name}`;

	return {
		id: resolved.id,
		name: resolved.name,
		kind,
		summary:
			commentText(signature) ||
			commentText(resolved) ||
			'No description provided.',
		signature: declaration,
		source: resolved.sources?.[0]?.url,
		parameters,
		...(signature ? { returns: typeText(signature.type) } : {}),
		members,
	};
}

const groupDefinitions = [
	{
		moduleName: 'core/src',
		name: 'Core',
		packageName: '@wreckcheck/core',
		description:
			'Project discovery, scanning, policy, scoring, and verification primitives.',
	},
	{
		moduleName: 'checks/src',
		name: 'Checks',
		packageName: '@wreckcheck/checks',
		description: 'The standard collection of release-readiness checks.',
	},
	{
		moduleName: 'reporter/src',
		name: 'Reporters',
		packageName: '@wreckcheck/reporter',
		description: 'Render scan results for terminals, CI, SARIF, and GitHub.',
	},
];

const groups: ApiGroup[] = groupDefinitions.map((definition) => {
	const module = (api as Reflection).children?.find(
		(child) => child.name === definition.moduleName,
	);
	const items = (module?.children ?? [])
		.map(itemFromReflection)
		.sort((left, right) => left.name.localeCompare(right.name));

	return { ...definition, items };
});

const _totalExports = groups.reduce(
	(total, group) => total + group.items.length,
	0,
);
</script>

<template>
	<div class="api-reference">
		<section class="api-reference__hero">
			<div>
				<p class="api-reference__eyebrow">Reference</p>
				<h1>Built from the source.</h1>
				<p class="api-reference__lede">
					Every signature, parameter, return type, comment, and source link on this
					page comes from the project’s TypeDoc reflection data—presented in a
					VitePress-native interface.
				</p>
			</div>
			<div class="api-reference__stats" aria-label="API reference summary">
				<strong>{{ _totalExports }}</strong>
				<span>documented exports</span>
				<small>Generated at build time</small>
			</div>
		</section>

		<nav class="api-reference__jump" aria-label="API packages">
			<a v-for="group in groups" :key="group.name" :href="`#${group.name.toLowerCase()}`">
				<span>{{ group.packageName }}</span>
				<b>{{ group.items.length }}</b>
			</a>
		</nav>

		<section
			v-for="group in groups"
			:id="group.name.toLowerCase()"
			:key="group.name"
			class="api-reference__group"
		>
			<header class="api-reference__group-header">
				<div>
					<p>{{ group.packageName }}</p>
					<h2>{{ group.name }}</h2>
				</div>
				<span>{{ group.description }}</span>
			</header>

			<div class="api-reference__items">
				<details v-for="(item, index) in group.items" :key="item.id" :open="index === 0">
					<summary>
						<span class="api-reference__kind">{{ item.kind }}</span>
						<span class="api-reference__name">{{ item.name }}</span>
						<span class="api-reference__summary">{{ item.summary }}</span>
						<span class="api-reference__chevron" aria-hidden="true">⌄</span>
					</summary>
					<div class="api-reference__detail">
						<div class="api-reference__signature"><code>{{ item.signature }}</code></div>
						<p>{{ item.summary }}</p>

						<div v-if="item.parameters.length" class="api-reference__definition">
							<h3>Parameters</h3>
							<dl>
								<div v-for="parameter in item.parameters" :key="parameter.name">
									<dt><code>{{ parameter.name }}{{ parameter.optional ? '?' : '' }}</code></dt>
									<dd><code>{{ parameter.type }}</code><span v-if="parameter.defaultValue">default: {{ parameter.defaultValue }}</span></dd>
								</div>
							</dl>
						</div>

						<div v-if="item.returns" class="api-reference__definition">
							<h3>Returns</h3>
							<code>{{ item.returns }}</code>
						</div>

						<div v-if="item.members.length" class="api-reference__definition">
							<h3>Members</h3>
							<dl>
								<div v-for="member in item.members" :key="member.name">
									<dt><code>{{ member.name }}{{ member.optional ? '?' : '' }}</code></dt>
									<dd><code>{{ member.type }}</code><span v-if="member.summary">{{ member.summary }}</span></dd>
								</div>
							</dl>
						</div>

						<a v-if="item.source" class="api-reference__source" :href="item.source" target="_blank" rel="noreferrer">View source <span aria-hidden="true">↗</span></a>
					</div>
				</details>
			</div>
		</section>
	</div>
</template>

<style scoped>
.api-reference { padding: 18px 0 70px; }
.api-reference__hero { display: grid; grid-template-columns: minmax(0, 1fr) 180px; gap: 40px; align-items: end; margin: 0 0 28px; padding: 34px; border: 1px solid color-mix(in srgb, var(--vp-c-brand-1) 24%, var(--vp-c-divider)); border-radius: 18px; background: radial-gradient(circle at 85% 8%, var(--vp-c-brand-soft), transparent 35%), var(--vp-c-bg-soft); }
.api-reference__eyebrow, .api-reference__group-header p { margin: 0 0 7px; color: var(--vp-c-brand-1); font-family: var(--vp-font-family-mono); font-size: 0.71rem; font-weight: 750; letter-spacing: 0.1em; text-transform: uppercase; }
.api-reference__hero h1 { margin: 0; border: 0; padding: 0; font-size: clamp(2.45rem, 7vw, 4.15rem); line-height: 0.98; letter-spacing: -0.06em; }
.api-reference__lede { max-width: 610px; margin: 17px 0 0; color: var(--vp-c-text-2); font-size: 1rem; line-height: 1.7; }
.api-reference__stats { display: flex; flex-direction: column; align-items: flex-start; padding: 19px 20px; border: 1px solid var(--vp-c-divider); border-radius: 13px; background: var(--vp-c-bg); box-shadow: 0 10px 25px rgba(24, 38, 70, 0.07); }
.api-reference__stats strong { color: var(--vp-c-brand-1); font-size: 2.25rem; line-height: 1; letter-spacing: -0.06em; }
.api-reference__stats span { margin-top: 6px; font-size: 0.77rem; font-weight: 650; }
.api-reference__stats small { margin-top: 15px; color: var(--vp-c-text-3); font-size: 0.68rem; }
.api-reference__jump { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 48px; }
.api-reference__jump a { display: flex; align-items: center; justify-content: space-between; padding: 13px 15px; border: 1px solid var(--vp-c-divider); border-radius: 10px; color: var(--vp-c-text-1); background: var(--vp-c-bg); font-family: var(--vp-font-family-mono); font-size: 0.75rem; transition: border-color 160ms ease, color 160ms ease, transform 160ms ease; }
.api-reference__jump a:hover { border-color: var(--vp-c-brand-1); color: var(--vp-c-brand-1); transform: translateY(-1px); }
.api-reference__jump b { display: grid; width: 22px; height: 22px; place-items: center; border-radius: 50%; background: var(--vp-c-brand-soft); color: var(--vp-c-brand-1); font-size: 0.68rem; }
.api-reference__group { scroll-margin-top: 90px; margin-top: 54px; }
.api-reference__group-header { display: grid; grid-template-columns: 185px 1fr; gap: 24px; align-items: end; margin-bottom: 15px; }
.api-reference__group-header h2 { margin: 0; border: 0; padding: 0; font-size: 1.7rem; letter-spacing: -0.04em; }
.api-reference__group-header > span { max-width: 440px; color: var(--vp-c-text-2); font-size: 0.89rem; line-height: 1.55; }
.api-reference__items { border-top: 1px solid var(--vp-c-divider); }
.api-reference__items details { border-bottom: 1px solid var(--vp-c-divider); background: transparent; transition: background 160ms ease; }
.api-reference__items details[open] { background: color-mix(in srgb, var(--vp-c-brand-soft) 31%, transparent); }
.api-reference__items summary { display: grid; grid-template-columns: 82px minmax(142px, 0.75fr) minmax(0, 2.2fr) 20px; gap: 14px; align-items: center; padding: 17px 14px; cursor: pointer; list-style: none; }
.api-reference__items summary::-webkit-details-marker { display: none; }
.api-reference__kind { color: var(--vp-c-brand-1); font-family: var(--vp-font-family-mono); font-size: 0.67rem; font-weight: 700; text-transform: uppercase; }
.api-reference__name { font-family: var(--vp-font-family-mono); font-size: 0.86rem; font-weight: 700; }
.api-reference__summary { overflow: hidden; color: var(--vp-c-text-2); font-size: 0.81rem; text-overflow: ellipsis; white-space: nowrap; }
.api-reference__chevron { color: var(--vp-c-text-3); font-size: 1.15rem; transition: transform 160ms ease; }
details[open] .api-reference__chevron { transform: rotate(180deg); }
.api-reference__detail { padding: 2px 18px 22px 110px; }
.api-reference__signature { overflow-x: auto; margin: 4px 0 15px; padding: 13px 15px; border: 1px solid color-mix(in srgb, var(--vp-c-brand-1) 22%, var(--vp-c-divider)); border-radius: 9px; background: var(--vp-code-block-bg); color: #d8e5ff; }
.api-reference__signature code { color: inherit; font-size: 0.78rem; white-space: pre; }
.api-reference__detail > p { margin: 0 0 19px; color: var(--vp-c-text-2); font-size: 0.87rem; line-height: 1.65; }
.api-reference__definition { margin-top: 17px; }
.api-reference__definition h3 { margin: 0 0 8px; color: var(--vp-c-text-2); font-size: 0.73rem; font-weight: 750; letter-spacing: 0.06em; text-transform: uppercase; }
.api-reference__definition > code { color: var(--vp-c-brand-1); font-size: 0.8rem; }
.api-reference__definition dl { margin: 0; border: 1px solid var(--vp-c-divider); border-radius: 9px; overflow: hidden; }
.api-reference__definition dl > div { display: grid; grid-template-columns: minmax(110px, 0.6fr) minmax(0, 2fr); gap: 14px; padding: 10px 12px; border-bottom: 1px solid var(--vp-c-divider); }
.api-reference__definition dl > div:last-child { border-bottom: 0; }
.api-reference__definition dt, .api-reference__definition dd { margin: 0; }
.api-reference__definition dt code { color: var(--vp-c-text-1); font-size: 0.76rem; font-weight: 700; }
.api-reference__definition dd { display: flex; flex-wrap: wrap; gap: 5px 10px; color: var(--vp-c-text-2); font-size: 0.76rem; }
.api-reference__definition dd code { color: var(--vp-c-brand-1); font-size: inherit; }
.api-reference__definition dd span { line-height: 1.5; }
.api-reference__source { display: inline-flex; gap: 5px; margin-top: 20px; color: var(--vp-c-brand-1); font-family: var(--vp-font-family-mono); font-size: 0.74rem; font-weight: 700; }
@media (max-width: 700px) { .api-reference__hero { grid-template-columns: 1fr; gap: 25px; padding: 25px; } .api-reference__stats { width: fit-content; } .api-reference__jump { grid-template-columns: 1fr; } .api-reference__group-header { grid-template-columns: 1fr; gap: 8px; } .api-reference__items summary { grid-template-columns: 68px minmax(0, 1fr) 18px; gap: 9px; } .api-reference__summary { display: none; } .api-reference__detail { padding: 2px 14px 20px; } .api-reference__definition dl > div { grid-template-columns: 1fr; gap: 4px; } }
</style>
