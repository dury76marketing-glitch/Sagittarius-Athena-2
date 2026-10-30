// Operator username/password and Railway pairing are intentionally not used.
// The dashboard and LIVE control use the existing same-origin HTTP paths.
// IMPORTANT: this app-level access policy does not authenticate an operator.
// Production deployments must restrict access at the network/edge layer.
export const OPERATOR_ACCESS_VERSION = 'DIRECT-DASHBOARD-NO-APP-LOGIN-V1';
