# TigerAI architecture

## Module boundaries

TigerAI is a static ES module frontend hosted on GitHub Pages, with no third-party
runtime dependencies. esbuild and Terser are locked development dependencies for production
bundling and minification.

```text
UI → ChatEngine → Provider → external HTTPS model endpoint
          ↓
     persist(room) → BrowserStorage
          ↑
  generated encoded prompt configuration
```

- `src/core/engine.js`: room lifecycle and generation pipeline, with no DOM,
  localStorage, or fetch dependencies. Exposes `createRoom(id?)` and
  `ChatEngine(provider, persist, rules?).send(room, text, signal?)`.
- `config/prompts.json`: editable profile-generation prompt, identity instruction,
  and ordered rules. `scripts/prompt-config.mjs` validates and encodes it into the
  ignored `src/core/prompts.generated.js`, re-exported by `src/core/prompts.js`.
  `scripts/prompts.mjs` remains available for JSON import/export.
- `src/adapters/provider.js`: OpenAI-compatible chat completions transport.
  Contract: `complete(messages, signal): Promise<string>`. Replace this adapter for
  a different API. The endpoint and model are connection settings.
- `src/adapters/storage.js`: versioned browser persistence for rooms, settings,
  and optional key. Replace with files, SQLite, or native secure storage for CLI
  and mobile use. Room objects are plain serializable data.
- `src/ui.js`: DOM rendering, navigation, forms, cancellation, status, and errors.
  Model text is rendered with text nodes, never HTML.

A future CLI can import the core and supply provider and filesystem persistence
adapters. An iOS app can reuse it through a JavaScript runtime or implement the
same contracts. The core does not depend on the web UI.

## Lifecycle and persistence

Room shape: `{id, title, createdAt, character, messages}`. Messages contain `role`
and `content`. On the first message, a system prompt requests a fictional profile
for a 20-year-old CS student. The engine saves the profile before requesting the
first reply. Once present, that profile is never regenerated, including after
reloading, leaving the room, changing connections, and retrying failed replies.

Each reply receives identity instructions, the frozen profile, enabled response
rules in array order, full saved dialogue, and the pending user message. A nonempty
successful reply appends and persists a user/assistant pair. Failed requests keep
the draft without inserting unmatched user messages. A storage failure after a
reply leaves the in-memory messages visible and reports an error. Room locks and
UI controls prevent concurrent sends. Stop aborts network generation. A profile
already persisted is retained. Other-tab storage changes abort and reload this
page; this avoids ordinary stale writes but is not transactional multi-tab sync.

The character prompt is editable for future rooms. Existing identities remain
frozen. Response rule edits apply on subsequent replies. Rules compose as prompt
text, not a formal policy evaluator; authors must resolve contradictory rules.

## Security and limits

Keys are password-masked immediately and cleared from the form on entry. An
unremembered key lives in the provider instance until reload. Remember stores it
in unencrypted localStorage; unchecking removes it. No key belongs in Git or CI.
Endpoint and model settings contain no credentials. Requests go directly to the
selected endpoint, which must support browser CORS and HTTPS (HTTP allowed only
on localhost). Raw provider errors are not displayed, avoiding accidental key echo.

Local data belongs to the exact browser origin. Localhost and Pages do not share
history. Other sites on the same Pages origin may access localStorage; a dedicated
origin and restricted API key improve isolation. Clearing storage is permanent.

Base64 only obscures literal source strings; prompts can be decoded and seen in
requests. Confidential prompts require a backend. Full history is sent on each
reply; long conversations may exceed provider context limits. Streaming,
summarization, migrations, exports, and cross-device sync are future extensions.
There is no TigerAI backend or analytics service. Characters are fictional AI.

## Build and deployment

`npm run check` checks syntax. `npm test` uses deterministic fake providers to
verify identity persistence, failed-reply retry, ordered rules, storage, concurrency,
and sanitized provider errors. Build tests verify Unicode configuration round trips,
validation failures, bundled execution, no plaintext prompts/source maps in output,
and asset version changes. `npm run build` validates/encodes prompts, bundles and
minifies JavaScript, minifies CSS, and copies HTML and the license into dist.
GitHub Actions installs locked build dependencies with `npm ci`, builds, and
deploys a Pages artifact without API keys. Tests run only when the user requests
them; ordinary pushes do not run tests. Manual workflow dispatch offers an
optional `run_tests` input, disabled by default.
Live model verification requires a user-supplied key and is separate from tests.

## License and source availability

The TigerAI Noncommercial Source-Sharing License 1.1 requires prior written
commercial permission, source provision for distribution, and a prominent source
offer for network users. The menu links to the public source repository; operators
of modified versions must update that link to their actual running source. Keep
version-specific source available for the retention period defined in LICENSE.
Private noncommercial modifications are exempt until distributed or offered to
other network users. Never publish credentials or user conversations as source.

## Debug logging

`src/adapters/debug-log.js` owns IndexedDB storage, retention, and credential
redaction. The provider accepts an optional logging object with `enabled()`,
`store.start(entry)`, `store.finish(id, update)`, and `warn(message)`. The engine
passes optional `{roomId, type}` context to `complete`; other providers can ignore
it. No UI or database dependency is introduced into the core.

The provider serializes the request body once, snapshots that body before fetch,
and records only allowlisted request/response metadata, never headers. The active
credential is removed from recorded string values, including echoed responses.
Response content and normalized token counts are logged on success; HTTP/network
errors use sanitized messages rather than raw provider bodies. Cancellation is
recorded separately. A log write failure does not fail a model call.

Transactions atomically update entries and enforce seven-day, 200-entry, 10 MB
retention. Finishing updates only existing entries, so clearing during a request
does not recreate deleted logs. UI opt-in is session-only. The viewer renders log
JSON as text, supports room filters and selected JSON export, and retains logs
independently from chat deletion. This is best-effort local diagnostics, not a
durable audit log: page termination can leave pending records and browser storage
may be unavailable or evicted. Logging intentionally reveals decoded prompts.

## Browser cache consistency

Production builds place bundled JavaScript and minified CSS in a directory named
from an SHA-256 fingerprint of the finished assets and HTML template. The page
references that release directory, preventing browsers from mixing newly published
HTML with old cached modules. Prompt JSON and nested module changes update the
bundle and asset URLs. An already-open older page may need a reload to discover a
new deployment; browser data and saved credentials need not be cleared.

## Build-time prompt pipeline

`config/prompts.json` is the only prompt source of truth. Validation requires
nonempty character/identity strings, an array of rules, unique nonempty rule IDs,
boolean enabled flags, and nonempty rule text. The JSON array defines rule order;
there is no separate numeric priority field. UTF-8 JSON is encoded to Base64 for
an ignored generated module before development, checks, tests, and production
builds. The decoder preserves Unicode. Existing import/export tooling edits the
JSON source rather than maintaining a separate encoded configuration.

esbuild bundles the browser entry point, and Terser performs a second compression
pass with two optimization passes and compact formatting. Output targets ES2022 and
Safari 15.4 syntax; the existing application still requires the browser APIs it
uses, such as dialog and IndexedDB. Build dependencies are not browser runtime
dependencies. Source maps are not published. The distribution contains only
index.html, LICENSE, and content-versioned app.js/style.css. The source repository
retains the readable modules, prompt JSON, build instructions, and dependency lock
file required to modify and reproduce the application under its license.

Minification reduces transfer size, not a guarantee of lower runtime memory.
Neither minification nor Base64 is a security boundary. Repository viewers and
API/debug-log inspection can recover prompts. Confidential prompts would require
a backend. This change does not add post-generation rule validation or change
the character lifecycle.

## Reply pacing

`src/core/timing.js` provides `ReplyTiming`, a UI-independent timing controller.
`ChatEngine` accepts it as its optional fourth constructor argument; pass `null`
to disable artificial pacing for a CLI or another integration. The default
controller computes a length-based target with ±180 ms variation, clamped to
650–2,200 ms. It subtracts all elapsed generation time since send began (including
character generation) and caps any additional wait at 1,600 ms. Provider latency
can exceed the target; this controller does not delay already-slow replies.
`config/timing.json` is the sole source of timing defaults, separate from prompt
configuration. `scripts/config.mjs` validates all five settings and generates the
ignored `src/core/timing.generated.js` for the timing controller. Production builds
and development/check/test precommands generate both configurations automatically.
`npm run config:generate` refreshes them for a running local server. Validation is
shared by build and runtime overrides; it rejects missing/unknown fields, negative
or nonfinite values, out-of-range browser timer values, and inconsistent limits.
The config is bundled into content-versioned assets and not fetched at runtime.
Changing it requires a rebuild/deployment (or local regeneration and reload).

After generation, the engine awaits pacing before appending and persisting the
user/assistant pair. AbortSignal cancels both networking and this delay, with
timer/listener cleanup, preserving the existing retry semantics. Already-saved
characters remain frozen; a cancelled pending reply is not added to room history.
API logs record the real network result immediately, so a successful API result
may be logged even if the user stops during presentation pacing.

The UI renders the pending user message and a live typing bubble while send is
in progress, then replaces them with saved messages on success or removes them on
error/cancellation. Pending text is presentation-only and is not persisted. The
bubble uses text and CSS dots with reduced-motion support. No artificial delays
are added to profile persistence, errors, or API debug logging. Browser timer
throttling/background suspension may postpone presentation beyond these targets.
