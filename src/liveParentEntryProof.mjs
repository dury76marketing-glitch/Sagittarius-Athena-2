/**
 * Fail-closed financial identity fence for a fully closed LIVE capital parent.
 * A broker order number is only an order receipt, not proof of owned fills.
 * ProfitGuard.reconcilePending writes ENTRY-FILL-REPORT-V1 after authoritative
 * order and complete fill-history readback. This validator confirms that the
 * same report matches the reconciled ledger fields before any recovery watch
 * can be authorized. SHADOW and SIM behavior is unchanged.
 */
const amount = value => value == null || typeof value === 'boolean' ||
  (typeof value === 'string' && value.trim() === '') ? NaN : Number(value);
const close = (a,b,tol=1e-6) => Number.isFinite(amount(a)) &&
  Number.isFinite(amount(b)) && Math.abs(amount(a)-amount(b)) <= tol;

export function verifiedLiveCapitalParentEntryFill(entry) {
  if(entry?.mode !== 'LIVE') return {ok:true,reason:'not_live_parent'};
  const proof=entry?.entryConfig?.entryFillProof;
  const count=amount(entry?.count),price=amount(entry?.entryPriceCents),fee=amount(entry?.entryFeeCents);
  if(!entry?.entryOrderId || !entry?.entryClientOrderId || !proof ||
    proof.version !== 'ENTRY-FILL-REPORT-V1' || proof.authoritative !== true ||
    String(proof.orderId || '') !== String(entry.entryOrderId) ||
    String(proof.clientOrderId || '') !== String(entry.entryClientOrderId) ||
    !Number.isFinite(count) || count <= 0 || !Number.isFinite(price) || price <= 0 || price >= 100 ||
    !Number.isFinite(fee) || fee < 0 ||
    !close(proof.filledCount,count,1e-9) ||
    !close(proof.averageFillPriceCents,price) ||
    !close(proof.feePaidCents,fee))
    return {ok:false,reason:'live_parent_entry_fill_proof_incomplete_or_mismatched'};
  return {ok:true,reason:'live_parent_entry_fill_matches_ledger'};
}

/** The matching PostgreSQL fence runs inside the same scoped seat transaction.
 * SQL null handling is explicit: absent evidence never passes an OR predicate.
 * Numeric epsilon matches the JS validator for broker float serialization.
 */
export function liveCapitalParentEntryFillSql(alias='p') {
  if(alias !== 'p') throw new Error('live_parent_sql_alias_invalid');
  return `(${alias}.mode='LIVE' and (
    ${alias}.entry_order_id is null or ${alias}.entry_client_order_id is null
    or ${alias}.entry_config#>>'{entryFillProof,version}' is distinct from 'ENTRY-FILL-REPORT-V1'
    or ${alias}.entry_config#>>'{entryFillProof,authoritative}' is distinct from 'true'
    or ${alias}.entry_config#>>'{entryFillProof,orderId}' is distinct from ${alias}.entry_order_id
    or ${alias}.entry_config#>>'{entryFillProof,clientOrderId}' is distinct from ${alias}.entry_client_order_id
    or abs(coalesce((${alias}.entry_config#>>'{entryFillProof,filledCount}')::double precision,-1)-${alias}.count)>0.000000001
    or abs(coalesce((${alias}.entry_config#>>'{entryFillProof,averageFillPriceCents}')::double precision,-1)-${alias}.entry_price_cents)>0.000001
    or abs(coalesce((${alias}.entry_config#>>'{entryFillProof,feePaidCents}')::double precision,-1)-${alias}.entry_fee_cents)>0.000001
  ))`;
}
