import { supabase } from './supabase';

function normalizeRows(rows = []) {
  return rows
    .filter((row) => row?.model_name && row?.provider)
    .map((row) => ({
      model_name: row.model_name,
      provider: row.provider,
      streamable: Boolean(row.streamable),
      unlimited: Boolean(row.unlimited),
    }));
}

function buildModelMetadata(rows) {
  const normalized = normalizeRows(rows);
  const modelsByProvider = {};
  const streamableByModel = {};
  const unlimitedByModel = {};

  for (const row of normalized) {
    if (!modelsByProvider[row.provider]) {
      modelsByProvider[row.provider] = [];
    }
    modelsByProvider[row.provider].push(row.model_name);
    streamableByModel[row.model_name] = row.streamable;
    unlimitedByModel[row.model_name] = row.unlimited;
  }

  Object.keys(modelsByProvider).forEach((provider) => {
    modelsByProvider[provider].sort((a, b) => a.localeCompare(b));
  });

  const allModels = Object.values(modelsByProvider).flat();
  const premiumModels = normalized.filter((m) => !m.unlimited).map((m) => m.model_name);
  const nonPremiumModels = normalized.filter((m) => m.unlimited).map((m) => m.model_name);

  return {
    rows: normalized,
    allModels,
    modelsByProvider,
    streamableByModel,
    unlimitedByModel,
    premiumModels: [...new Set(premiumModels)],
    nonPremiumModels: [...new Set(nonPremiumModels)],
  };
}

export async function fetchModelMetadata() {
  try {
    const { data, error } = await supabase
      .from('ai_models')
      .select('model_name, provider, streamable, unlimited')
      .order('provider', { ascending: true })
      .order('model_name', { ascending: true });

    if (error) {
      throw error;
    }

    return {
      ...buildModelMetadata(data),
      source: 'database',
    };
  } catch (error) {
    console.error('Failed to fetch ai_models metadata:', error);
    throw error;
  }
}
