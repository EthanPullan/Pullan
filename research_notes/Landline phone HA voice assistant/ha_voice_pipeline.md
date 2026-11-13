# Home Assistant software side: analog phone as a fully local voice assistant (VoIP integration + Assist pipeline), as of Nov 2026

Research date: 2026-11-13. Primary sources: home-assistant.io docs and blog posts, plus the current `dev` branch source of `homeassistant/components/voip` and its library `voip-utils`, which I read directly. Code facts are cited to the source file. Anything taken from code describes the dev branch in Nov 2026; released versions may lag it by one or two months.

## 1. How the HA VoIP integration works (SIP, devices, port, codecs, entities, pipeline/VAD, multiple phones, outbound calls)

### Takeaway
The built-in VoIP integration is a minimal SIP/RTP endpoint inside HA. It listens on UDP 5060 by default, speaks only the Opus codec, and turns each calling SIP endpoint into its own Assist satellite device. Each device gets an "Allow calls" switch, an Assist pipeline select and a VAD (finished-speaking) sensitivity select. Since 2025.2, HA can also ring the phone: `assist_satellite.announce` plays a looping TTS message, and `assist_satellite.start_conversation` speaks a prompt and then listens. Officially supported hardware is still essentially the Grandstream HT801/HT802 family, using only one FXS port per ATA. The integration does not use DTMF, has no ring-group or intercom features, and outbound calls can carry TTS only.

### Cited Findings
**Basics and supported hardware**
- The integration was introduced in HA 2023.5. It is an internal integration maintained by the HA project, IoT class Local Push, listed under "AI & voice > Voice assistants". — [HA VoIP integration docs](https://www.home-assistant.io/integrations/voip/)
- Supported adapters, per the docs: "Currently, the system works with the Grandstream HT801." The HT802 is "basically the same as the previously mentioned HT801" but has two phone ports, and HA "currently support[s] using only one of them." The HT812 "has been reported to work", again with only one port. — [HA VoIP docs](https://www.home-assistant.io/integrations/voip/)
- Connecting a phone "requires an adapter" (ATA). The integration options are a configurable **SIP port**, for when other VoIP software runs on the same host, and a **SIP user**, sent in the From header on outgoing calls "if required". — [HA VoIP docs](https://www.home-assistant.io/integrations/voip/); [strings.json](https://github.com/home-assistant/core/blob/dev/homeassistant/components/voip/strings.json)
- The default SIP port is `SIP_PORT = 5060` in voip-utils. HA binds a UDP datagram endpoint on all interfaces at the configured `sip_port`, falling back to 5060. — [voip-utils sip.py](https://github.com/home-assistant-libs/voip-utils/blob/master/voip_utils/sip.py); [voip `__init__.py`](https://github.com/home-assistant/core/blob/dev/homeassistant/components/voip/__init__.py)
- The current dev manifest pins `voip-utils==0.5.1`, with dependencies `assist_pipeline`, `assist_satellite`, `intent` and `network`. Code owners are `@home-assistant/core` and `@jaminh`. — [manifest.json](https://github.com/home-assistant/core/blob/dev/homeassistant/components/voip/manifest.json)

**Grandstream setup (official tutorial, "World's most private voice assistant")**
- Connect the phone to the HT801's green RJ11 port and Ethernet to the blue port. Find the ATA's IP by dialing `***` then `02` on the phone. Log in to the web UI (default admin/admin, per the page). — [HA tutorial](https://www.home-assistant.io/voice_control/worlds-most-private-voice-assistant/)
- On the FXS Port tab, set **Offhook Auto-Dial** to `*47192*168*1*100*5060`, i.e. HA's IP with `*` instead of dots, plus the port. "Offhook Auto-Dial means that when you pick up the phone, it directly calls Home Assistant." This is an IP-direct call with no PBX or SIP registration. — [HA tutorial](https://www.home-assistant.io/voice_control/worlds-most-private-voice-assistant/)
- Set **Preferred Vocoder** to OPUS, with the OPUS payload type at its default of 123. A failed test call usually means the OPUS vocoder or payload type is wrong. — [HA tutorial](https://www.home-assistant.io/voice_control/worlds-most-private-voice-assistant/)
- After adding the integration, pick up the phone to get a spoken setup message. Then enable **Allow calls** on the new device, because "Calls from new devices are blocked by default." — [HA tutorial](https://www.home-assistant.io/voice_control/worlds-most-private-voice-assistant/)
- Troubleshooting from the tutorial: if nothing works (no sound, no debug runs), check that the ATA's Status page changes Hook from "On Hook" to "In Use". If it doesn't, reboot the Grandstream. "The software is quite slow." — [HA tutorial](https://www.home-assistant.io/voice_control/worlds-most-private-voice-assistant/)

**Codecs and audio format**
- **Opus only.** voip-utils parses the SDP `a=rtpmap` lines looking only for `opus` and defaults to payload type 123 when none is found. HA's own SDP offers `opus/48000/2` on payload types 96 and 123, plus `telephone-event` types 101, 103 and 104. — [voip-utils sip.py](https://github.com/home-assistant-libs/voip-utils/blob/master/voip_utils/sip.py)
- A maintainer explained in a 2024 issue that the integration accepts only Opus, while many ATAs and IP phones offer a-law/u-law (G.711), so calls from them fail. A long-standing feature request asks for other codecs. — [GitHub #128372](https://github.com/home-assistant/core/issues/128372); [Community feature request](https://community.home-assistant.io/t/support-for-other-codecs-in-voip-integration/568580)
- Decoded audio goes to STT as 16 kHz, 16-bit, mono PCM (`RATE = 16000`, `WIDTH = 2`, `CHANNELS = 1`). — [const.py](https://github.com/home-assistant/core/blob/dev/homeassistant/components/voip/const.py)
- TTS for VoIP is requested as WAV at 16 kHz, mono, 16-bit. The integration raises an error if the WAV doesn't match. — [assist_satellite.py](https://github.com/home-assistant/core/blob/dev/homeassistant/components/voip/assist_satellite.py)

**Per-device entities**
- Each device gets:
  - an **Assist satellite** entity (`VoipAssistSatellite`), whose state shows idle, listening, processing or responding;
  - a `switch` "**Allow calls**" (config category, restored on restart, off for new devices);
  - a `select` "**Assist pipeline**" (`VoipPipelineSelect`), which chooses the pipeline per phone;
  - a `select` "**Finished speaking detection**" / VAD sensitivity (`VoipVadSensitivitySelect`), with the options default, relaxed and aggressive.
  - Sources: [select.py](https://github.com/home-assistant/core/blob/dev/homeassistant/components/voip/select.py); [switch.py](https://github.com/home-assistant/core/blob/dev/homeassistant/components/voip/switch.py); [strings.json](https://github.com/home-assistant/core/blob/dev/homeassistant/components/voip/strings.json)
- The current dev source has no `binary_sensor.py`. The component folder holds `assist_satellite.py`, `select.py`, `switch.py` and `.pcm` prompt and tone files. — [GitHub component folder](https://github.com/home-assistant/core/tree/dev/homeassistant/components/voip)
- The assist_satellite entity platform was introduced for developers in Oct 2024 (HA 2024.10). — [HA dev blog: Assist satellite entity](https://developers.home-assistant.io/blog/2024/10/01/assist-satellite-entity/)
- Audio feedback tones: a "listening" tone plays at the start of each listen cycle, a "processing" tone plays after STT ends, and an "error" tone plays on pipeline error. If the chosen pipeline lacks STT or TTS, HA plays a pre-recorded `problem.pcm`. Calls from devices that are not allowed hear `not_configured.pcm`. — [assist_satellite.py](https://github.com/home-assistant/core/blob/dev/homeassistant/components/voip/assist_satellite.py); [voip.py](https://github.com/home-assistant/core/blob/dev/homeassistant/components/voip/voip.py)

**Timing constants in the current dev code**
| Constant | Value | Meaning |
|---|---|---|
| `_PIPELINE_TIMEOUT_SEC` | 30 | pipeline timeout |
| `_HANGUP_SEC` | 2.0 | no RTP audio for 2 s means hang-up |
| `_ANNOUNCEMENT_RING_TIMEOUT` | 30 s | how long an outgoing call rings |
| `_audio_chunk_timeout` | 2.0 s | STT stream waits this long for audio, retries once, then ends |
| `_tts_extra_timeout` | 1.0 s | TTS playback must finish within its length plus 1 s |

Source: [assist_satellite.py](https://github.com/home-assistant/core/blob/dev/homeassistant/components/voip/assist_satellite.py)

**Multiple phones and ATAs**
- Each device is keyed by the caller's SIP URI (`voip_id = call_info.caller_endpoint.uri`), and a new device is auto-created per distinct caller. A Grandstream user-agent is parsed into manufacturer, model and firmware; any other user-agent is stored as the model string. — [devices.py](https://github.com/home-assistant/core/blob/dev/homeassistant/components/voip/devices.py)
- A community Asterisk deployment reports four VoIP phone identities on one HA instance, each with its own pipeline (Russian), on HA 2026.10.0. — [ha-homelab/asterisk-telephony](https://github.com/ha-homelab/asterisk-telephony)

**Outbound calls (ringing the phone)**
- HA 2025.2 release notes: "You can use assist_satellite.announce to have Home Assistant call your phone and play a message when someone picks up the phone." With an LLM-based assistant, `assist_satellite.start_conversation` "starts a conversation between Home Assistant and the user, with Home Assistant saying the first message." Starting a conversation with the default (non-LLM) agent "did not make it this release". — [HA 2025.2 release notes](https://www.home-assistant.io/blog/2025/02/05/release-20252/)
- The VoIP satellite declares the `AssistSatelliteEntityFeature.ANNOUNCE` and `START_CONVERSATION` features. On announce, HA places a SIP INVITE to the device's stored contact, rings for up to 30 s, then cancels. On pickup, the TTS announcement plays in a loop until the caller hangs up ("Plays announcement in a loop, blocking until the caller hangs up"). `start_conversation` plays the message once and then runs the pipeline. — [assist_satellite.py](https://github.com/home-assistant/core/blob/dev/homeassistant/components/voip/assist_satellite.py)
- Only TTS announcements are supported. A media file raises "VoIP does not currently support non-TTS announcements". — [strings.json](https://github.com/home-assistant/core/blob/dev/homeassistant/components/voip/strings.json); [assist_satellite.py](https://github.com/home-assistant/core/blob/dev/homeassistant/components/voip/assist_satellite.py)
- Timers set by voice on a phone are announced by HA calling the phone back (`voip_announce_timer`). — [assist_satellite.py](https://github.com/home-assistant/core/blob/dev/homeassistant/components/voip/assist_satellite.py)
- HA 2025.7 added an "Ask Question" action, which asks a question on a satellite and matches the answer. A forum thread reports that `start_conversation` initially worked "for VOIP only" before other satellites gained it in 2025.4. These are forum claims and not verified. — [Notebookcheck on 2025.7](https://www.notebookcheck.net/Home-Assistant-2025-7-release-brings-new-Ask-Question-action.1050219.0.html); [Community thread](https://community.home-assistant.io/t/assist-satellite-start-conversation-shows-no-target-what-kind-of-magic-do-i-need/862455)
- Announce targets can be an entity, device, area, floor or label. One user reported that firing two announcements back to back silenced the second, so wait for the first to finish. — [Announce action docs](https://www.home-assistant.io/actions/assist_satellite.announce/); [dev.to write-up](https://dev.to/clarkbw--/no-audio-from-the-home-assistant-nabu-puck-use-assistsatelliteannounce-li3)

### Inferences
- For one phone on one HT801, the built-in integration is the simplest fully local path. The integration itself makes no cloud calls; the pipeline decides what is local.
- **Outbound calls need the device to have called HA first**, so HA has a stored contact. The code dials `self.voip_device.contact`. So pick up and call HA once after setup before relying on announcements.
- **Because announcements loop until hang-up, use them for alarms and doorbell alerts.** A plain "FYI" message keeps repeating until someone hangs up. For a single spoken message followed by a voice reply, `start_conversation` fits better.
- **Expanding later is easy: add more single-port ATAs**, such as one HT801 per phone, or use an HT802 with only one port wired. Each becomes a separate device with its own pipeline. Two handsets on one RJ11 line share one device.
- **The 30 s ring timeout is hard-coded.** Changing it needs a custom component.
- **Streaming TTS gives no benefit over the phone.** HA's 2025 streaming-TTS improvement lets Piper start speaking about 0.5 s in for streaming satellites, but VoIP's `_send_tts` joins all TTS chunks before sending (`data = b"".join(...)`). Long LLM answers therefore add their full TTS synthesis time before you hear anything.

### Gaps
- I couldn't find an official statement on whether the HT802/HT812 second port now works; the docs still say one port. Two ports would likely present as two SIP URIs, but this is unverified.
- I didn't confirm which HA release first shipped the 2.0 s hang-up and other fixes now on dev (see Section 5).
- I didn't confirm which release made `start_conversation` work with the default (non-LLM) Assist agent. The 2025.2 notes say it wasn't included; later notes weren't checked.
- I believe older versions (2023.x) had a "call in progress" binary sensor that the assist_satellite state replaced, but I couldn't confirm when it was removed. Check before referencing it in docs or automations.

## 2. Alternative: Asterisk/FreePBX bridged to HA, and when it is worthwhile

### Takeaway
Use a PBX (Asterisk/FreePBX) when you want multiple extensions, phone-to-phone intercom, DTMF menus, a real dial tone with choice of destination, G.711-only devices, or SIP-trunk calls. HA's VoIP integration can still be the Assist endpoint behind the PBX, reached by dialing an extension, but the PBX must transcode G.711 to Opus. A newer HACS integration, "VoIP Stack" (2026), turns HA itself into a SIP registrar with a phonebook, DTMF and IVR, a lighter alternative to running Asterisk. Both PBX-side projects are community software and young.

### Cited Findings
- A feature request notes that the HA VoIP integration is effectively Grandstream-only and proposes Asterisk as a bridge; the thread reports partial success. — [Community: Add asterisk support to voip](https://community.home-assistant.io/t/add-asterisk-support-to-the-voip-integration/791436)
- There is a FreePBX community guide to connecting HA's VoIP integration to FreePBX, and a guide to outbound TTS phone calls through Asterisk, a Fritz!Box and a SIP trunk. — [FreePBX community guide](https://community.freepbx.org/t/installing-and-configuring-voice-over-ip-for-home-assistant-connecting-to-freepbx/107798); [HA community: outbound TTS calls with Asterisk](https://community.home-assistant.io/t/how-did-i-set-up-outbound-tts-phone-calls-in-home-assistant-with-asterisk-fritz-box-vodafone/997693)
- **TECH7Fox asterisk-hass-integration** (upstream v1.0.5) is a HACS integration connecting HA to Asterisk via AMI. For DTMF it says to change DTMF signalling in FreePBX, and intercom use needs "SIP-INFO DTMF-Relay". — [TECH7Fox/asterisk-hass-integration](https://github.com/TECH7Fox/asterisk-hass-integration)
- **ha-homelab/asterisk-telephony** (0.8.0b5 beta, 0 stars, tested on HA 2026.10.0) builds on TECH7Fox. — [ha-homelab/asterisk-telephony](https://github.com/ha-homelab/asterisk-telephony)
  - Assist is reached by dialing extension 630 through HA's VoIP integration.
  - It warns: "Working AMI does not prove that Assist works", because Assist needs a G.711-to-Opus transcoder and a live call test.
  - Its DTMF example only fires an HA notification and is disabled by default; dialing 641 toggles a saved alarm.
  - It includes a pair-call script (ring 201, then connect 202) and dashboards with call status.
- **VoIP Stack** (HACS plus ESPHome components, by meconiotech; first posted July 2026, stable 2026.10.0 announced Sept 27, 2026; requires HA ≥ 2026.7.0): — [Community: VoIP stack for HA and ESPHome](https://community.home-assistant.io/t/voip-stack-for-home-assistant-and-esphome/1016178)
  - HA acts as a local SIP registrar on port 5060, with a phonebook covering SIP accounts, ESP devices, Assist, groups and automation contacts.
  - DTMF uses RFC 4733 or SIP INFO for choosing an extension, and in-call DTMF can trigger automations (earlier flagged experimental). Acoustic in-band DTMF is not decoded.
  - Audio codecs are PCMA/G.711, L16 and Opus.
  - Any Assist pipeline can be a phone destination. Automations can act as dialplan, IVR menus and forwarding rules. It also supports intercom, ring groups and conferences.
  - Limits: plaintext SIP/RTP (no SRTP), no ICE/STUN/TURN, no recording, no full hold/resume.
- Asterisk AudioSocket streams 16-bit 8 kHz mono PCM, with only audio and DTMF frames transmitted. DTMF support is in Asterisk 20/21/22. I found no ready-made AudioSocket-to-HA-Assist bridge. — [Asterisk AudioSocket docs](https://docs.asterisk.org/Asterisk_20_Documentation/API_Documentation/Dialplan_Applications/AudioSocket/); [CyCoreSystems/audiosocket](https://github.com/CyCoreSystems/audiosocket)
- Asterisk has supported Opus since version 14. — [Wikipedia: Asterisk](https://en.wikipedia.org/wiki/Asterisk_(PBX))
- A 2026 issue reporter saw VoIP dead-air problems through an Asterisk/mobile path that were helped by a longer hang-up timeout (see Section 5). — [GitHub #175718](https://github.com/home-assistant/core/issues/175718)

### Inferences
- **For "one phone now, expand later":** start with HT801 → HA VoIP direct (Offhook Auto-Dial). Move to a PBX only when you need any of these:
  - phones calling each other, or intercom/paging;
  - a dial tone with dialed codes (e.g., `1` = Assist, `2` = kitchen, `*41` = scene);
  - more than about 2–3 phones you want to manage centrally;
  - a real landline or VoIP trunk, e.g. to forward doorbell calls to a cell phone.
- **A PBX adds complexity.** You run another service or VM, Opus transcoding to HA (Asterisk needs `codec_opus`), and your ATA registers to the PBX instead of auto-dialing HA. Then the PBX, not HA, sees "who is calling".
- **VoIP Stack may be the lowest-effort route to DTMF and multi-extension** without Asterisk, but it is a single-author custom integration a few months old.
- **"Assist Microphone"** — the `wyoming-satellite`/"Assist Microphone" add-on is for a USB microphone on the HA host, not for telephony. I found no evidence it is used for phones.

### Gaps
- I couldn't verify the FreePBX guide's details (dialplan, trunk settings) without fetching it.
- I found no benchmarks comparing latency of PBX-bridged Assist versus a direct ATA.
- I found no maintained AudioSocket ↔ Wyoming/Assist bridge project.

## 3. DTMF keypad input

### Takeaway
The built-in HA VoIP integration does **not** expose DTMF. It offers telephone-event in its SDP but silently drops non-Opus RTP packets, including RFC 4733 DTMF events, and there are no DTMF events or entities. For speed-dial-style automations, use voice commands, ATA-side tricks, a PBX (Asterisk/FreePBX AMI events), or the VoIP Stack custom integration.

### Cited Findings
- voip-utils `datagram_received` catches `RtpError` and ignores the packet. The code comment says "Our own SDP offers telephone-event payload types alongside OPUS, so a phone sending DTMF is expected rather than exceptional." No DTMF is surfaced to HA. — [voip-utils voip.py](https://github.com/home-assistant-libs/voip-utils/blob/master/voip_utils/voip.py)
- HA's SDP includes `a=rtpmap:101 telephone-event/48000`, `103 telephone-event/16000` and `104 telephone-event/8000`, plus `Accept: application/sdp, application/dtmf-relay`. — [voip-utils sip.py](https://github.com/home-assistant-libs/voip-utils/blob/master/voip_utils/sip.py)
- No VoIP-integration source file (`select.py`, `switch.py`, `assist_satellite.py`) defines DTMF handling. — [GitHub component folder](https://github.com/home-assistant/core/tree/dev/homeassistant/components/voip)
- VoIP Stack supports RFC 4733 and SIP-INFO DTMF for extension selection and in-call automations, but not acoustic in-band tones. — [Community: VoIP stack](https://community.home-assistant.io/t/voip-stack-for-home-assistant-and-esphome/1016178)
- With Asterisk, DTMF reaches HA through the TECH7Fox AMI integration. FreePBX DTMF signalling may need changing, with SIP-INFO DTMF-Relay for intercom. — [TECH7Fox/asterisk-hass-integration](https://github.com/TECH7Fox/asterisk-hass-integration); [ha-homelab/asterisk-telephony](https://github.com/ha-homelab/asterisk-telephony)

### Inferences
- **Workarounds without a PBX:**
  1. Custom sentences or intents that are short and memorable, e.g. "one", "goodnight". Speech-to-Phrase handles these fast and reliably. Short single words can be risky for Whisper.
  2. Turn off Offhook Auto-Dial so dialing is required, and use the Grandstream dial plan to map codes to different SIP destinations. All of them still reach HA as the same device, though, so this doesn't distinguish codes. Whether different `To` users arrive separately is unverified.
  3. Run an Asterisk/FreePBX or VoIP Stack layer that turns digits into HA events.
- Leaving Offhook Auto-Dial on (hot-line) gives the most "assistant-like" experience: lift the handset and talk.

### Gaps
- No official HA roadmap item for DTMF in the VoIP integration was found.
- I didn't verify whether HT801 dial-plan routing to different SIP user parts would create distinct HA devices (`voip_id` = caller URI, so probably not).

## 4. Fully local pipeline: Wyoming, STT (Speech-to-Phrase / faster-whisper), Piper, local LLM vs. built-in intents; hardware and latency; 8 kHz telephone audio

### Takeaway
The standard fully local stack is Wyoming add-ons for STT and TTS plus HA's built-in conversation agent, optionally with a local LLM via Ollama or llama.cpp.
- **STT:** Speech-to-Phrase is fastest (about 150 ms on a Pi 5) but recognizes only a closed set of commands. faster-whisper is open-ended but slow on a Pi (around 8 s on a Pi 4). It is usable on an N100 with small/int8 models and very fast on a GPU.
- **TTS:** Piper is fast everywhere.
- **Local LLM:** needs a GPU machine for good latency. A 4B model gives roughly 150 ms warm on an RTX 5080; 14B models are much more accurate. CPU-only LLM prefill takes seconds.

On telephony audio: HA's VoIP path uses Opus, not G.711. The ATA-to-HA leg is therefore wideband-capable and HA hands STT 16 kHz audio. The analog handset/line portion still limits bandwidth, and published benchmarks show Whisper degrades significantly on real phone audio. A closed-vocabulary recognizer (Speech-to-Phrase) is more robust for home control.

### Cited Findings
**Local options (official)**
- HA's local guide lists three options, and requires HA OS for this setup: — [HA: local voice assistant guide](https://www.home-assistant.io/voice_control/voice_remote_local_assistant/)
  - Speech-to-Phrase, a "close-ended speech model", fast but handling only some Assist commands (no shopping list or timer names out of the box);
  - Whisper, an "open-ended speech model" for powerful hardware or LLM agents;
  - Piper, "a fast, local neural text-to-speech system … optimized for the Raspberry Pi 4".
- Official performance figures:
  - Speech-to-Phrase transcribes in under 1 s on HA Green or Pi 4;
  - Whisper takes about 8 s on a Pi 4 and under 1 s on an Intel NUC;
  - Piper generates 1.6 s of speech per second on a Pi (medium models).
  - Installed add-ons are discovered via the Wyoming integration.
  - Source: [HA: local voice assistant guide](https://www.home-assistant.io/voice_control/voice_remote_local_assistant/)
- Speech-to-Phrase announcement (Voice chapter 9, Feb 2025): under 1 s on Green or Pi 4, and "Raspberry Pi 5 processes commands seven times faster", about 150 ms per command. It supports a subset of Assist commands. — [HA blog: Speech-to-Phrase](https://www.home-assistant.io/blog/2025/02/13/voice-chapter-9-speech-to-phrase/)
- Voice chapter 11 (Oct 2025): — [HA blog: Voice chapter 11](https://www.home-assistant.io/blog/2025/10/22/voice-chapter-11)
  - Streaming TTS cut time to first speech from over 5 s to about 0.5 s for Piper and HA Cloud ("A 10x improvement in latency!").
  - A fuzzy matcher for the built-in agent (English only).
  - Up to two wake words and pipelines per satellite.
  - Speech-to-Phrase works with the Ask Question action fully offline.
  - The post has no VoIP-specific changes.

**Local LLM**
- The Ollama integration adds a conversation agent that talks to a separate Ollama server. Device control is via tools on exposed entities only and is labeled experimental. — [HA Ollama integration](https://www.home-assistant.io/integrations/ollama/)
  - Models must support Tools.
  - HA defaults the context window to 8k tokens, versus Ollama's 2k.
  - The docs recommend exposing fewer than 25 entities, and note that smaller models make more mistakes.
- Independent measurements (Aug 2026), on an RTX 5080 16 GB and a Ryzen 7 7800X3D, using llama.cpp: — [TechFuel HQ, 2026](https://techfuelhq.com/tutorials/home-assistant-local-llm-voice-2026/)

  LLM, warm, on the GPU:
  | Model | Warm latency | VRAM | Accuracy (24 commands) |
  |---|---|---|---|
  | Llama-3.2-3B | 126 ms | — | 70.8% |
  | Qwen3-4B-2507 | 144 ms | 3.9 GB | 83.3% |
  | Qwen2.5-7B | 291 ms | — | 87.5% |
  | Qwen2.5-14B | 371 ms | 10 GB | 95.8% |

  faster-whisper (beam 1, synthesized speech):
  | Model | GPU | CPU |
  |---|---|---|
  | tiny-int8 | 46 ms | 253 ms |
  | base-int8 | 69 ms | 475 ms |
  | small-int8 | 99 ms | 1,401 ms |

  - Piper `en_US-lessac-medium` on CPU takes 93–315 ms (real-time factor 0.03–0.07).
  - CPU-only LLM prefill of about 2,100 tokens takes "seconds, not milliseconds".
  - Recommendations: on a Pi or HA Green, use the default agent with Speech-to-Phrase; an N100 is a good HA host, but put the LLM on a separate machine; avoid 3B models for locks, since they generated whole-house off commands.
- Community 2026 build logs estimate Whisper small-int8 on an N100 CPU at about 1–3 s per short command. This is secondary and estimated, not measured officially. — [Smart Home Field Guide 2026 build log](https://smarthomefieldguide.com/blog/local-voice-assistant-home-assistant-build-log/); [maloyan.xyz 2026](https://maloyan.xyz/blog/home-assistant-local-voice-stack-2026)
- A common pattern is Speech-to-Phrase first with Whisper as fallback. One user measured almost no overhead when Speech-to-Phrase succeeded. — [maloyan.xyz 2026](https://maloyan.xyz/blog/home-assistant-local-voice-stack-2026)

**Telephone audio and STT accuracy**
- HA's VoIP integration negotiates Opus at 48 kHz in SDP and decodes to 16 kHz mono for STT. It does not use 8 kHz G.711 when talking to the ATA directly. — [voip-utils sip.py](https://github.com/home-assistant-libs/voip-utils/blob/master/voip_utils/sip.py); [const.py](https://github.com/home-assistant/core/blob/dev/homeassistant/components/voip/const.py)
- Grandstream HT80x supports G.711, G.722, G.723.1, G.729A/B, G.726, iLBC and OPUS, plus "advanced line echo cancellation". — [Grandstream HT80x Admin Guide](https://documentation.grandstream.com/wp-content/uploads/2023/08/HT80x_Admin_Guide.pdf)
- Whisper on real phone audio, from vendor benchmarks (treat as directional):
  - AssemblyAI: Whisper large-v3 scores 2.7% WER on clean speech versus 17.7% on call-center phone recordings. — [AssemblyAI](https://assemblyai.com/blog/comparing-speech-to-text-apis-on-phone-call-transcription)
  - Cohere: Whisper large-v3 scores 13.5% WER on 8 kHz calls. — [dev.to on Cohere](https://dev.to/jim_l_efc70c3a738e9f4baa7/cohere-just-open-sourced-a-542-wer-speech-model-heres-what-testing-it-on-real-audio-showed-5e3n)
  - Deepgram: a median WER around 42.9 on phone calls, with hallucinations. — [Deepgram](https://deepgram.com/blog/whisper-v3-results)
  - The three benchmarks conflict significantly.
- HA's own guide warns that local STT quality varies considerably by language. — [HA local guide](https://www.home-assistant.io/voice_control/voice_remote_local_assistant/)

### Inferences
- **The analog leg sets audio quality, not the codec.** The RJ11 run from handset to ATA is analog; old carbon or electret handset microphones and the ATA's FXS hybrid typically pass about 300–3400 Hz. So even with Opus, expect near-narrowband content: resampling cannot restore frequencies above 4 kHz. Your own house wiring between phone and ATA adds little loss over short runs. These are general telephony knowledge, not sourced.
- **Best accuracy on phone audio:**
  1. Speech-to-Phrase (closed vocabulary, from your entities and sentences) for device control. It is very robust because it only matches known phrases.
  2. faster-whisper `small`/`small.en`, `medium.en` or `large-v3-turbo` on GPU or N100+ for open-ended speech. Avoid `tiny`/`base` on phone audio. `*.en` models generally do better for English-only use (general knowledge).
- **Suggested tiers:**
  - **Pi 5 / HA Green:** Speech-to-Phrase + Piper + built-in agent. Expect roughly 1–2 s end-to-end after you stop speaking, mostly VAD wait plus TTS synthesis and playback. No LLM.
  - **N100 mini PC:** Speech-to-Phrase, plus Whisper small-int8 as fallback (about 1–3 s), Piper, and the built-in agent. An optional LLM should run on another GPU box.
  - **GPU box (≥ 8–16 GB VRAM):** Whisper `large-v3-turbo` or `medium`, plus a 7B–14B local LLM via Ollama or llama.cpp with "prefer handling commands locally" turned on, plus Piper. Under 1 s compute is achievable, but VoIP's non-streaming TTS adds the full synthesis time for long LLM replies.
- **Keep LLM answers short over the phone.** VoIP doesn't stream TTS (Section 1), and announcements loop.
- HA's built-in intent matching plus Speech-to-Phrase is the most reliable and fastest fully local choice for home control over a phone. A local LLM mostly adds open-ended Q&A.

### Gaps
- No measured STT accuracy on HT801/Opus phone audio specifically was found.
- I didn't verify from an official 2026 page the "Prefer handling commands locally" setting (an LLM fallback to the built-in agent first), believed added around late 2024 or early 2025. Its name and behavior should be confirmed.
- I found no official N100 benchmark for Speech-to-Phrase or Whisper.
- I didn't check whether newer local STT engines in Wyoming add-ons, such as NVIDIA Parakeet or Vosk, are officially supported in 2026.

## 5. Known issues: latency, echo, audio levels, pipeline timeouts, forum/GitHub reports and fixes

### Takeaway
The most-reported problems:
1. Codec mismatch: the device isn't sending Opus.
2. Regressions around 2024.10, when VoIP moved to the assist_satellite platform.
3. A 2026 bug where calls connect but give "dead air" after a caller hangs up mid-pipeline, needing a Core restart. Fixes for the dead-air bug appear in current dev code (hang-up timeout raised to 2.0 s, pipeline-task cleanup) but were still tracked as open in Oct 2026.
4. A Core crash on calls in 2025.7.

Echo and level issues are handled on the ATA side; no HA-side gain controls exist.

### Cited Findings
- **2024.10 breaks VoIP** ([GitHub #128372](https://github.com/home-assistant/core/issues/128372); [Community thread](https://community.home-assistant.io/t/2024-10-breaks-voip-integration/781895)):
  - An HT801 user reports the setup worked through 2024.9.3 and broke on 2024.10.1/10.2, and says it was still broken through 2025.1.4 (forum).
  - The maintainer's response in the GitHub issue concerned Opus-only codec support.
- **Two beeps but no response:** an HT801 user gets two beeps and a status flipping between listening and idle, with no response, while the phone app works. — [Community: Help with VOIP and Grandstream](https://community.home-assistant.io/t/help-with-voip-and-grandstream-configuration/821450)
- **Core crash on VoIP call** (2025.7.0, softphone/Grandstream): closed as not planned. — [GitHub #148123](https://github.com/home-assistant/core/issues/148123)
- **"Invalid SIP header"** with a 3CX trunk. — [GitHub #135552](https://github.com/home-assistant/core/issues/135552)
- **Dead air after mid-pipeline hang-ups** ([GitHub #175718](https://github.com/home-assistant/core/issues/175718)):
  - Reported on 2026.7.1 (Pi 4, voip-utils 0.4.0) and also seen on 2026.9.1.
  - After callers hang up during STT, intent or TTS, later calls connect at the SIP level but no pipeline runs, until Core restarts.
  - Proposed causes:
    - `_run_pipeline_task` was not cleared on disconnect;
    - the listening tone sat outside `try/finally`;
    - a sender-task race in voip-utils;
    - the RTP 16-bit sequence counter overflowed, causing `struct.error` and silent outbound audio;
    - `_HANGUP_SEC = 0.5` was too aggressive over Asterisk/mobile paths, and raising it to 2.0 fixed one user.
  - Related fix PRs: voip-utils #65 (sequence-number mask) and #59 (sender race), and core #182987 (linked, open).
  - The issue was still open; the assignee unassigned on Oct 15, 2026.
- The current dev code has `_HANGUP_SEC: Final = 2.0` and clears `_run_pipeline_task` only if it is the current task. The manifest pins `voip-utils==0.5.1` (newer than the 0.4.0 in the report). This suggests the fixes have landed on dev. — [assist_satellite.py](https://github.com/home-assistant/core/blob/dev/homeassistant/components/voip/assist_satellite.py); [manifest.json](https://github.com/home-assistant/core/blob/dev/homeassistant/components/voip/manifest.json)
- **Pipeline timing behavior:**
  - When no audio arrives, STT ends after 2 s plus one retry of 2 s.
  - The pipeline timeout is 30 s.
  - Missing RTP for 2 s is treated as a hang-up.
  - TTS that takes longer than its length plus 1 s raises "TTS timeout".
  - Source: [assist_satellite.py](https://github.com/home-assistant/core/blob/dev/homeassistant/components/voip/assist_satellite.py)
- **Echo:** Grandstream HT80x has built-in "advanced line echo cancellation". I found no HA forum report specifically on echo or gain tuning for Assist. — [Grandstream HT80x Admin Guide](https://documentation.grandstream.com/wp-content/uploads/2023/08/HT80x_Admin_Guide.pdf)
- **ATA reliability:** the HA tutorial notes the Grandstream UI is slow and sometimes needs a reboot when hook status stops updating. — [HA tutorial](https://www.home-assistant.io/voice_control/worlds-most-private-voice-assistant/)
- **No streaming TTS:** VoIP builds the full TTS WAV before sending, so streaming TTS gives no benefit. — [assist_satellite.py](https://github.com/home-assistant/core/blob/dev/homeassistant/components/voip/assist_satellite.py)

### Inferences
- **Practical mitigations:**
  - Keep HA current; the 2026 dead-air fixes appear to be on dev.
  - If dead air occurs, an automation that reloads the VoIP config entry is a cheaper stopgap than a full restart.
  - Force OPUS as the first and only vocoder on the ATA.
  - Use the "relaxed" VAD setting if commands are cut off and "aggressive" if responses are slow to start.
  - Adjust HT801 FXS TX/RX gain if STT mishears quiet speech, and keep echo cancellation on.
  - Prefer Speech-to-Phrase on low-power hosts to avoid long silences that feel like timeouts.
  - Wait for each announcement to finish before sending another.
- **Latency budget on a phone:**
  - ATA to HA network: negligible on the LAN.
  - VAD end-of-speech wait: about 0.5–1 s, depending on the sensitivity setting.
  - STT: 0.15 s with Speech-to-Phrase on a Pi 5, up to about 8 s with Whisper on a Pi 4.
  - Intent: about 0 for built-in, 0.15–1 s for a GPU LLM, several seconds for a CPU LLM.
  - Full TTS synthesis, plus the processing tone, before playback.

### Gaps
- I couldn't confirm which HA release (2026.10 or 2026.11) first shipped the dead-air fixes.
- I found no quantitative HA-forum data on end-to-end phone latency.
- No HA-side audio gain or auto-gain setting exists for VoIP that I could find. Whether the pipeline's audio-enhancement settings (noise suppression / auto gain) apply to VoIP was not verified.
- I found no US/Canada-specific issues, e.g. ring cadence or caller-ID settings on the HT801 (FXS defaults for North America), in HA sources.
