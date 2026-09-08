# Rime Track — Research & Findings

**Last updated:** 2026-09-03
**Changelog:** v1 — initial capture (company, PS terms, model/API specs, hard constraints, competitor catalog)

**Status:** Pathway is the current track preference (see context.md). This file is complete research kept as a fallback / in case both tracks can be entered.

---

## 1. Who Rime is

**Rime Labs**, San Francisco. Founded 2022.

- **Lily Clifford** — co-founder & CEO, Stanford NLP PhD dropout
- **Brooke Larson** — co-founder, PhD linguist, ex-Amazon Alexa (author of the "Writing for the ear" post cited in the PS)
- **Ares Geovanos** — co-founder, Stanford engineer, product veteran

**Funding:** $24M Series A, July 2026 (TechCrunch framing: helping enterprises field customer calls). Earlier $5.5M seed. Backers: Unusual Ventures, Cadenza Capital, Founders You Should Know, angels.

**Scale:** tens of millions of conversations monthly, food service through healthcare. Healthcare deployments run on Oracle Cloud Infrastructure.

**What they sell:** **text-to-speech only.** Not STT, not LLM, not orchestration. Their PS says it plainly: "Rime provides text-to-speech. Your application remains responsible for user input, speech recognition, reasoning, orchestration, state, transport, tools, safety, and evaluation."

**Wedge:** enterprise phone lines — contact centres, food service, healthcare intake. Differentiator is a proprietary in-house SF studio dataset of **full-duplex, spontaneous speech** including interruptions, laughter and vocal disfluencies.

## 2. Rime's engineering philosophy (the part most teams miss)

**They deliberately refuse SSML.** No `<break>`, no `<emotion>`, no speed tags. Their position: *the text is the interface.* Punctuation is the prosody API.

- Comma → short pause with slight rise
- Period → sentence end, falling pitch
- Question mark → rising intonation (also for surprisal and up-talk, not just questions)
- Ellipsis → hesitant / trailing pause, use sparingly
- Semicolon → between comma and period
- Interrobang `!?` → question with extra intensity; order and count are free

**"Write the mess in."** People restart, repeat, trail off, hesitate. Techniques from the guide:
- **False starts** — hyphen at the cut-off point: `Bu- but I don't wanna!`
- **Repeated function words** — `I I I just don't know.` (only short common words: I, the, we, but)
- **Filler between a repeated short word** — `the um, the` — matches real speech subtly and effectively
- **Supported interjections:** uh-huh, mmhm, um, uh, yeah, nuh-uh, whoa, mmm, nah (/næ/, vowel as in *math*), naw (/nɑ/, vowel as in *saw*), yep, yup, uh-oh, blah, ugh, hmm, huh, oo, aw, "you know"

**Register is a per-voice decision.** The system prompt should be written for the specific voice cast, and rewritten if recast. A reserved voice wants ellipses and room to breathe; an energetic voice can carry repeated words and stacked exclamation marks. "A banking agent and a food-ordering agent shouldn't share a prompt any more than they'd share a voice."

**Keep spoken sentences under 25 words**, ideally under 15.

## 3. Models (current as of Sept 2026)

| Model | Use when | Notes |
|---|---|---|
| `coda` (May 2026, flagship) | Default for new apps | 253 voices, 9 languages, sub-100ms model latency on GPU engine, word-level timestamps, `spell()`. **No** inline pronunciation control, **no** custom pauses |
| `mistv3` (Mar 2026) | Lowest time-to-first-audio (~37ms P50 in Rime's benchmark) | 78 voices, En/Fr/De/Es. Custom pauses yes, pronunciation control no |
| `mistv2` (Feb 2025) | You need `phonemizeBetweenBrackets` | 138 voices. Only family with inline phoneme override (also mistv1) |
| `mist` (Apr 2023) | Legacy | v1 deprecated |

Coda = LLM backbone + dedicated speech inference engine trained on full-duplex conversational data. Highest voice-quality scores in Rime's human evals.

## 4. API traps — verified from docs

1. **Omitting `modelId` silently serves Mist v3.** Coda is *never* the default. Set it explicitly on every request.
2. **Speed parameters invert across models — four directions, three conventions:**

| Scope | Models | Parameter | Faster | Slower |
|---|---|---|---|---|
| Whole response | Coda, Mist v3 | `timeScaleFactor` | <1.0 | >1.0 |
| Whole response (compat) | Coda, Mist v3 | `speedAlpha` | >1.0 | <1.0 |
| Whole response | Mist v2 | `speedAlpha` | <1.0 | >1.0 |
| Selected words | Mist v2, Mist v3 | `inlineSpeedAlpha` | <1.0 | >1.0 |

   `inlineSpeedAlpha` is Mist-family only (Coda does not support it). Syntax: `"This sentence is [really] [fast]"` with `"inlineSpeedAlpha": "0.5, 3"`.
3. **Unsupported speaker/model/lang combos do not reliably error** — they just sound wrong. This is what the organiser preflight check exists to catch, and using a failing combo uncorrected is a **disqualifier**.
4. A 200 response with a wrong/missing `Accept` header returns JSON with an `audioContent` field, not audio. Verify with `head -c 4 output.wav` → expect `RIFF`.
5. LiveKit docs still list `rime/arcana`; Rime's own docs no longer document Arcana. **Use the live catalog at submission time**, as the PS requires.

**Basic call:**
```
POST https://users.rime.ai/v1/rime-tts
Authorization: Bearer $RIME_API_KEY
Accept: audio/wav
{"text": "...", "speaker": "celeste", "modelId": "coda"}
```
No official npm or PyPI SDK. Starters exist for Next.js, Vite, Express, plain Node, FastAPI.

## 5. THE LATENCY CONSTRAINT (key strategic finding)

**Rime has only two regions: US-West (us-west-2) and US-East (us-east-1). No Asia endpoint.**

| Endpoint | Region |
|---|---|
| `https://users.rime.ai` | US West (default alias for users-west) |
| `https://users-west.rime.ai` | us-west-2 |
| `https://users-east.rime.ai` | us-east-1 |
| `wss://users-ws.rime.ai/ws3` | US West (recommended WS endpoint) |
| `wss://users-east-ws.rime.ai/ws3` | US East |

Rime's own RTT table only covers US metros; it calls >90ms between major US metros "a suboptimal route." From Chennai, RTT to us-west-2 is roughly **220–280ms per request** before any inference.

**Implication:** a "perceived response time" project run from a laptop in Tamil Nadu will measure terribly, and the PS gives no credit for unverified numbers. **The correct answer is architectural:** deploy the agent server in `us-west-2` so the app↔Rime hop is 1–10ms, leaving only the user↔server leg long — then optimise or disclose that separately. Alternative: **LiveKit Inference** (`rime/coda`), where the agent runs on LiveKit infra and no Rime key is needed.

Also: LiveKit's Rime plugin **defaults to HTTP**. Set `use_websocket=True` for lower latency *and* **word-level timestamps** — which are exactly what's needed to fence interrupted speech precisely.

## 6. LANGUAGE CONSTRAINT

Coda covers 9 languages but **each voice serves exactly one language**. Distribution of Coda's 253 voices:

English 162 · Spanish 40 · Japanese 13 · Portuguese 11 · German 9 · French 8 · Arabic 6 · **Hindi 2** · Italian 2

**No Tamil. No Bengali. No Telugu.**

**Unresolved contradiction:** Rime's docs say Mist v3 serves En/Fr/De/Es only; LiveKit's model table lists `hi` for `rime/mistv3`. **Must be resolved against the live catalog before building anything Indic-language.**

Live catalog endpoints (public, update as voices ship):
- `/data/voices/all-v2.json`
- `/data/voices/voice_details.json`

Starter voices confirmed working: `astra` (Coda + Mist v3), `luna` (Coda + Mist v3), `celeste` (Coda), `masonry` (Coda), `albion` (Coda), `cove` (Mist v3).

## 7. Rime PS — judging & rules

**Scoring:**
| Criterion | Weight |
|---|---|
| Problem and necessity of voice | 25% |
| Hard voice engineering | 25% |
| Rime integration and voice experience | 20% |
| Evidence and reproducibility | 20% |
| Demo clarity | 10% |

**Submission:** recorded demo ≤4–5 min (target user, normal flow, chosen hard voice problem, one deliberate stress/failure case, result, which speech provider is active) · inspectable source repo + working demo link · README with exact Rime model ID, speaker, language, endpoint, audio format, transport · **RIME_EVIDENCE.md** (hard voice claim, acceptance test, procedure, result, limitations, repeatable command) · env example with placeholders only, passing the organiser preflight.

**Disqualifiers:** no verifiable Rime integration in code · Rime used only for welcome message / final confirmation / incidental speech · static screens or scripted mock with no working product path · missing demo · exposed live credential · model/voice/language combo failing preflight and not corrected.

**Seven suggested voice problems:** perceived response time · interruption and recovery · conversation continuity during tool work · pronunciation and controlled delivery · multilingual and code-switched speech · telephony and adverse audio · expressive and persistent voice identity · (plus evaluation and observability, with separate benchmark rules).

**Recommended stack:** LiveKit Agents for realtime transport, turn handling and orchestration, with the official Rime integration streaming Rime as primary spoken output. Qwen Audio Agent is optional, for full-duplex voice frontends over long-running coding/task agents (Node 22.22.2+/24.15.0+, DashScope API key, Apache-2.0).

**Key rubric line:** *"Judges will score the shipped code and demonstrated behavior, not unsupported README claims."* Roughly 45% of the score is "did you prove it."

## 8. Competitive field — Rime's own project catalog

The PS instructs teams to review https://github.com/rimelabs/rime-dev-projects and **not submit a close reproduction**. It is almost entirely Indian student hackathon projects from **StarForge 2026 — VoxForge**:

| Project | What it does |
|---|---|
| Jan Vaani | Multilingual govt-scheme eligibility voice assistant |
| Saathi | Multilingual medication adherence calls to family |
| Vaani | Multilingual health companion, cross-session memory |
| Nuvia | Bilingual health companion, symptom logging, offline demo mode |
| AARVI | Healthcare website voice receptionist |
| EIRA | Wellness voice companion, consent before escalation |
| WageLens | Wage-protection eligibility voice assistant |
| Continuum | Multilingual commerce agent, cart survives dropped call |
| Continuum (Interview Practice) | Resumes voice session at previous stopping point |
| Roger AI | ATC training sim for pilots, cache-based latency reduction |
| FieldMate | Hands-free technician repair assistant with camera |
| NOVA | Industrial safety agent |
| VIRA | Voice safety-procedure reader |
| RoutineCraft AI | Voice timetable planner, interruptible playback |
| Rime Voice Demo (AI4 2026) | Booth demo, LiveKit agent, turn-taking + interruptions |

**Conclusion:** the "multilingual assistant helping Indian citizens with health / government / legal eligibility" space is **saturated**, and close reproduction is disqualifying.

**Empty space in the catalog:** nobody built an evaluation/observability tool for voice developers · nobody did real telephony transport (browser mic only) · nobody did a serious multi-provider benchmark. All three are explicitly valid PS directions.

## 9. Sources

- Rime PS PDF (uploaded)
- Company — https://www.rime.ai/company
- Writing for the ear — https://www.rime.ai/resources/writing-for-the-ear-prompting-your-tts-to-sound-human
- Prompting guide + drop-in system prompt — https://docs.rime.ai/docs/prompting
- Quickstart — https://docs.rime.ai/docs/quickstart-five-minute
- Models — https://docs.rime.ai/docs/models
- Voices — https://docs.rime.ai/docs/voices
- Regional endpoints — https://docs.rime.ai/docs/regional-endpoints
- Playback speed — https://docs.rime.ai/docs/speed
- LiveKit integration — https://docs.rime.ai/docs/livekit · https://docs.livekit.io/agents/models/tts/rime/
- Project catalog — https://github.com/rimelabs/rime-dev-projects
- Qwen Audio Agent — https://github.com/QwenAudio/qwen-audio-agent
- Docs index — https://docs.rime.ai/llms.txt
- Latency page — https://docs.rime.ai/docs/latency *(fetch blocked; figures above sourced from Models and Regional Endpoints pages)*
