## Mandatory Engineering Pillars (Zero Exceptions)

All agent tasks in this repository must proactively adhere to these 4 non-negotiable baselines:
1. **KISS Implementation**: Cleanest, minimal architecture. Progressive disclosure (collapsible secondary items, minimal cognitive load for teachers).
2. **Security-First Coding**: Non-negotiable zero-trust boundaries at all ingestion/storage points (strict size limits, binary magic-byte inspection, allowlists, zero-trust cloud rules, student PII masking).
3. **High Performance**: Lean bundle, fast (<100ms) UI response, minimal re-renders, clean memory and timer lifecycles.
4. **Professional Look & Feel**: Consistent visual standards (unified 32x32px `+`/`-` buttons, RTL alignment, harmonious theme, zero layout shifts).

See full specification in `GEMINI.md`.

## Agent skills

### Issue tracker

GitHub Issues using the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Canonical triage roles mapped 1:1 (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout (`GLOSSARY.md` and `docs/adr/` at repo root). See `docs/agents/domain.md`.
