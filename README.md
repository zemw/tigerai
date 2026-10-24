# TigerAI

A fictional friend in a Macintosh-inspired desktop. Bring your own API key and
meet a fictional 20-year-old college student majoring in computer science.

## Development

Requires Node.js 22+ and Python 3. esbuild is a pinned build-only dependency;
the published application has no third-party runtime dependencies.

```sh
npm ci
npm run dev
# Open http://localhost:5173
npm run check
npm test
npm run build
```

Enter a key, optionally remember it, and press Enter. Create a room, chat, exit,
and return to the same character later. Provider settings accept a full
OpenAI-compatible chat completions URL and model. The provider must support CORS
for direct browser access. The defaults are starting settings; model availability
and billing depend on your account. Keys are validated on the first API call.

## Privacy and prompts

Keys are masked immediately and cleared from the form on entry. Without Remember,
they exist only in page memory until reload. With Remember, they are stored in
unencrypted browser localStorage. Uncheck Remember to remove the stored key.
Chats and character profiles are also saved locally. Clearing site storage deletes
them. Each generation sends the profile, rules, and full dialogue to your selected
provider. Only use an endpoint you trust: your key is sent there directly.

## Prompt engineering and production builds

Edit **[config/prompts.json](config/prompts.json)** directly. It is the single
editable source for the `character` generation prompt, `identity` instruction,
and ordered `rules` array. Each rule has a unique `id`, boolean `enabled`, and
nonempty `text`; enabled rules stack in array order. Move entries to change their
order, append entries to add rules, or set `enabled` to false to disable one.

Character prompt changes affect new rooms; saved room profiles remain frozen.
Identity and response rules are applied before subsequent reply requests. They
guide generation, not a separate post-response validation pass.

```sh
# Edit config/prompts.json, then:
npm run build
# Or regenerate prompts for an already-running development server:
npm run prompts:generate
```

The development, check, and test commands automatically generate
`src/core/prompts.generated.js` from JSON. This generated file is ignored by Git;
do not edit it. Restart development or run `npm run prompts:generate` after JSON
edits, then reload the browser. The previous export/import commands remain
available, but direct JSON editing is now the normal workflow.

Production builds validate the JSON, Base64-encode it, bundle and minify JavaScript
with esbuild, minify CSS, and give the finished assets content-versioned URLs.
Only the page, production assets, and license are published in `dist/`; editable
JSON, source modules, and source maps are excluded. GitHub Actions uses `npm ci`
to install the locked build dependency before checks and deployment.

Base64 and minification are reversible obfuscation, not secrecy. Readable code
and plaintext JSON remain publicly available in GitHub, and prompts appear in API
requests and opt-in debug logs. See [ARCHITECTURE.md](ARCHITECTURE.md).

## Local debug logs

Open **Debug logs…** in the menu and enable logging for the current session.
Logging is off by default and turns off on reload. Future character-generation
and reply calls are recorded in IndexedDB with the request body, room ID, model,
endpoint, timestamps, result, status, duration, token usage, and provider request
ID when available. API keys and authorization headers are excluded; occurrences
of the active key in recorded values are redacted. Provider error bodies and
unrecognized response fields are not recorded.

Logs contain full conversation history and decoded prompts. They stay in this
browser unless you export them. Filter by room, expand entries, select requests,
and choose **Export selected** to download JSON. Refresh to see completed calls.
**Clear all logs** removes logs without deleting chats; deleting a chat does not
remove its logs. Pending entries may indicate an interrupted page or request.

Retention is seven days, at most 200 entries and 10 MB, checked on startup and
log access/writes. Old entries are removed first. Oversized entries cannot be
retained. Browser storage can also be cleared or evicted, so export important
records. Storage failures show a notice and do not block the API call.

## Publish

GitHub Actions checks and builds on push to main, then deploys dist to Pages.
Repository Settings → Pages must use GitHub Actions as source. If automatic
enablement is denied, the repository owner must enable it manually.
Expected URL: https://zemw.github.io/tigerai/

## License

[TigerAI Noncommercial Source-Sharing License 1.1](LICENSE), a custom
source-available license, not an OSI-approved open source license.

- Noncommercial use, modification, and redistribution are permitted.
- Distribute a project incorporating TigerAI: provide its complete corresponding
  source to recipients under the same license, including your modifications.
- Host it for other users: prominently offer the running version's source under
  the same license. Source links must remain available for at least three years
  after the last distribution or service use of that version.
- Purely private noncommercial modifications do not require publication.
- **All commercial use requires prior written consent from zemw**, even if you
  publish the source. This includes commercial internal use and revenue-generating
  services. Contact [zemw](https://github.com/zemw) for separate commercial terms.

Source sharing excludes credentials and user data. Independent programs merely
communicating through ordinary network protocols are outside the covered work.
The complete license defines the scope and takes precedence over this summary.

Intentionally submitted contributions also authorize zemw to grant commercial
licenses for those contributions; contributors retain copyright. See section 7.
Earlier releases retain the permissions already granted under their earlier terms.
