/**
 * Copyright (c) 2026 Gautham Sriram All rights reserved.
 * Use of this source code is governed by a BSD-style
 * license that can be found in the LICENSE file.
 */

import { buildCheck } from './build/check.js';
import { dependenciesCheck } from './dependencies/check.js';
import { dockerCheck } from './docker/check.js';
import { environmentCheck } from './environment/check.js';
import { secretsCheck } from './secrets/check.js';
import { verificationCheck } from './verification/check.js';

export { buildCheck } from './build/check.js';
export { dependenciesCheck } from './dependencies/check.js';
export { dockerCheck } from './docker/check.js';
export { environmentCheck } from './environment/check.js';
export { secretsCheck } from './secrets/check.js';
export { verificationCheck } from './verification/check.js';

/**
 * Every check WreckCheck runs, in the order they are reported.
 *
 * The scanner runs them concurrently, so this order is presentational only.
 */
export const checks = [
	secretsCheck,
	environmentCheck,
	dependenciesCheck,
	dockerCheck,
	buildCheck,
	verificationCheck,
];
