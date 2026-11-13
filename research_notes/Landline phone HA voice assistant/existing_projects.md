# Existing DIY projects: landline / vintage phone as a Home Assistant voice assistant

Research date: 2026-11-13. About 18 search/fetch calls. Reddit pages could not be fetched (403 through mirrors), so Reddit items come from search snippets only and are flagged as such.

## Catalog of documented projects (summary table)

| # | Project / author | Date | Phone | Hardware approach | Hook detection | Dial/keypad use | Pipeline | Link |
|---|---|---|---|---|---|---|---|---|
| 1 | Official HA "World's most private voice assistant" (Nabu Casa / HA team) | Apr 27, 2023 (HA 2023.5) | Any RJ11 analog phone (demo video by TheFes uses a Heemaf type 1955 phone) | Grandstream HT801 ATA + HA built-in VoIP integration (SIP/RTP, Opus) | ATA "Offhook Auto-Dial" calls HA when handset lifted | Not used (auto-dial on lift) | Cloud or local (any Assist pipeline) | [Tutorial](https://www.home-assistant.io/voice_control/worlds-most-private-voice-assistant/), [Blog](https://home-assistant.io/blog/2023/04/27/year-of-the-voice-chapter-2) |
| 2 | SmartHomeScene guide (author "SHS") | Dec 11, 2023 | 3 old analog phones borrowed from friends | Grandstream HT801 (HT802 one port) + VoIP integration | Off-hook auto-dial | Not used | Fully local: Whisper + Piper add-ons, HA conversation agent | [Guide](https://smarthomescene.com/guides/voice-calling-home-assistant-with-an-old-phone) |
| 3 | "Tabletop Phone Voice Assistant", Tobias Dyballa (t0bit0bsen), HA Voice Assistant Contest | Mar 5, 2024 | Old German desk phone (repo name "FeTAp") | Self-contained: ESP32 (az-delivery-devkit-v4) + I2S mic + 3W I2S amp driving original speaker, ESPHome | Hook switch wired to ESP32 GPIO | Each key exposed as an HA switch for automations | ESPHome voice_assistant into HA pipeline | [Forum](https://community.home-assistant.io/t/tabletop-phone-voice-assistant/699589), [GitHub](https://github.com/t0bit0bsen/Voice-Assistant-FeTAp), [Video](https://youtu.be/hVT-VVcIVyE) |
| 4 | Reddit r/homeassistant "ESPHome-based retro voice assistant" (snippet only) | Apr 26, 2025 | Rotary phone | ESP inside the handset with I2S mic + speaker; ESP powered over spare cord wires | Handset (hook) contact switch | Rotary dial contacts wired to ESP | HA pipeline; commenter notes host hardware limits TTS models | [Reddit mirror](https://reddit.birdcat.cafe/r/homeassistant/comments/1k8ijf3/esphomebased_retro_voice_assistant) (not fetched; via search snippet) |
| 5 | Analog Redial (GitHub sdylewski; article by Ananthu Ashok, ElectronicsForU) | Article Nov 3, 2026 | Rotary and touch-tone phones | ESP32-C6 + ES8388 codec + 1-2 Silvertel AG1171 SLIC modules (real phone line emulation: loop current, ring, hook detect) | SLIC hook detection | Dial plan maps dialed numbers to actions; DTMF/rotary | SIP (Asterisk/FreePBX); HA via MQTT/webhooks (experimental). Not natively an Assist satellite | [ElectronicsForU](https://www.electronicsforu.com/?p=207039), [GitHub](https://github.com/sdylewski/Analog-Redial) |
| 6 | weeBell "personal central office for POTS phones" (Hackaday.io) | (date not confirmed) | POTS phones | ESP32 + AG1171 SLIC | SLIC | Rotary + DTMF decoding | Not HA-specific | [Hackaday.io](https://hackaday.io/project/191002-weebell-personal-central-office-for-pots-phones) |
| 7 | FreePBX + HA VoIP, Gregory West | Oct 1, 2025 | Any phones on PBX | FreePBX PJSIP trunk to HA (Opus only) | Phone dials speed-dial/extension 4663 | Dialing selects HA | HA Cloud in author's case | [FreePBX forum](https://community.freepbx.org/t/installing-and-configuring-voice-over-ip-for-home-assistant-connecting-to-freepbx/107798) |
| 8 | VoIP Stack (n-IA-hane/esphome-intercom), HACS SIP PBX inside HA | Stable 2026.11.0 (Nov 2026) | SIP desk phones, ATAs as SIP clients, ESP32 room phones | PBX in HA: ring groups, extensions, Assist as dialable extension | Depends on endpoint | Extensions, keypad menus via automations | Any Assist pipeline | [GitHub](https://github.com/n-IA-hane/esphome-intercom), [Forum](https://community.home-assistant.io/t/voip-stack-for-home-assistant-and-esphome/1016178) |
| 9 | RotaryCell (fregacmols / "Evilroot") — related, not HA | Hackaday Sep 5, 2026 | Unmodified rotary phone | SLIC module + Lilygo ESP32-S3 + cellular modem; emulates North American line incl. dial tone and bell | SLIC | Rotary dialing | No HA | [Hackaday](https://hackaday.com/2026/09/05/free-your-rotary-telephone-from-its-wire/), [GitHub](https://github.com/fregacmols/RotaryCell) |

## What are the most-cited/popular builds and who made them?

### Takeaway
The dominant, most-cited approach is the official Home Assistant "World's most private voice assistant" (April 2023): an analog phone plugged into a Grandstream HT801 ATA that auto-dials HA's built-in VoIP integration on off-hook. Nearly every third-party guide (e.g., SmartHomeScene) copies this recipe. The best-documented self-contained ESP32 build is Tobias Dyballa's ESPHome "Tabletop Phone" (March 2024).

### Cited Findings
- HA introduced the VoIP integration in "Year of the Voice – Chapter 2" (Apr 27, 2023), calling the analog phone "the world's most private voice assistant": it listens only when you pick up, and only you hear the reply. Initial focus was the Grandstream HT801; "no need for an extra server"; each VoIP adapter can get its own pipeline (e.g., per language). — [HA blog](https://home-assistant.io/blog/2023/04/27/year-of-the-voice-chapter-2)
- Official tutorial requirements: HA 2023.5+, HA OS, any RJ11 analog phone, HT801 (+5V PSU, Ethernet), RJ11 cable, a cloud or manually configured local pipeline; optional OpenAI personality. The page mentions a video by TheFes using a Heemaf type 1955 phone. — [HA tutorial](https://www.home-assistant.io/voice_control/worlds-most-private-voice-assistant/)
- Grandstream settings from the tutorial: FXS Port tab > Offhook Auto-Dial = `*47192*168*1*xx*5060` style (HA IP with `*` instead of dots, then SIP port 5060); Preferred Vocoder must include OPUS with OPUS payload type 123 (default). Find ATA IP by dialing `***` then `02`. Default web login admin/admin. — [HA tutorial](https://www.home-assistant.io/voice_control/worlds-most-private-voice-assistant/)
- In HA, calls from a new device are blocked until you enable "Allow calls" on the device. — [HA tutorial](https://www.home-assistant.io/voice_control/worlds-most-private-voice-assistant/)
- Supported adapters per integration docs: HT801; HT802 (only one of its two ports usable); HT812 reported to work (same one-port limit). Integration lets you change its listening SIP port and set a SIP user for the From header on outgoing calls. — [VoIP integration docs](https://www.home-assistant.io/integrations/voip)
- SmartHomeScene (Dec 11, 2023) reproduced the build fully local: Whisper + Piper add-ons, HA conversation agent, no wake word, VoIP "finished speaking detection" set to Relaxed. Reported latency: Raspberry Pi 4 about 8-9 s per command vs about 1 s on a Beelink N100 mini PC. Picking up plays a confirmation tone and a "Call in progress" entity turns on. — [SmartHomeScene](https://smarthomescene.com/guides/voice-calling-home-assistant-with-an-old-phone)
- Tobias Dyballa's ESPHome tabletop phone (HA Voice Assistant Contest, Mar 5, 2024): ESP32 dev board wired to phone keys and switches; original mic replaced by I2S mic; original speaker driven by 3W I2S amp; bell driven via DC-DC converter supplying 8V to the original circuit; lift handset to start listening, hang up to stop; after the first command it switches to wake-word mode; RGB LED status. — [HA forum](https://community.home-assistant.io/t/tabletop-phone-voice-assistant/699589); code [GitHub](https://github.com/t0bit0bsen/Voice-Assistant-FeTAp); video [YouTube](https://youtu.be/hVT-VVcIVyE)

### Inferences
- For a US/Canada touch-tone user with a local pipeline, the HT801/HT802 + VoIP integration route is the lowest-effort, best-documented path and is officially maintained by HA.
- Latency is dominated by STT hardware; a Pi 4 host is a poor fit, an x86 mini PC is much better.

### Gaps
- Could not find the TheFes YouTube video URL or view counts; popularity is inferred from citation frequency, not metrics.
- Reddit threads could not be fetched (403); details for the Apr 2025 "ESPHome-based retro voice assistant" come from search snippets only.

## Which approaches use the house's existing phone wiring vs. a self-contained phone?

### Takeaway
ATA-based (Grandstream) and SLIC-based (Analog Redial, weeBell) builds present a real analog line (FXS) and so can feed existing in-house phone wiring; ESP32-inside-the-phone builds are self-contained and bypass phone wiring entirely (Wi-Fi + USB/DC power).

### Cited Findings
- ATA approach: phone connects to the HT801's RJ11 (green) port; ATA connects to the LAN by Ethernet. — [HA tutorial](https://www.home-assistant.io/voice_control/worlds-most-private-voice-assistant/)
- SLIC approach: Analog Redial uses Silvertel AG1171 SLIC modules to supply loop current, ring signals and handset detection, generates dial tone, rings mechanical bells, supports rotary and touch-tone, intercom between two handsets on one board without internet, and SIP to Asterisk/FreePBX. HA integration via MQTT/webhooks is experimental. MIT licensed, KiCad + ESP-IDF. — [ElectronicsForU, Nov 3, 2026](https://www.electronicsforu.com/?p=207039)
- weeBell: ESP32 + AG1171 "personal central office for POTS phones" — ring bell, audio, decode rotary and DTMF. — [Hackaday.io](https://hackaday.io/project/191002-weebell-personal-central-office-for-pots-phones)
- RotaryCell emulates a North American subscriber line (dial tone, ringing the bell) with a SLIC + ESP32-S3; phone stays unmodified. — [Hackaday, Sep 5, 2026](https://hackaday.com/2026/09/05/free-your-rotary-telephone-from-its-wire/)
- Self-contained: Dyballa's build puts ESP32, I2S mic and I2S amp inside the phone; he noted long I2S cables were unreliable and used Ethernet cable with dedicated CLK/LR lines. — [HA forum](https://community.home-assistant.io/t/tabletop-phone-voice-assistant/699589)
- Self-contained variant: Reddit builder put the ESP in the handset with I2S mic + speaker, powered over the coiled cord's spare wires; only hook and dial contacts wired. — [Reddit (snippet)](https://reddit.birdcat.cafe/r/homeassistant/comments/1k8ijf3/esphomebased_retro_voice_assistant)
- A Feb 25, 2026 reply (Martin Granger) to Dyballa's thread notes his coiled cord had only four wires; the speaker fit in the receiver but the mic did not. — [HA forum](https://community.home-assistant.io/t/tabletop-phone-voice-assistant/699589)

### Inferences
- Since the user's house wiring is unused (no live service), an ATA's FXS port could be patched into the house wiring at the demarc/a jack so existing wall jacks carry the ATA line. But a single FXS port feeding all jacks means all phones share one line (parallel extensions, one HA "device"); per-phone identity needs one FXS port per phone (home-run wiring or separate pairs). Grandstream ATA ring-voltage/REN limits with several phones in parallel were not researched here — not verified.
- Touch-tone phones work fine with the ATA approach; DTMF can be passed to a PBX for multi-destination dialing.

### Gaps
- No documented project found that explicitly wires an HA-connected ATA into a house's existing in-wall phone wiring; this is inference.

## What common problems and fixes are reported?

### Takeaway
The recurring issues are codec mismatch (Opus required, payload 123), the ATA status/hook not updating, the SIP port 5060 colliding with existing PBX gear, audio cut off after the beep, HA calling back if you hang up too early, calls not hanging up through a PBX, and slow STT on weak hosts.

### Cited Findings
- Test call fails: ensure OPUS selected and payload type 123, apply, retry. — [HA tutorial](https://www.home-assistant.io/voice_control/worlds-most-private-voice-assistant/)
- Integration stops working (no sound, no debug runs): check Grandstream Status page; hook state should go On Hook -> In Use on lift (web UI is slow, refresh); if not, reboot the ATA. Tutorial also has a "no voice on first call" troubleshooting section. — [HA tutorial](https://www.home-assistant.io/voice_control/worlds-most-private-voice-assistant/)
- If Grandstream dashboard is disabled, factory reset. — [SmartHomeScene](https://smarthomescene.com/guides/voice-calling-home-assistant-with-an-old-phone)
- Non-Opus phone via FreePBX failed: "Unable to find a codec translation path: (ulaw) -> (opus)"; same user reported replies often cut off or missing after the initial beep, worsening over time (no fix). — jose1711, Feb 17, 2025, [HA forum](https://community.home-assistant.io/t/voice-over-ip-integration-call-from-any-sip-softphone/567762?page=5)
- Restricting the PBX trunk to Opus only fixed codec problems (Grandstream UCM6301). — nwhitfield, Nov 24, 2025, [HA forum](https://community.home-assistant.io/t/voice-over-ip-integration-call-from-any-sip-softphone/567762?page=5)
- Port 5060 conflict with existing PBX extensions; fix: change the integration's "SIP Port" option (jaminh, Sep 23, 2025). — [HA forum](https://community.home-assistant.io/t/voice-over-ip-integration-call-from-any-sip-softphone/567762?page=5); also [VoIP docs](https://www.home-assistant.io/integrations/voip)
- 3CX crashes ("Cannot write to closing transport"); 3CX direct SIP speed dial failed but SIP trunk + outbound rule worked (Jul 22, 2026). — [HA forum](https://community.home-assistant.io/t/voice-over-ip-integration-call-from-any-sip-softphone/567762?page=5)
- Grandstream firmware showing "up to date" when not; changing firmware server address fixed it (Oct 8, 2025). — [HA forum](https://community.home-assistant.io/t/voice-over-ip-integration-call-from-any-sip-softphone/567762?page=5)
- Via FreePBX: Assist doesn't hang up so the next caller gets busy; all phones appear from the PBX IP (no per-caller identity); exposing all entities caused a mishap — start small. — [FreePBX forum, Oct 1, 2025](https://community.freepbx.org/t/installing-and-configuring-voice-over-ip-for-home-assistant-connecting-to-freepbx/107798)
- HA calls the phone back if the call is hung up too soon (HT801 user, Mar 4, 2025). — [HA forum](https://community.home-assistant.io/t/how-to-make-grandstream-ht802-ring-via-home-assistant/766987)
- Music-muting blueprint muted only while listening, not while responding. — thistleshire, Nov 3, 2025, [HA forum](https://community.home-assistant.io/t/voice-over-ip-integration-call-from-any-sip-softphone/567762?page=5)
- Slow responses on Pi 4 (8-9 s) vs N100 (~1 s); set finished-speaking detection to Relaxed. — [SmartHomeScene](https://smarthomescene.com/guides/voice-calling-home-assistant-with-an-old-phone)
- ESP builds: long I2S runs unreliable; sending arbitrary TTS to the phone speaker was unresolved for Dyballa (Mar 2024). — [HA forum](https://community.home-assistant.io/t/tabletop-phone-voice-assistant/699589)
- A Grandstream GXP2140 IP desk phone did not work with the tutorial (lacks equivalent settings); another user succeeded with an HT802 through Asterisk. — [Lemmy thread](https://lemmy.dbzer0.com/post/13601866) (via search snippet)

### Inferences
- Echo and volume complaints were not prominent in the threads read; the handset form factor (no open speaker) likely avoids most echo issues.

### Gaps
- No sourced reports found on echo cancellation, earpiece volume tuning, or Grandstream gain settings specifically for HA.

## Any projects using multiple phones/extensions or ringing phones as notifications/intercom?

### Takeaway
Native HA VoIP supports many ATAs (one device per ATA/IP), but only one port per multi-port ATA. Since HA 2025.2, HA can ring the phone (`assist_satellite.announce`, `start_conversation`). For many phones, extensions, ring groups, and intercom, people use a PBX (FreePBX/Asterisk) or the HACS "VoIP Stack" PBX inside HA.

### Cited Findings
- HA 2025.2: HA can call an analog phone; `assist_satellite.announce` rings it and plays a message on pickup; `assist_satellite.start_conversation` starts a two-way conversation but requires an LLM agent (default agent not supported in that release). Example: call to ask whether to close the garage door after 30 minutes. Contributor: Jamin (jaminh). — [HA 2025.2 release](https://home-assistant.io/blog/2025/02/05/release-20252)
- On a forum thread asking how to ring an HT802 from HA (Sep 2024), answer (Mar 4, 2025): `announce` rings the phone and repeats the message until hang-up; `start_conversation` needs an AI pipeline. Earlier suggestion was the third-party ha-sip add-on (netham45/ha-sip). — [HA forum](https://community.home-assistant.io/t/how-to-make-grandstream-ht802-ring-via-home-assistant/766987)
- The Assist satellite entity (Oct 2024) covers ESPHome devices and analog phones via VoIP. — [HA dev blog](https://developers.home-assistant.io/blog/2024/10/01/assist-satellite-entity/)
- Feature request "Support multiple lines in VoIP integration" (May 7, 2023): HT802's second line cannot be routed to another pipeline; workarounds are separate devices/IPs (two softphones worked) or a PBX; no implementation reported. — [HA forum](https://community.home-assistant.io/t/support-multiple-lines-in-voip-integration/568949)
- Grandstream HT818v2 on FreePBX: each extension appears as a separate endpoint in HA and can be assigned to a room (Nov 3, 2025). — [HA forum](https://community.home-assistant.io/t/voice-over-ip-integration-call-from-any-sip-softphone/567762?page=5)
- Each phone on a PBX that reaches HA appears in HA's Assist devices list, each needing "Allow calls". — [FreePBX forum](https://community.freepbx.org/t/installing-and-configuring-voice-over-ip-for-home-assistant-connecting-to-freepbx/107798)
- VoIP Stack (HACS, stable 2026.11.0, requires HA 2026.7.0+): SIP PBX in HA with HA as registrar, ring groups, conference groups, forwarding/voicemail, transfer, SIP desk phones/ATAs as SIP clients, ESP32 room phones, Assist pipeline as a dialable extension, `voip_stack.call` service. Release 2026.7.1 titled "Assist By Phone, Groups And A Stronger VoIP Stack". Analog/SLIC not mentioned. — [GitHub](https://github.com/n-IA-hane/esphome-intercom), [releases](https://github.com/n-IA-hane/esphome-intercom/releases)
- Dyballa's ESP build exposes the bell as an HA switch so HA can ring the phone (e.g., reminders). — [HA forum](https://community.home-assistant.io/t/tabletop-phone-voice-assistant/699589)
- Analog Redial: intercom between two handsets on one board without internet; multiple boards over Wi-Fi; dial plan. — [ElectronicsForU](https://www.electronicsforu.com/?p=207039)
- A separate SIP/VoIP custom component claims HA can call other phones for TTS announcements; voice-assistant forwarding experimental. — [HA forum](https://community.home-assistant.io/t/sip-voip-custom-component-for-home-assistant/1014009) (snippet only, not verified)

### Inferences
- Simplest scaling path with native HA: one HT801 per phone (each its own IP = its own Assist satellite with announce). For several phones on shared ATA hardware (HT802/HT812/HT818) or for intercom/dial-another-room, a PBX (FreePBX/Asterisk or VoIP Stack) is needed between the ATA and HA.

### Gaps
- Did not verify whether VoIP Stack works with Grandstream FXS ports + touch-tone DTMF menus in practice, or whether native HA VoIP accepts both HT802 ports via a PBX with distinct identities (FreePBX author reports all calls appear from the PBX IP).

## State of these projects as of late 2026

### Takeaway
HA's VoIP integration remains a core, HA-maintained integration (still documented, still HT801-centric, still one port per multi-port ATA), gained outbound calling in 2025.2, and is actively discussed in 2025-2026 forum threads. Third-party ecosystems (VoIP Stack, Analog Redial) are active as of Nov 2026.

### Cited Findings
- VoIP integration page: introduced 2023.5, Local Push, internal integration maintained by HA; one-port limit for HT802/HT812 still stated; configurable SIP port and SIP user. — [VoIP docs](https://www.home-assistant.io/integrations/voip)
- 2025.2 added outbound calls/announce to analog phones. — [HA 2025.2](https://home-assistant.io/blog/2025/02/05/release-20252)
- Voice chapter 9 (Feb 13, 2025) references the analog phone as the "world's most private voice assistant" and that HA can now call it. — [HA blog](https://home-assistant.io/blog/2025/02/13/voice-chapter-9-speech-to-phrase)
- Forum activity on VoIP integration continues through Jul 2026. — [HA forum](https://community.home-assistant.io/t/voice-over-ip-integration-call-from-any-sip-softphone/567762?page=5)
- VoIP Stack stable 2026.11.0 / dev 2026.11.1-dev.1; ~304 stars. — [GitHub](https://github.com/n-IA-hane/esphome-intercom)
- Analog Redial article published Nov 3, 2026. — [ElectronicsForU](https://www.electronicsforu.com/?p=207039)
- Dyballa's 2024 thread got a new reply Feb 2026 (others still building similar). — [HA forum](https://community.home-assistant.io/t/tabletop-phone-voice-assistant/699589)

### Inferences
- Speech-to-Phrase (Feb 2025) offers a fast local STT alternative to Whisper for fixed home-control commands, which may help phone latency on modest hosts (not verified for VoIP specifically).

### Gaps
- Did not check HA 2026.x release notes for any VoIP integration changes (e.g., multi-port support, codec changes); none were surfaced in searches.
- Activity/maintenance of Dyballa's GitHub repo and ha-sip not checked.
- Analog Redial: GitHub owner is "sdylewski" while the article names Ananthu Ashok (likely the article writer); authorship unconfirmed.
