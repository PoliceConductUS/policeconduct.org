# Compact authority discipline

## Why

Minnesota's 76 fully expanded discipline records make lookup and comparison unnecessarily difficult, especially on mobile.

## What Changes

Replace expanded records with compact summaries and native details; add local person/case search and ten-record paging with a result range; add links to existing activity sections. Preserve dates, optional facts, personnel links and supplied document links. The interactive pager uses buttons within the collection and does not create pagination URLs. All compact records remain in server HTML; without JavaScript they remain readable and details still work.

## Capabilities

### New Capabilities

- authority-discipline-browsing: compact, searchable, locally paged discipline collection.

## Impact

Existing records component, external styles, client interaction script and focused browser tests. No DB, intake, routing or interpretation changes. No backward-compatibility layer. No trust, safety or causal claims.
