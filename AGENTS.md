# Project preferences

Run automated tests only when the user explicitly asks for them. Do not run tests
as a routine step after edits, before commits, or during ordinary deployments.
Production builds are allowed. The manual deployment workflow offers an optional
run_tests input; leave it disabled unless the user requests tests.

Keep changes local by default. Do not push, publish, or deploy unless the user
explicitly asks. Configuration is split into config/prompts.json for prompts and
ordered rules, and config/constants.json for tunable numeric application settings.
Do not create separate configuration files for individual constants or features.
