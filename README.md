# TigerAI

A fictional friend in a Macintosh-inspired desktop. Bring your own API key and
meet a fictional 20-year-old college student majoring in computer science.

## Development

Requires Node.js 22+ and Python 3. No dependencies to install.

```sh
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

Prompts are Base64 encoded, which is reversible obfuscation, not secrecy. A static
frontend cannot hide prompts from developer tools or network inspection.

```sh
node scripts/prompts.mjs export /tmp/tigerai-prompts.json
# Edit character, identity, and the ordered rules array.
node scripts/prompts.mjs import /tmp/tigerai-prompts.json
```

Rules have `id`, `enabled`, and `text`. Enabled rules stack in array order. Profile
prompt changes affect new rooms; rule changes affect subsequent replies. Do not
commit decoded prompt files. See [ARCHITECTURE.md](ARCHITECTURE.md).

## Publish

GitHub Actions checks and builds on push to main, then deploys dist to Pages.
Repository Settings → Pages must use GitHub Actions as source. If automatic
enablement is denied, the repository owner must enable it manually.
Expected URL: https://zemw.github.io/tigerai/

## License

[TigerAI Noncommercial License](LICENSE). Commercial use requires prior written
consent from zemw. This project is source-available, not OSI open source.
