# Show authority discipline allegations

## Why

Licensing-authority discipline rows hide the allegation behind expansion and use more vertical space than needed for browsing.

## What Changes

Show the full supplied allegation in the collapsed row. Reduce row padding and metadata gaps, keeping shared heading/body sizes. Put source documents inside Record details and open them in a new tab using their stored URL. Keep other detail fields and existing filtering/paging behavior.

## Impact

LicensingAuthorityRecords and PersonnelDiscipline. Officer-page allegations also remain visible by default, and source links sit inside Record details and open in a new tab. No loader, schema, source URL, or data changes. An external source may still control downloading through its response or browser preferences.
