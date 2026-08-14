import DefaultTheme from 'vitepress/theme';

import ApiReference from './components/ApiReference.vue';

import './style.css';

export default {
	extends: DefaultTheme,
	enhanceApp({ app }) {
		app.component('ApiReference', ApiReference);
	},
};
