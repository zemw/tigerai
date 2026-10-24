# TigerAI architecture

## Module boundaries

TigerAI is a dependency-free static ES module frontend hosted on GitHub Pages.

```text
UI → ChatEngine → Provider → external HTTPS model endpoint
          ↓
     persist(room) → BrowserStorage
          ↑
  encoded prompt configuration
```

- `src/core/engine.js`: room lifecycle and generation pipeline, with no DOM,
  localStorage, or fetch dependencies. Exposes `createRoom(id?)` and
  `ChatEngine(provider, persist, rules?).send(room, text, signal?)`.
- `src/core/prompts.js`: Base64 JSON configuration for profile creation, identity,
  and ordered response rules. `scripts/prompts.mjs` imports and exports editable JSON.
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
and sanitized provider errors. `npm run build` copies runtime files and license
into dist. GitHub Actions runs checks and deploys a Pages artifact without API keys.
Live model verification requires a user-supplied key and is separate from tests.
