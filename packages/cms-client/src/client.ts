import { registerSections as _registerSections } from './server/registerSections';
import { parseKey } from './token';
import type { CMSClient, CMSClientOptions, CMSSection } from './types';

/**
 * Create a CMS client for server-side section registration.
 *
 * ```ts
 * // lib/cms.ts
 * import { createCMSClient } from 'cms-client'
 *
 * export const cms = createCMSClient({
 *   key: process.env['BASED-CMS-KEY']!,
 * })
 * ```
 */
export function createCMSClient(options: CMSClientOptions): CMSClient {
	if (!options.key) {
		throw new Error(
			"[cms-client] No key provided. Pass key to createCMSClient({ key: process.env['BASED-CMS-KEY']! }).",
		);
	}

	const parsed = parseKey(options.key);

	return {
		async registerSections(sections: CMSSection[]) {
			await _registerSections(sections, {
				convexUrl: parsed.convexUrl,
				registrationToken: parsed.secret,
			});
		},
	};
}
