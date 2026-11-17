# UI implementation report

## RED

`PLAYWRIGHT_SKIP_WEB_SERVER=1 npx playwright test tests/e2e/personnel-post-ui.spec.ts --workers=1` failed as expected before implementation because the new discipline and education components did not exist. A live profile test also failed because its direct discipline record was absent from the rendered page.

## GREEN

The focused data and UI suites passed together after implementation: 7 tests, 0 failures. The component fixture checks a discipline with two linked agencies and a direct record with no agency, separate allegation and finding text, the source link, details opened by keyboard, UTC calendar dates, and omitted optional fields. Education fixtures cover ten visible courses, a course-name hit beyond the initial page, sponsor and instructor searches, no-match and clear states, paging, zero credits, and all records visible without JavaScript. Live profile checks compare a direct discipline source and education DOM count with database records and confirm section omission for a person with no courses.

The page uses the existing wide personnel panels and shared heading roles. The new component CSS is external at build through Astro. No database rows or schema were changed.
