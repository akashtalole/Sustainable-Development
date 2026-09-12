export interface UrlState {
  goal?: number;
  country?: string;
}

export function readUrlState(): UrlState {
  const params = new URLSearchParams(location.search);
  const goalRaw = params.get("goal");
  const goal = goalRaw ? Number(goalRaw) : undefined;
  const country = params.get("country") ?? undefined;
  return {
    goal: goal && Number.isInteger(goal) && goal >= 1 && goal <= 17 ? goal : undefined,
    country: country ? country.toUpperCase() : undefined,
  };
}

/** Replaces the current history entry so goal/country switches don't spam back-button history. */
export function writeUrlState(state: UrlState): void {
  const params = new URLSearchParams();
  if (state.goal) params.set("goal", String(state.goal));
  if (state.country) params.set("country", state.country);
  const query = params.toString();
  const url = `${location.pathname}${query ? `?${query}` : ""}`;
  history.replaceState(null, "", url);
}
