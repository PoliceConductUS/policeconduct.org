# Why

Internal income-matching codes do not tell visitors how arrests are distributed across neighborhood income ranges.

# What Changes

Replace the matching-status table with estimated household income ranges, including Unknown. Use the approved columns Estimated household income, Count, Percentage, and Agency Percentage. Agency Percentage means the personnel member's share of agency arrests in that range over the same recorded months and source. Preserve underlying source breakdowns. No database changes or compatibility aliases.

# Impact

Personnel arrest profile loader, shared arrest component, and calculation/render tests. This is descriptive data, not evidence of targeting or personal income.
