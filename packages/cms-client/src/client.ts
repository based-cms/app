import { ConvexHttpClient } from 'convex/browser';
import { makeFunctionReference } from 'convex/server';
import { registerSections as _registerSections } from './server/registerSections';
import { parseKey } from './token';
import type { CMSClient, CMSClientOptions, CMSSection, InferSectionType } from './types';

// Typed reference to sectionContent.getPublic (public query, no auth)
const getPublicFn = makeFunctionReference<
	'query',
	{ orgSlug: string; sectionType: string; env: 'production' | 'preview' },
	unknown[]
>('sectionContent:getPublic');

/**
 * Create a CMS client for server-side operations.
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
	const contentEnv = parsed.env === 'live' ? 'production' : ('preview' as const);

	// Lazy HTTP client — only created if getSection is called
	let _httpClient: ConvexHttpClient | null = null;
	function getHttpClient() {
		if (!_httpClient) {
			_httpClient = new ConvexHttpClient(parsed.convexUrl);
		}
		return _httpClient;
	}

	return {
		async registerSections(sections: CMSSection[]) {
			await _registerSections(sections, {
				convexUrl: parsed.convexUrl,
				registrationToken: parsed.secret,
			});
		},

		async getSection<T extends CMSSection>(
			section: T,
			slug: string,
		): Promise<InferSectionType<T>[]> {
			const client = getHttpClient();
			const result = await client.query(getPublicFn, {
				orgSlug: slug,
				sectionType: section.name,
				env: contentEnv,
			});
			return result as InferSectionType<T>[];
		},
	};
}
