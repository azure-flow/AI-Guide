// lib/normalizers.ts

/**
 * Normalize keyFindings from aiToolMeta.keyFindingsRaw (camelCase)
 * New format: title@content (each on a line, may or may not have blank lines between)
 * Old format: title on first line, content on following lines (separated by blank lines)
 * Returns only the titles (for unexpanded/collapsed view on homepage cards)
 */
export function normalizeKeyFindings(node: any): string[] {
  const raw = node?.aiToolMeta?.keyFindingsRaw ?? "";
  
  if (!raw || String(raw).trim() === '') {
    return [];
  }

  const rawString = String(raw);
  const titles: string[] = [];
  
  // Split by newlines (both single and double newlines)
  // Filter out empty lines
  const lines = rawString.split(/\r?\n/).map(line => line.trim()).filter(line => line !== '');
  
  lines.forEach(line => {
    // Check if new format: title@content
    if (line.includes('@')) {
      // New format: split by @ to get title
      const parts = line.split('@');
      const title = parts[0]?.trim();
      if (title) {
        titles.push(title);
      }
    } else {
      // Old format: treat as title (first line of a section)
      // Only add if we haven't seen this pattern before (to avoid duplicates)
      if (line && !titles.includes(line)) {
        titles.push(line);
      }
    }
  });
  
  return titles.slice(0, 5); // Cap at 5 items for homepage cards
}

/**
 * Combine and parse pricing models from pricingModel1-4 fields
 * New format: First line: ModelName@Price, subsequent lines: features
 * Returns combined pricing models from all 4 fields
 */
export function parsePricingModels(meta: any): Array<{ name: string; price: string; features: string[] }> {
  const parseSinglePricingModel = (text: string | null | undefined): Array<{ name: string; price: string; features: string[] }> => {
    if (!text || String(text).trim() === '') {
      return [];
    }

    const lines = String(text).split(/\r?\n/).map((line) => line.trim()).filter((line) => line !== '');

    if (lines.length === 0) {
      return [];
    }

    // First line: ModelName@Price
    const firstLine = lines[0];
    let name = '';
    let price = '$0.00';

    if (firstLine.includes('@')) {
      // New format: split by @
      const parts = firstLine.split('@');
      name = parts[0]?.trim() || '';
      price = parts[1]?.trim() || '$0.00';
    } else {
      // Old format fallback: first line is name, second line might be price
      name = firstLine;
      if (lines.length > 1 && lines[1].startsWith('$')) {
        price = lines[1];
      } else {
        price = '$0.00';
      }
    }

    // Rest are features (skip price line if old format)
    const startIdx = firstLine.includes('@') ? 1 : 2;
    const features = lines
      .slice(startIdx)
      .map((line) => {
        // Remove leading dash and whitespace if present
        return line.replace(/^-\s*/, '').trim();
      })
      .filter((feature) => feature !== '');

    if (!name) {
      return [];
    }

    return [{ name, price, features }];
  };

  // Combine all pricing models from the 4 fields
  const allPricingModels: Array<{ name: string; price: string; features: string[] }> = [];
  
  if (meta?.pricingModel1) {
    allPricingModels.push(...parseSinglePricingModel(meta.pricingModel1));
  }
  if (meta?.pricingModel2) {
    allPricingModels.push(...parseSinglePricingModel(meta.pricingModel2));
  }
  if (meta?.pricingModel3) {
    allPricingModels.push(...parseSinglePricingModel(meta.pricingModel3));
  }
  if (meta?.pricingModel4) {
    allPricingModels.push(...parseSinglePricingModel(meta.pricingModel4));
  }

  return allPricingModels;
}

/**
 * Get pricing display string (for cards) - combines all pricing models
 * Returns format like "Free / Paid$20-"
 */
export function getPricingDisplay(meta: any): string {
  const pricingModels = parsePricingModels(meta);
  
  if (pricingModels.length === 0) {
    return '';
  }

  const pricingInfo: string[] = [];
  let hasFree = false;
  let hasPaid = false;
  let lowestPaidPrice = '';

  pricingModels.forEach((model) => {
    const nameLower = model.name.toLowerCase();
    const priceLower = model.price.toLowerCase();

    // Check for free plans
    if (nameLower.includes('free') || model.price === '$0' || model.price === '$0.00' || priceLower.includes('free')) {
      hasFree = true;
    }
    // Check for paid plans
    else if (model.price && model.price.startsWith('$') && model.price !== '$0' && model.price !== '$0.00') {
      hasPaid = true;
      // Extract just the price part (e.g., "$20" from "$20/mo")
      const priceMatch = model.price.match(/\$\d+/);
      if (priceMatch && (!lowestPaidPrice || priceMatch[0] < lowestPaidPrice)) {
        lowestPaidPrice = priceMatch[0];
      }
    }
  });

  if (hasFree) pricingInfo.push('Free');
  if (hasPaid && lowestPaidPrice) pricingInfo.push(`Paid${lowestPaidPrice}-`);

  return pricingInfo.join(' / ');
}
