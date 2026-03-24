import { createClient } from '@supabase/supabase-js';

interface CopyVariant {
  id: string;
  name: string;
  category: 'proven' | 'experimental';
  first_line_template: string;
  body_template: string;
  ps_template: string;
  booking_rate: number;
  times_sent: number;
}

interface InterpolatedCopy {
  variantId: string;
  variantName: string;
  first_line: string;
  email_body: string;
  ps_line: string;
}

// Fetch all active variants from Supabase
async function getActiveVariants(): Promise<CopyVariant[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data } = await supabase
    .from('email_copy_variants')
    .select('*')
    .eq('is_active', true);
  return (data || []) as CopyVariant[];
}

// Weighted random selection by booking_rate
function weightedRandom(variants: CopyVariant[]): CopyVariant {
  // Variants with <30 sends get equal weight (not enough data)
  const weighted = variants.map(v => ({
    ...v,
    weight: v.times_sent >= 30 ? Math.max(v.booking_rate, 0.01) : 0.1 // baseline weight for untested
  }));
  const totalWeight = weighted.reduce((sum, v) => sum + v.weight, 0);
  let random = Math.random() * totalWeight;
  for (const v of weighted) {
    random -= v.weight;
    if (random <= 0) return v;
  }
  return weighted[weighted.length - 1]; // fallback
}

// Select variant: 80% proven (weighted by performance), 20% experimental
export async function selectCopyVariant(): Promise<CopyVariant> {
  const variants = await getActiveVariants();
  if (variants.length === 0) throw new Error('No active copy variants found');

  const isExperimental = Math.random() < 0.20;
  const experimental = variants.filter(v => v.category === 'experimental');
  const proven = variants.filter(v => v.category === 'proven');

  if (isExperimental && experimental.length > 0) {
    return experimental[Math.floor(Math.random() * experimental.length)];
  }

  if (proven.length > 0) {
    return weightedRandom(proven);
  }

  // Fallback: any variant
  return variants[Math.floor(Math.random() * variants.length)];
}

// Interpolate variant templates with lead data
export function interpolateVariant(
  variant: CopyVariant,
  lead: { first_name: string; city: string; source_brokerage: string },
  detail: string
): InterpolatedCopy {
  const replacements: Record<string, string> = {
    '{first_name}': lead.first_name,
    '{city}': lead.city || 'your city',
    '{brokerage}': lead.source_brokerage || 'your brokerage',
    '{detail}': detail || lead.source_brokerage || 'real estate',
  };

  function replace(template: string): string {
    let result = template;
    for (const [key, value] of Object.entries(replacements)) {
      result = result.split(key).join(value);
    }
    return result;
  }

  return {
    variantId: variant.id,
    variantName: variant.name,
    first_line: replace(variant.first_line_template),
    email_body: replace(variant.body_template),
    ps_line: replace(variant.ps_template),
  };
}

// Record that a variant was sent (increment times_sent)
export async function recordVariantSent(variantId: string): Promise<void> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  await supabase.rpc('increment_variant_stat', { p_id: variantId, p_stat: 'times_sent' });
}
