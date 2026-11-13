# Retrospective

Case links use an existing foreign key relationship and stored case identity, so report records no longer copy a case URL or title. Conversion uses the normal intake mutation pipeline and retains the native link ID.

Independent review caught two PATCH consumers that could not partially validate a refined schema. Shared partial-field validation fixes both paths without relaxing full record or database constraints. Validation also exposed invalid temporary-directory configuration and outdated parser dependencies; their causes were fixed with unchanged fixture assertions and real parser tests.
