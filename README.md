# TigerAI

A fictional friend in a Macintosh-inspired desktop. Bring your own API key and
meet a fictional 20-year-old college student majoring in computer science.

## Development

Requires Node.js 22+ and Python 3. esbuild and Terser are pinned build-only dependencies;
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
with esbuild followed by a Terser compression pass, minify CSS, and give the finished assets content-versioned URLs.
Only the page, production assets, and license are published in `dist/`; editable
JSON, source modules, and source maps are excluded. GitHub Actions uses `npm ci`
to install locked build dependencies before building and deploying. Automated
tests run only on explicit request: use `npm test`, or manually dispatch the
deployment workflow with **run_tests** enabled. Ordinary pushes do not run tests.

Base64 and minification are reversible obfuscation, not secrecy. Readable code
and plaintext JSON remain publicly available in GitHub, and prompts appear in API
requests and opt-in debug logs. See [ARCHITECTURE.md](ARCHITECTURE.md).

## Configuration files

- `config/prompts.json`: character prompt, identity instruction, and ordered rules.
- `config/constants.json`: numeric settings grouped into `timing`, `chat` (message
  length and room-title length), and `debug` (retention, capacity, export cleanup).

Each file includes a `_comments` section explaining every setting, its units,
limits, and effects. These are valid JSON documentation fields, not JavaScript
comments, and the generator excludes them from runtime configuration and prompts.
Both files are editable sources. Run `npm run config:generate` for local use or
`npm run build` for production output. Generated modules are ignored by Git.
Keep changes local until publication is explicitly requested.

## Reply pacing

Your message appears immediately. A random 1–2.2 second pause comes before
generation starts and the typing indicator appears in a fixed strip above the
composer, separate from conversation bubbles.
Typing duration is proportional to the complete reply length at a configurable
speed, defaulting to 300 Unicode characters per minute (5 per second). A random
±12% speed variation makes each reply slightly different. There is no short
maximum wait: 100 characters take roughly 20 seconds, 500 roughly 100 seconds.
API time counts toward that duration, so it is not added again. Stop cancels
both generation and any remaining typing delay.

Edit `timing` in **[config/constants.json](config/constants.json)**:

| Setting | Meaning |
| --- | --- |
| `beforeTypingMinimumMs` | Minimum random pause before typing starts |
| `beforeTypingMaximumMs` | Maximum random pause before typing starts |
| `minimumMs` | Minimum typing duration for very short replies |
| `charactersPerMinute` | Base typing speed; larger means faster |
| `speedVariationFraction` | Random fractional speed variation; 0 disables it |

Rebuild locally or run `npm run config:generate` and reload the development page.
Constants JSON is bundled into the versioned script; it is not fetched separately.
 Stop cancels the
API call or pacing delay and preserves your draft. Animated dots respect reduced
motion preferences. Debug log durations measure API calls, excluding pacing.

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

GitHub Actions builds on push to main, then deploys dist to Pages.
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

## Renaming chat rooms

Click the active room's label in the sidebar, or its title at the top of the chat,
to edit it in place with the current name selected. Click an inactive room once
to open it, then click its label again to edit. Enter or clicking elsewhere saves
the name locally; Escape cancels. An empty name leaves the old name unchanged.
Custom names are preserved when the first reply would normally name a new room.

The composer clears immediately when sending and stays editable while waiting.
You can prepare the next message, then send it after the current reply finishes.
Reply completion never clears that next draft. On failure or cancellation, the
original message is restored only if you have not edited a new draft.
