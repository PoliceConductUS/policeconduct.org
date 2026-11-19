# Outcome

PR checks should test what each check is for, without hiding security findings or weakening build or schema validation. This is a bounded security and workflow repair. GitHub does not build or publish previews or releases for now: CI has no database or intake data, and previews are published locally with `npm run deploy -- preview`. That stays true until a change adds CI publication.
