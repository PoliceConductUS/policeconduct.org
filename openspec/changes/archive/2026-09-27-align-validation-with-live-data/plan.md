# Validation repair plan

1. Reproduce aggregate failure and trace obsolete expectations to current templates/database.
2. Update civic-index and prefill test fixtures without changing production behavior.
3. Run focused tests, independent review, and full npm run validate; record actual results.
