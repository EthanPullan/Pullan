# Telephony Hardware and In-House Phone Wiring for Driving Analog Touch-Tone Phones from a Basement Device (USA/Canada, no telco service)

## What does an analog phone need from the line, and what does an FXS port provide?

### Takeaway
A North American loop-start analog phone needs about -48 VDC on-hook (FCC Part 68 range 42-52 V), roughly 20-30 mA of loop current off-hook (the line drops to about -7 V), and AC ringing near 90 Vrms at 20 Hz. A line should carry no more than 5 REN in total. An FXS port ("Foreign eXchange Station") is the device-side jack that supplies all of this: battery, loop current, dial tone, ringing, off-hook detection, and DTMF and audio handling. Consumer FXS hardware often rings at a lower voltage and REN than a real central office.

### Cited Findings
- On-hook idle voltage is about -48 V, with a 42-52 V range citing FCC 47 CFR 68.312. Off-hook, it drops to about -7 VDC. Typical loop current is 20-120 mA, a phone-patch spec gives 20-26 mA typical, and the Cisco ATA lists 24 mA nominal and -47 V. Ringing is commonly 90 Vrms at 20 Hz with a 2 s on / 4 s off cadence. Sources also give 40-130 Vrms, and the Cisco ATA rings at 70 Vrms typical. Total REN on a line should not exceed 5.0, and 1.0 REN is about one electromechanical bell ringer. — [Industrial Monitor Direct line-simulator article (vendor blog, secondary)](https://industrialmonitordirect.com/blogs/knowledgebase/telephone-line-simulator-for-industrial-modem-testing); [UBC ECE lecture notes, loop-start circuit](https://people.ece.ubc.ca/edc/4550.fall2017/lec2.pdf); [Cisco ATA 191 specifications](https://www.manualslib.com/manual/1531368/Cisco-Ata-191.html?page=63)
- In a central office, the loop-start circuit includes 400-800 ohm current-limiting resistors, chosen by loop length. — [UBC ECE lecture notes](https://people.ece.ubc.ca/edc/4550.fall2017/lec2.pdf)
- Cisco SPA112 FXS spec: ring voltage configurable from 40 to 90 Vpk, ring frequency 20-25 Hz, trapezoidal ring waveform, maximum ringer load 5 REN. The admin guide gives a 60-90 V setting range with a default of 85 V, which conflicts with the datasheet range. — [Cisco SPA112/122 comparison](https://www.cisco.com/c/fr_ca/support/smb/product-support/small-business/voice-spa-112-comparison.html); [Cisco SPA112 admin guide p.80](https://www.manualowl.com/m/Cisco/SPA112/Manual/286352?page=80)
- Cisco's troubleshooting note for SPA112/122 phones that do not ring says the typical US setting is 90 V at 20 Hz, and that the value should not exceed the country limit. — [Cisco smb2780](https://www.cisco.com/c/en/us/support/docs/smb/unified-communications/cisco-small-business-voice-gateways-and-atas/smb2780-troubleshoot-a-spa112-and-a-spa122-when-the-connected-phones.html)
- Grandstream HT802 FXS features: DTMF and pulse dialing; Bellcore Type 1 and 2 caller ID; disconnect signaling by busy tone, polarity reversal/wink, or loop current; DTMF passed in-audio, by RFC2833, or by SIP INFO. — [Grandstream HT802 datasheet](https://www.grandstream.com/hubfs/Product_Documentation/datasheet_ht802_english.pdf)

### Inferences
- Because REN adds up per phone, the REN rating of the FXS port caps how many phones ring in parallel on one port. Modern electronic phones are often 0.1-0.5 REN; old bell-ringer phones are about 1.0 REN.
- Many ATAs and SLICs ring well below the 90 Vrms central-office level. Old electromechanical bell phones may ring weakly or not at all, which matters for vintage Western Electric-style sets.
- The FXS port detects DTMF and the HT802 passes it out as RFC2833. Downstream software such as Asterisk or Home Assistant therefore gets digit events rather than having to decode tones itself.

### Gaps
- I found no Grandstream datasheet figure for loop current (mA) or ring voltage (Vrms) on the HT80x/HT81x. Only REN is published.
- I did not read FCC Part 68 directly. The 42-52 V figure is from a secondary source that cites it.

## Hardware options and trade-offs (ATAs, SLIC modules, PBX/FXS cards, line simulators), with 2026 prices

### Takeaway
For a Home Assistant or VoIP project, a Grandstream ATA is the easiest and cheapest option: the HT801 is about $41-53. Home Assistant's VoIP integration officially works with the HT801 and supports only one port on multi-port models. A DIY ESP32 build around the Silvertel AG1171 SLIC gives full control from a single 3.3-5 V supply but needs an audio codec. Its ringing is weak, about 60 Vrms to one phone. PCI FXS cards for Asterisk and standalone line simulators also work but are more expensive or niche. Obihai and Cisco SPA ATAs are end-of-life.

### Cited Findings
**Grandstream ATAs (SIP, Ethernet)**
- Ring load per port (REN): HT801 is 5 REN (1 port), HT802 is 2 REN (2 ports), HT812 is 3 REN (2 ports), HT814 is 2 REN (4 ports). All are rated up to 1 km on 24 AWG wire. V2 units carry the same figures: HT812 V2 is 3 REN; HT814 V2 and HT818 V2 are 2 REN. — [Grandstream HT8xx V1 FAQ](https://documentation.grandstream.com/knowledge-base/ht8xx-v1-faq/); [HT801 datasheet](https://noctel.com/assets/files/datasheet_ht801_english.pdf); [HT802 datasheet](https://www.grandstream.com/hubfs/Product_Documentation/datasheet_ht802_english.pdf); [HT81x V2 User Guide](https://documentation.grandstream.com/knowledge-base/ht81x-v2-user-guide/); [HT812/HT814 Admin Guide](https://documentation.grandstream.com/knowledge-base/ht812-ht814-administration-guide/)
- HT802 other specs: two RJ11 FXS ports, one 10/100 Ethernet port, codecs including G.726-32, iLBC and Opus, line echo cancellation, 3-way conferencing, T.38 fax, SSH/web/syslog management. — [HT802 datasheet](https://www.grandstream.com/hubfs/Product_Documentation/datasheet_ht802_english.pdf)
- Prices (retailer snapshots, late 2026 search, not verified on Amazon):
  - HT801: $53.00 at Walmart; HT801 V2 $44.99 at CDW and $41.25 at VoIP Supply.
  - HT802: $54.27 at Walmart; HT802 V2 $47.99 on eBay and $59.00 at VoIP Supply.
  - HT812: $65.00 at Multilink.
  - HT814: $88.48 at Walmart; HT814 V2 $72.99 on eBay and $81.75 at VoIP Supply.
  - UK prices excluding VAT: HT802-V2 £33.33, HT812-V2 £44.16, HT814-V2 £59.16.
  - Sources: [Walmart Grandstream](https://www.walmart.com/c/brand/brand-grandstream-networks); [CDW HT801 V2](https://www.cdw.com/product/grandstream-ht801-v2-voip-phone-adapter/8305387); [VoIP Supply](https://www.voipsupply.com/products/cloudspan-marketplace/shop-by-service-provider/zoom-phone/grandstream); [Multilink](https://shop.multilink.us/shop-by-brand/grandstream/?page=5); [NetXL](https://www.netxl.com/grandstream.md)
- Home Assistant's VoIP integration says it currently works with the Grandstream HT801. The HT802 is essentially the same with two ports, of which only one is usable. The HT812 is reported to work, also with only one port supported. — [Home Assistant VoIP integration](https://home-assistant.io/integrations/voip)
- The HA tutorial sets the HT801's FXS Port "Offhook Auto-Dial" to the HA IP address and SIP port (5060), so picking up the handset calls HA with no dialing. It also recommends having Opus among the preferred vocoders, and needs HA 2023.5 or later. — [HA "World's most private voice assistant"](https://www.home-assistant.io/voice_control/worlds-most-private-voice-assistant/)
- Grandstream Offhook Auto-Dial supports an optional delay and DTMF digits sent after the call connects. — [8x8 support: Offhook Auto-Dial on Grandstream](https://support.8x8.com/devices-accessories/phones/ata-adapters/How_to_Set_Up_Offhook_Auto-Dial_on_Grandstream_ATAs); [Tek-Tips thread](https://tek-tips.com/threads/grandstream-ata.1829943)

**Cisco/Linksys SPA and Obihai**
- The Cisco SPA112 is end-of-life and no longer provided by Cisco; support is best effort. — [Sangoma KB](https://sangomakb.atlassian.net/wiki/spaces/SND/pages/403669091/How+do+I+get+my+analog+phones+that+are+attached+to+a+Cisco+SPA112+or+SPA122+to+ring)
- Its FXS port rings at 40-90 Vpk configurable, 20-25 Hz, with a 5 REN maximum. — [Cisco comparison](https://www.cisco.com/c/fr_ca/support/smb/product-support/small-business/voice-spa-112-comparison.html)
- Poly stopped selling the OBi200, OBi202 and OBi212 after a December 2021 end-of-life announcement. Engineering and service support ended on December 18, 2023, and HP gives no guarantee the devices keep working after Oct 31, 2024. — [Ooma blog](https://www.ooma.ca/?p=52754); [OBiTALK EOL FAQ](https://mobile.obitalk.com/info/faq/About-the-OBi/end-of-life-announcement)

**SLIC modules for ESP32 or Raspberry Pi DIY**
- Silvertel Ag1171 datasheet: 14-pin SIL package, single +3.3 V to +5.0 V supply, with an internal DC/DC converter that generates a 48 V battery feed and a 72 V battery during ringing. Loop current is a constant 30 mA preset. Ringing is about 60 Vrms into one phone and more than 40 Vrms into 3 phones (tone ringers). Ring frequency is 20-25 Hz. The 2-wire impedance is 600 ohms, the gain is 0 dB, and loop length is typically 1 km (470 ohms including the phone). — [Silvertel Ag1171 datasheet V1.6](https://static.chipdip.ru/lib/300/DOC029300244.pdf)
- Ag1171 pins and control:
  - RM goes high to enter ringing mode.
  - The microcontroller toggles F/R at 20 Hz in the ring cadence to generate ringing. F/R also gives polarity reversal.
  - SHK goes high off-hook, needs 10 ms debouncing, and pulses for ring-trip and for pulse dialing.
  - Audio passes through VIN (from the codec, via 10 nF) and VOUT (to the codec, via 100 nF).
  - PD powers down the device; it must never be driven high.
  - Ringing should be switched off within 500 ms of ring-trip.
  - On-hook transmission for caller ID needs a 20-39 kohm resistor across Tip and Ring.
  - Source: [Ag1171 datasheet](https://static.chipdip.ru/lib/300/DOC029300244.pdf)
- Protection: the Ag1171 is meant for short "on-premise" loops, where power-cross and lightning protection is "not required." It needs only ESD protection, using a TVS diode (BZT03C82 or P6KE82) and a diode bridge. Silvertel strongly discourages varistors and gas-discharge tubes. — [Ag1171 datasheet](https://static.chipdip.ru/lib/300/DOC029300244.pdf)
- The SLIC does not decode DTMF. Audio has to go to a codec or DSP; that detection need is my inference from the VIN/VOUT design. — [Ag1171 datasheet](https://static.chipdip.ru/lib/300/DOC029300244.pdf)
- Analog Redial, an open-source ESP32 phone project, uses an ESP32-C6-DevKitC-1, an ES8388 audio codec, and one or two Silvertel AG1171 SLIC modules. — [Open Source For You](https://www.opensourceforu.com/?p=104223); [Electronics For You](https://www.electronicsforu.com/?p=207039)
- Sourcing: DigiKey lists the AG1171 with a 16-week standard lead time. A hobbyist notes it can be hard to get, and that the R-Tone KS0835F is a fully compatible clone available from Chinese sellers. — [DigiKey AG1171](https://www.digikey.com/en/products/detail/silvertel/AG1171/21187236); [Hackaday.io project log](https://hackaday.io/project/28557/log/71929)
- An ESP32 "Ma Bell gateway" project drives ringing from a GPIO with a 2 s on / 4 s off cadence and watches the hook pin. It uses an HC-5504B SLIC with active-low hook output, so the AG1171's active-high SHK needs inverted logic. — [esp32-ma-bell-gateway docs](https://cdeever.github.io/esp32-ma-bell-gateway/_sources/implementation/firmware/phone-hardware.rst.txt)

**Asterisk/FreePBX analog cards**
- The Digium/Sangoma TDM410P is a half-length PCI card with 4 module slots, each taking one FXS or FXO module. The OpenVox A400P/A400E is a 4-port FXS/FXO card using DAHDI drivers; the A400P needs an external power connector and the A400E does not. Both are PCI/PCIe, so they suit a basement x86 PC and do not fit a Raspberry Pi. — [robytech TDM410P](https://sites.google.com/view/robytech/index/fxo-fxs-card/tdm410p-13); [OpenVox A400P manual](https://help.openvox.cn/?p=16822); [IP Phone Warehouse A400P](https://ipphone-warehouse.com/OpenVox-A400P-p/a400p-base-card.htm)
- OpenVox's FAQ warns that these cards can share an IRQ with USB controllers and recommends separating them. — [OpenVox A400 FAQ](https://downloads.openvox.cn/pub/misc/A400_FAQ(English).pdf)
- Common pattern (inference): run Asterisk or FreePBX with the analog phones on Grandstream ATAs over SIP, rather than on PCI cards.

**Line simulators**
- The Viking DLE-200B is a two-way line simulator for one line, with two RJ11 jacks: picking up one phone rings the other, and it supplies dial tone. MSRP is $224; street prices run about $107-$126 (The Telecom Spot $106.71, CDW $111.99, IP Phone Warehouse $113.99, JMAC $125.41). It has no network or computer interface. — [The Telecom Spot](https://www.thetelecomspot.com/products/viking-electronics-dle-200b-two-way-phone-line-simulator-with-dial-tone-dle-200b); [IP Security Depot](https://www.ipsecuritydepot.com/two-way-phone-line-simulator-with-dial-tone/dle-200b/); [CDW](https://www.cdw.com/product/viking-dle-200b-emergency-telephone-ringdown-circuit/450095?pfm=srh)

### Inferences
- For "start with one phone, expand later," an HT801 at about $45 with 5 REN is the best fit. Its one port can drive several parallel phones across the whole house wiring, and it is the device HA officially supports.
- Expanding to separate extensions with the HA VoIP integration probably means several HT801s, one per extension, since HA supports only one port per ATA. Each extension would also need its own house pair or home run. The alternative is an Asterisk/FreePBX layer between multi-port ATAs and HA.
- The HT802 and HT814 have lower per-port REN (2), so they suit one phone per port. The HT812 at 3 REN is the better 2-port choice for parallel phones.
- An AG1171 build is cheaper per port but needs a codec (such as the ES8388), DTMF detection in software, and SIP or a custom protocol. It is also limited to about 3 phones at weak ring voltage.
- A line simulator like the DLE-200B does nothing useful for a voice-assistant project. It only connects two phones to each other.
- Old PBX units, such as used Panasonic KX-TA/TDA key systems, were not researched.

### Gaps
- Si3210/Si32xx (Skyworks, formerly Silicon Labs) availability and modules: not researched. These SLICs need SPI control and a higher-voltage supply.
- Raspberry Pi HATs or USB FXS devices for Pi: none found in search.
- Used PBX options (Panasonic KX-TA824, KX-TES824 and similar) and their prices: not researched.
- Current Amazon pricing: not retrieved.
- Grandstream V2 hardware revisions may differ from V1. The REN figures were confirmed for HT81x V2; for HT80x V2 they come from the V1 datasheet and FAQ.

## House wiring: NID/demarc, disconnecting the telco side, identifying pairs, topology, testing, second line

### Takeaway
The telco line must be physically disconnected at the NID (demarc) before any FXS device feeds the house wiring. The standard way is to unplug the short modular plug from the NID's customer-side test jack, or to cut and terminate the incoming pair; this isolates the house wiring. The FXS device is then "backfed" by plugging a phone cord into any wall jack, which energizes every jack on that pair. In North America, line 1 is the red/green pair (or blue/white-blue in Cat3/Cat5 cable) and line 2 is black/yellow (or orange/white-orange). Verify the pairs with a meter because colors are not always reliable.

### Cited Findings
- The NID has a phone-company side, which is off-limits, and a customer-access side. Unplugging the modular plug from the test jack on the customer side disconnects the inside wiring from the phone company's lines. Older homes may have a protector block with no test jack. Bridge modules have 2 or 4 screw posts; with 4 posts, line 2 may be on the black/yellow posts. — [homephonewiring.com NID](https://homephonewiring.com/nid.html)
- Isolate the incoming service first to avoid "back-feeding problems," then use a phone cord to connect the ATA's line port to any house jack. If there is no plug to pull, the incoming line may need to be cut and given a male plug on the incoming side and a female jack on the house side. — [WebArray: one ATA for an entire house](https://webarray.tawk.help/article/how-to-use-one-ata-for-an-entire-house)
- Forum warning: if the telco line is not disconnected at the demarc, the ATA risks being "fried." The incoming red/green pair should never touch the backfed connections. — [Sundance Communications forum](https://sundance-communications.com/forum/ubbthreads.php/topics/637277); [AT&T forum, backfeed](https://forums.att.com/t5/Setup-Self-Install-TV/Self-Install-Backfeed-to-existing-phone-circuit/m-p/2644823)
- Line 1 is the red/green pair and line 2 is the yellow/black pair. Colors cannot always be trusted: a common fault is green paired with black and red with yellow somewhere in the chain, so check the voltage on each pair at the jack. — [Tractor By Net forum](https://www.tractorbynet.com/forums/threads/help-with-phone-problem.28118/post-308016); [Contractor Talk](https://www.contractortalk.com/posts/1212782); [homephonewiring.com add line 2](https://homephonewiring.com/add-line2.html)
- Test sequence:
  1. Check for voltage on both pairs.
  2. Disconnect one pair at a time to confirm each pair is isolated.
  3. Check continuity between all pair combinations; there should be none.
  4. Do not use an ohmmeter unless the NID test-jack plug is disconnected.
  - Sources: [Tractor By Net forum](https://www.tractorbynet.com/forums/threads/help-with-phone-problem.28118/post-308016); [Natural Handyman](https://www.naturalhandyman.com/iip/inftelephone/inftel4.html)
- Line 2 wiring at a jack or NID: black wire to the line-2 green post, yellow wire to the line-2 red post. — [homephonewiring.com jack connections for two lines](https://homephonewiring.com/connect2.html)
- Wiring topology matters for filters. If wall jacks are wired in a star (home-run), every jack must be treated; with series (daisy-chain) wiring, often only the first jack needs it. — [Paradyne Hotwire manual](https://manuals.online/paradyne/telephone-accessories/hotwire-6040/user-manual/2cuiz)
- Background on residential wiring standards (solid-color quad versus twisted pair, and inside-wiring conventions). — [InetDaemon residential wiring](https://inetdaemon.com/tutorials/telecom/pstn/residential_wiring/index.shtml); [NWTel home wiring standards](https://www.nwtel.ca/support/home-wiring-standards/how-wire-inside-your-home)

### Inferences
- With no active service, the NID pair should read 0 V. If it reads about 48 V, a dry or live loop from the telco still exists and it must be disconnected before connecting the FXS device.
- After disconnecting, plug the ATA into a basement jack, or connect it at the NID customer-side bridge. With a phone off-hook, measure about -48 V on-hook and a few volts off-hook at the upstairs jacks.
- In daisy-chain wiring, all jacks share one pair. One FXS port then rings every phone, and separate extensions need the second pair, which gives at most 2 lines: line 1 from FXS port A, line 2 from port B. Star (home-run) wiring back to the NID lets each jack get its own FXS port.
- Cat3/Cat5 color codes (blue/white-blue = line 1, orange/white-orange = line 2) are standard practice but were not confirmed in the sources fetched.

### Gaps
- I found no authoritative (telco or NEC) source on the exact disconnect method for every NID model. Forum and vendor sources were used.
- Cat5 pair-to-line mapping and star versus daisy-chain identification techniques (tone generator, continuity test) were not directly sourced.

## Multiple phones: parallel on one FXS port versus separate extensions; multi-port ATAs; Asterisk

### Takeaway
Phones wired in parallel on one FXS port all ring together and share one line. Picking up any of them takes the line, and the FXS device cannot tell which phone is in use. The phones' combined REN must stay within the port's rating: 5 on the HT801, 3 on the HT812, 2 on the HT802/HT814. Separate extensions need one FXS port per phone, and each needs its own wire pair or home run. Home Assistant's built-in VoIP integration supports one port per ATA, so multi-extension setups need several HT801s or an Asterisk/FreePBX in between.

### Cited Findings
- REN per port: HT801 is 5, HT812 is 3, HT802 and HT814 are 2. — [Grandstream HT8xx FAQ](https://documentation.grandstream.com/knowledge-base/ht8xx-v1-faq/); [HT81x V2 User Guide](https://documentation.grandstream.com/knowledge-base/ht81x-v2-user-guide/)
- The Ag1171 SLIC delivers more than 40 Vrms ringing into 3 tone-ringer phones, or about 60 Vrms into one. — [Ag1171 datasheet](https://static.chipdip.ru/lib/300/DOC029300244.pdf)
- HA VoIP supports only one port on the HT802 and HT812. — [HA VoIP integration](https://home-assistant.io/integrations/voip)
- AT&T U-verse forum: carrier gateways typically want one dedicated pair to one jack. The VDSL pair goes on the line-2 pair and the line-1 pair is disconnected at the NID, which illustrates splitting pairs between uses. — [AT&T forum](https://forums.att.com/t5/Setup-Self-Install-Voice/Uverse-on-Multiple-Phone-Jacks/td-p/4001278)
- TDM410P and A400P cards give 4 FXS ports to Asterisk through DAHDI. — [OpenVox A400P manual](https://help.openvox.cn/?p=16822)

### Inferences
- "Which phone is in use" cannot be detected on a shared parallel line. All extensions look like one loop; only the total loop current changes. Detecting it per phone needs separate FXS ports, and so separate pairs.
- Practical expansion path:
  1. Start with one HT801 backfeeding the line-1 pair, so all jacks are live and parallel.
  2. Add a second ATA or port on the line-2 pair, re-terminating chosen jacks to use line 2.
  3. For more than two independent extensions, run new home-run cable or use DECT.

### Gaps
- No sources were found documenting the off-hook loop current of several parallel phones on Grandstream ATAs, for example whether two phones off-hook at once share audio cleanly. It is commonly done, but not sourced here.

## Safety: ring voltage, grounding, telco isolation, lightning

### Takeaway
Ringing runs at about 90-100 VAC and on-hook battery at 48 VDC, which is enough to give a painful shock. Unplug the FXS device or leave phones off-hook while working on jacks. Never connect the FXS device to the telco pair: the telco's battery or ringing backfeeding into the ATA can destroy it, and the device could put voltage onto outside plant. Keep the NID's grounded protector intact; lightning surges on inside wiring can exceed 2 kV.

### Cited Findings
- Ring-time voltage on the twisted pair is about 100 VAC. — [Mike Holt forum](https://forums.mikeholt.com/threads/equipment-protection.26174/post-26174)
- Induced AC on phone lines can severely shock people working on the wiring. — [Sandman.com](https://sandman.com/knowledgebase/preventative-lightning-protection)
- Protectors divert overvoltage to ground and do not work without a good ground. — [Sandman grounding bulletin](https://www.sandman.com/GroundingBull.html)
- Lightning can induce surges above 2 kV on inside wiring. NID protectors are designed to hold the voltage below about 100 V. — [In Compliance Magazine: lightning surge damage to POTS ports on inside wiring](https://incompliancemag.com/lightning-surge-damage-to-ethernet-and-pots-ports-connected-to-inside-wiring/)
- In one residential fire investigation, the home lacked a required telephone protector and grounding conductor. — [EC&M](https://www.ecmag.com/section/safety/lightning-strike-leads-residential-fire)
- A failure to disconnect the telco at the demarc risks frying the ATA. — [Sundance Communications forum](https://sundance-communications.com/forum/ubbthreads.php/topics/637277)
- The Ag1171 is designed for on-premise short loops and needs only ESD protection there. Off-premise runs, such as wiring to a detached building or overhead cable, need primary and secondary protection. — [Ag1171 datasheet](https://static.chipdip.ru/lib/300/DOC029300244.pdf)

### Inferences
- Leave the NID's telco-side protector and ground in place even when disconnected. Inside wiring that stays entirely indoors carries low lightning risk, but a DIY SLIC board should still have the recommended TVS and diode bridge.
- The ring voltage is current-limited but is still a shock hazard, especially when the person is grounded. Disconnect the FXS device before rewiring jacks.
- For code requirements, the relevant standard is NEC Article 800 (communications circuits). It was not reviewed.

### Gaps
- NEC Article 800 was not reviewed directly.
- No UL or regulatory statement was found on whether a DIY FXS on house wiring needs approval. With no connection to the public network, FCC Part 68 registration does not appear to apply; that is an inference, not sourced.

## Cordless DECT base on the FXS port

### Takeaway
A standard analog cordless DECT base, such as a Panasonic KX-TGx series with several handsets, plugs into an FXS port like any analog phone. All its handsets share that one line, which gives whole-house coverage without using the house wiring at all. For handsets as separate extensions, a SIP-native DECT base (Panasonic KX-TGP600 or Cisco SPA232D) is needed instead of an ATA.

### Cited Findings
- An FXS port treats a DECT base as a regular analog POTS phone. One Cisco forum user could not place calls from a DECT base on an ATA while a corded phone worked on the same port; the case was unresolved and was likely a configuration issue such as dial plan or DTMF. — [Cisco Community SPA232D thread](https://community.cisco.com/t5/atas-gateways-and-accessories/spa232d-with-cordless-analogue-phone/m-p/3036288)
- Separate extensions require a SIP DECT base. The Panasonic KX-TGP600 supports up to 8 handsets on one system, and the Cisco SPA232D is an ATA with a built-in DECT base supporting 4 simultaneous calls with its own SPA302D handsets. Existing non-Panasonic DECT handsets need an analog base. — [FreePBX community](https://community.freepbx.org/t/re-use-existing-panasonic-dect-handsets/94081); [Panasonic KX-TGP600 (Onedirect)](https://www.onedirect.co.uk/telephone-systems/telephone-systems/dect-telephone-systems/panasonic/panasonic-kx-tgp600g-dect-base-station); [Cisco SPA232D (CDW)](https://cdw.com/product/cisco-spa232d-multiline-dect-ata-voip-phone-adapter/3129648)
- Comparison of a SIP cordless phone with a traditional cordless phone plus ATA. — [mgraves.org](https://www.mgraves.org/2008/10/cordless-sip-phone-vs-traditional-cordless-ata/)

### Inferences
- A DECT base is low-REN and is usually powered by its own AC adapter, so it combines well with corded phones on the same HT801 port.
- A SIP DECT base could register directly to Asterisk, and possibly to HA VoIP, with no ATA. HA VoIP compatibility with SIP DECT bases is unverified.

### Gaps
- No source confirmed a specific consumer Panasonic analog DECT base working on a Grandstream HT801, though it is very likely.
- The REN of DECT bases was not found.
