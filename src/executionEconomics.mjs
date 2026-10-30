// Receipt evidence, not a trading rule. Preserve a broker-confirmed zero fee;
// unproven legacy/default zeros retain their existing conservative estimates.
export function hasKnownZeroLiveEntryFee(entry) {
  const proof = entry?.entryConfig?.entryFillProof;
  return entry?.mode === 'LIVE' && entry.entryFeeCents != null
    && entry.entryFeeCents !== '' && Number(entry.entryFeeCents) === 0
    && proof?.authoritative === true && Number(proof.filledCount) > 0
    && Number(proof.filledCount) === Number(entry.count);
}
