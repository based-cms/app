'use client';

import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { CheckoutLink, CustomerPortalLink } from '@convex-dev/polar/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Check, ExternalLink, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PlanTier } from '@/convex/lib/plans';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
	if (bytes === 0) return '0 B';
	const units = ['B', 'KB', 'MB', 'GB', 'TB'];
	const i = Math.floor(Math.log(bytes) / Math.log(1024));
	const value = bytes / Math.pow(1024, i);
	return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[i]}`;
}

function formatLimit(value: number | null): string {
	return value === null ? 'Unlimited' : value.toLocaleString();
}

function formatStorageLimit(bytes: number | null): string {
	return bytes === null ? 'Unlimited' : formatBytes(bytes);
}

// ─── Plan grid data ─────────────────────────────────────────────────────────

const PLANS: {
	key: PlanTier;
	name: string;
	price: string;
	priceNote: string;
	features: string[];
}[] = [
	{
		key: 'free',
		name: 'Free',
		price: '$0',
		priceNote: 'forever',
		features: ['3 projects', '15 items/project', '100 MB storage'],
	},
	{
		key: 'pro',
		name: 'Pro',
		price: '$10',
		priceNote: '/month',
		features: ['50 projects', '500 items/project', '5 GB storage'],
	},
	{
		key: 'max',
		name: 'Max',
		price: '$100',
		priceNote: '/month',
		features: ['Unlimited projects', 'Unlimited items', '100 GB storage'],
	},
	{
		key: 'enterprise',
		name: 'Enterprise',
		price: 'Custom',
		priceNote: 'contact us',
		features: ['Unlimited projects', 'Unlimited items', 'Unlimited storage'],
	},
];

// ─── Page ───────────────────────────────────────────────────────────────────

export default function BillingPage() {
	const billing = useQuery(api.billing.getBillingInfo);
	const products = useQuery(api.billing.getConfiguredProducts);
	console.log(billing); // eslint-disable-line no-console
	console.log(products); // eslint-disable-line no-console

	// Loading
	if (billing === undefined || billing === null) {
		return (
			<div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
				<div className="h-8 w-48 animate-pulse rounded bg-muted" />
				<div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
					{[1, 2, 3, 4].map((i) => (
						<div key={i} className="h-64 animate-pulse rounded-lg bg-muted" />
					))}
				</div>
			</div>
		);
	}

	const currentTier = billing.tier;
	const tierLabel = currentTier.charAt(0).toUpperCase() + currentTier.slice(1);

	return (
		<div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
			{/* Header */}
			<div className="flex items-center gap-3">
				<h1 className="text-lg font-semibold">Billing &amp; Plans</h1>
				<Badge variant="secondary" className="text-xs">
					{tierLabel}
				</Badge>
			</div>
			<p className="mt-0.5 text-[13px] text-muted-foreground">
				Manage your subscription and monitor usage
			</p>

			{/* Usage summary */}
			<div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
				<UsageCard
					label="Projects"
					current={billing.projectCount}
					limit={billing.limits.maxProjects}
				/>
				<UsageCard
					label="Storage"
					current={billing.storageBytes}
					limit={billing.limits.maxStorageBytes}
					format="bytes"
				/>
			</div>

			<Separator className="my-8" />

			{/* Plan comparison */}
			<h2 className="text-sm font-semibold">Plans</h2>
			<div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
				{PLANS.map((plan) => {
					const isCurrent = plan.key === currentTier;
					const isUpgrade =
						!isCurrent &&
						PLANS.findIndex((p) => p.key === plan.key) >
							PLANS.findIndex((p) => p.key === currentTier);
					const productId =
						plan.key !== 'free' && plan.key !== 'enterprise'
							? (products as Record<string, { id: string }> | undefined)?.[plan.key]?.id
							: null;

					return (
						<div
							key={plan.key}
							className={cn(
								'flex flex-col rounded-lg border p-5',
								isCurrent && 'border-foreground ring-1 ring-foreground',
							)}
						>
							<div className="flex items-center gap-2">
								<span className="text-sm font-semibold">{plan.name}</span>
								{isCurrent && (
									<Badge variant="default" className="text-[10px]">
										Current
									</Badge>
								)}
							</div>

							<div className="mt-3">
								<span className="text-2xl font-bold">{plan.price}</span>
								<span className="ml-1 text-xs text-muted-foreground">
									{plan.priceNote}
								</span>
							</div>

							<ul className="mt-4 flex-1 space-y-2">
								{plan.features.map((f) => (
									<li key={f} className="flex items-start gap-2 text-[13px]">
										<Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
										{f}
									</li>
								))}
							</ul>

							<div className="mt-5">
								{isCurrent ? (
									currentTier !== 'free' ? (
										<CustomerPortalLink
											polarApi={api.billing}
											className="inline-flex h-9 w-full items-center justify-center rounded-md border px-3 text-[13px] font-medium transition-colors hover:bg-accent"
										>
											Manage subscription
											<ExternalLink className="ml-1.5 h-3 w-3" />
										</CustomerPortalLink>
									) : (
										<Button size="sm" variant="outline" className="w-full" disabled>
											Current plan
										</Button>
									)
								) : plan.key === 'enterprise' ? (
									<Button size="sm" variant="outline" className="w-full" asChild>
										<a href="mailto:hello@based-cms.com">
											<Mail className="mr-1.5 h-3 w-3" />
											Contact us
										</a>
									</Button>
								) : isUpgrade && productId ? (
									currentTier === 'free' ? (
										<CheckoutLink
											polarApi={api.billing}
											productIds={[productId]}
											embed={false}
											lazy
											className="inline-flex h-9 w-full items-center justify-center rounded-md bg-primary px-3 text-[13px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
										>
											Upgrade to {plan.name}
										</CheckoutLink>
									) : (
										<CustomerPortalLink
											polarApi={api.billing}
											className="inline-flex h-9 w-full items-center justify-center rounded-md bg-primary px-3 text-[13px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
										>
											Upgrade to {plan.name}
											<ExternalLink className="ml-1.5 h-3 w-3" />
										</CustomerPortalLink>
									)
								) : !isCurrent && currentTier !== 'free' ? (
									<CustomerPortalLink
										polarApi={api.billing}
										className="inline-flex h-9 w-full items-center justify-center rounded-md border px-3 text-[13px] font-medium transition-colors hover:bg-accent"
									>
										Change plan
										<ExternalLink className="ml-1.5 h-3 w-3" />
									</CustomerPortalLink>
								) : (
									<Button size="sm" variant="outline" className="w-full" disabled>
										—
									</Button>
								)}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}

// ─── Components ─────────────────────────────────────────────────────────────

function UsageCard({
	label,
	current,
	limit,
	format,
}: {
	label: string;
	current: number;
	limit: number | null;
	format?: 'bytes';
}) {
	const currentDisplay =
		format === 'bytes' ? formatBytes(current) : current.toLocaleString();
	const limitDisplay =
		format === 'bytes' ? formatStorageLimit(limit) : formatLimit(limit);
	const pct = limit !== null && limit > 0 ? Math.min((current / limit) * 100, 100) : 0;
	const isNearLimit = limit !== null && pct >= 80;

	return (
		<div className="rounded-lg border p-4">
			<p className="text-[13px] text-muted-foreground">{label}</p>
			<p className="mt-1 text-xl font-semibold">
				{currentDisplay}
				<span className="text-sm font-normal text-muted-foreground">
					{' '}
					/ {limitDisplay}
				</span>
			</p>
			{limit !== null && (
				<div className="mt-2 h-1.5 w-full rounded-full bg-muted">
					<div
						className={cn(
							'h-1.5 rounded-full transition-all',
							isNearLimit ? 'bg-amber-500' : 'bg-foreground',
						)}
						style={{ width: `${pct}%` }}
					/>
				</div>
			)}
		</div>
	);
}
