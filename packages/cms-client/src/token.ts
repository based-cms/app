export type KeyEnv = 'test' | 'live';

export interface ParsedKey {
	env: KeyEnv;
	deploymentName: string;
	secret: string;
	convexUrl: string;
}

/**
 * Parse a BASED-CMS-KEY into its parts.
 *
 * Format: `bcms_<test|live>-<base64(deployment-name.SECRET24)>`
 *
 * Example:
 *   `bcms_test-ZWxhdGVkLXRhcGlyLTMzMS5BQkMxQUJDMkFCQzNBQkM0QUJDNUFCQzY=`
 *   → env: 'test'
 *   → deploymentName: 'elated-tapir-331'
 *   → secret: 'ABC1ABC2ABC3ABC4ABC5ABC6'
 *   → convexUrl: 'https://elated-tapir-331.eu-west-1.convex.cloud'
 */
export function parseKey(key: string): ParsedKey {
	if (!key) {
		throw new Error('[cms-client] BASED-CMS-KEY is empty.');
	}

	const body = key.startsWith('bcms_') ? key.slice(5) : key;

	// Split env from base64 payload on first hyphen
	const sep = body.indexOf('-');
	if (sep === -1) {
		throw new Error(
			'[cms-client] Invalid BASED-CMS-KEY format. Expected: bcms_<test|live>-<base64>',
		);
	}

	const envStr = body.slice(0, sep);
	if (envStr !== 'test' && envStr !== 'live') {
		throw new Error(
			`[cms-client] Invalid BASED-CMS-KEY env "${envStr}". Expected "test" or "live".`,
		);
	}

	const b64 = body.slice(sep + 1);

	let decoded: string;
	try {
		decoded = atob(b64);
	} catch {
		throw new Error(
			'[cms-client] Invalid BASED-CMS-KEY — could not base64-decode the payload.',
		);
	}

	// Split on last dot — deployment names can contain dots (e.g. with region),
	// but the secret (24 uppercase+digits) never does
	const dotIdx = decoded.lastIndexOf('.');
	if (dotIdx === -1) {
		throw new Error('[cms-client] Invalid BASED-CMS-KEY');
	}

	const deploymentName = decoded.slice(0, dotIdx);
	const secret = decoded.slice(dotIdx + 1);

	if (!deploymentName || !secret) {
		throw new Error('[cms-client] Invalid BASED-CMS-KEY');
	}

	return {
		env: envStr,
		deploymentName,
		secret,
		convexUrl: `https://${deploymentName}.eu-west-1.convex.cloud`,
	};
}

/**
 * Build a BASED-CMS-KEY from its parts.
 *
 * Used by the CMS admin dashboard to display the key to users.
 */
export function buildKey(env: KeyEnv, deploymentName: string, secret: string): string {
	const payload = `${deploymentName}.${secret}`;
	return `bcms_${env}-${btoa(payload)}`;
}
