#!/usr/bin/env python3
"""Room 402 — Late-Night Conductor & Architect Studio.

A cozy, immersive late-night room experience over tea:
- 🫖 Late-Night Tea Dialogues (Real-time AI conductor chat with agy / claude)
- 🎼 Masterclass Podium Quizzes (Interactive architectural dilemmas in orchestral metaphor)
- 🏛️ Acoustic Stage & Frequency Masking Simulator (Interactive physics with Web Audio)
- 📜 Complete Dialogue Archive & Inbox Pours (Search, read, and reflect on movements)
- 🌧️ Ambient Sound Synthesis (Synthesized rain, kettle steam, and vinyl crackle via Web Audio API)

Usage:
  python3 conductor_web.py [--port 7332] [--open]
"""

import argparse
import html
import json
import os
import re
import subprocess
import sys
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse
import webbrowser

ROOT = Path("/Users/tamnm/code/personal")
CONDUCTOR_DIR = ROOT / "loopany/dorm-conductor"
DIALOGUES_DIR = CONDUCTOR_DIR / "dialogues"
INBOX_FILE = CONDUCTOR_DIR / "inbox.md"
README_FILE = CONDUCTOR_DIR / "README.md"
CHAT_HISTORY_FILE = CONDUCTOR_DIR / "chat_history.json"
PLACEHOLDER = "<!-- Leave an architectural question or scenario here. The conductor reads this\n     before composing, answers it in the next dialogue, and clears it. -->"

FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)

SYSTEM_PROMPT = """You are the user's older roommate living in Room 402.
You are a seasoned musician with a decade (10+ years) of experience as a symphony violist (middle register, alto clef) and orchestra conductor (podium topology, acoustics, rehearsal economy).
Your younger roommate (the user) has 5 years of battle-tested DevOps/infrastructure experience and is stepping up into Solution & Enterprise Architecture.

YOUR VOICE & ROOMMATE PERSONA:
1. WARM, CANDID SENIOR FLATMATE: Grounded, deeply perceptive, intimate, and naturally looking out for him over evening tea. You speak like two peers unwinding after a grueling rehearsal.
2. THE VIOLIST & CONDUCTOR DOUBLE-LENS: You know both the internal glue of the chords (viola) and the 30-staff vertical score topology and acoustic physics of the hall (conductor).
3. THE TERMINOLOGY BRIDGE & SOMATIC CORRECTOR: You are the bridge connecting abstract software/architecture concepts to physical conductor realities. When he brings up software, DevOps, or enterprise architecture terms (e.g., backpressure, circuit breaker, eventual consistency, rate limiting, microservices, idempotency, blast radius, caching, queues), catch the term with a knowing grin. Explicitly bridge the engineering concept to its precise orchestral counterpart, and gently refine or correct the term name so he builds true physical intuition (e.g., "You call it backpressure; on the podium we call that dynamic clearance and the preparatory breath...", "You say circuit breaker; in the pit that's an emergency tacet and soloist isolation...").
4. THE SOCRATIC REHEARSAL HOLD (GRILLING & DEMANDING REFLECTION): You are not a passive vending machine for instant answers. When he brings a vague problem, an underspecified architecture dilemma, or rushes to an easy conclusion, stop him in his tracks (*"Hold on. Don't touch that downbeat yet."*). Grill him with sharp, targeted questions to uncover missing acoustic constraints (*"Who holds the reference pitch when the brass drops out?", "What kind of room are we in—stone cathedral or dry studio?", "If the solo oboe misses that entrance, what happens to the cellos?"*). Force him to sit in the tension, specify the seams, and reason through the trade-offs before handing down your perspective.
5. WRY WIT, HUMOR & EARNED WISDOM: Bring dry orchestral humor, wry wit, and affectionate teasing into the conversation. You’ve survived eccentric opera divas, trumpet players who only know fortissimo, union disputes over rehearsal overtime, and guest conductors who fell off the podium. Use self-deprecating musical analogies (the violist's eternal plight) to puncture over-engineered complexity, disarm late-night anxiety, and deliver hard-won architectural wisdom with a knowing grin.
6. TRICKS UP YOUR SLEEVE (PEDAGOGICAL PROVOCATIONS): Never let him settle for comfortable, happy-path assumptions or neat textbook designs. Always spring an unexpected stage reality, acoustic curveball, or rehearsal ambush ready to push him further ("What happens when the first horn cracks a lip at bar 120?", "What if the hall's humidity drops and strings go sharp while brass goes flat?", "What happens when your guest soloist drops tempo by 15% mid-movement?"). Draw from ten years of pit and podium scars to pressure-test his architectural instincts.
7. RELENTLESS INVERSE THINKING (INVERT, ALWAYS INVERT): Constantly frame problems in reverse and actively train him to think backwards from catastrophic silence or ruin. Challenge forward optimism with:
   - "What is the single flaw that guarantees this piece collapses into an unplayable trainwreck on opening night?"
   - "How do we make the climax sound immense not by shouting louder, but by carving out the deepest dynamic silence before it?"
   - "If you wanted to sabotage the handoff between these two sections with the least effort, where would the seam tear?"
   - "What must we amputate from this score so the surviving voices can actually breathe?"
8. ZERO UNTRANSLATED JARGON: Never let abstract engineering acronyms hang in the air without translating them into acoustic physics, dynamic range (pp to fff), tempo friction, counterpoint, timbre masking, caesuras (silence), and podium governance.
9. Keep answers sharp, reflective, witty, and punchy (2-4 thoughtful paragraphs).
"""

BUILTIN_QUIZZES = [
    {
        "id": "cathedral-resonance",
        "title": "The Cathedral Reverberation Crisis",
        "category": "Acoustic Clearance & Buffering",
        "hall": "Stone Cathedral (RT60: 4.5s Tail)",
        "scenario": "You are staging a piece where a delicate, virtuosic solo woodwind trades rapid 4-measure phrases back and forth with a 4-man trombone section. In the dry rehearsal room, it was crisp and balanced. But tonight in this cavernous stone cathedral, the trombones' low-frequency resonance bounces violently off the stone arches for nearly 5 seconds. By the time the woodwind enters, its intricate notes are completely swallowed by lingering acoustic mud. The brass insists they are playing their written mezzo-forte.",
        "question": "Intermission is 15 minutes. You cannot rebuild the hall or change the master tempo. What is your architectural intervention?",
        "options": [
            {
                "id": "A",
                "text": "Order the solo woodwind to push to fortissimo (fff) and step closer to the audience.",
                "is_correct": False,
                "feedback": "Flawed approach: You are pushing on the physical peak. A woodwind has a strict acoustic ceiling and cannot compete with brass displacement without hyperventilating, sounding shrill, and exhausting their lungs within two bars."
            },
            {
                "id": "B",
                "text": "Drop the trombones' written dynamic to pianissimo (pp), insert a 2-beat caesura (rest) after their phrase, and let the room drain its low-frequency energy before the soloist enters.",
                "is_correct": True,
                "feedback": "Maestro's Choice! You never push on the ceiling; you amputate the dynamic floor of the heavy section. By introducing structural silence (a caesura), you give the hall's acoustic buffer time to settle, restoring dynamic headroom for the fragile voice."
            },
            {
                "id": "C",
                "text": "Double the tempo so the phrases pass by faster before the room has time to resonate.",
                "is_correct": False,
                "feedback": "Disaster: Doubling tempo in a 4.5s reverberant hall packs more sonic events into an already overloaded buffer, turning the performance into an incomprehensible wall of noise."
            }
        ],
        "architectural_takeaway": "When high-volume background workloads drown out low-latency requests, do not force the fragile clients to retry furiously. Carve out dynamic headroom by throttling the heavy throughput producers and inserting structural backoff/cooldown intervals."
    },
    {
        "id": "offstage-brass-latency",
        "title": "The 45-Meter Offstage Brass Delay",
        "category": "Clock Drift & Asymmetric Latency",
        "hall": "Grand Festival Hall (Distance: 45m, ~130ms Speed of Sound Delay)",
        "scenario": "An offstage herald trumpet choir is positioned 45 meters away in the upper balcony for spatial depth. When the trumpets listen to the on-stage violins to time their attack, their sound reaches the audience in Row 10 almost a full beat late. When the conductor waves frantically to speed them up, the trumpets panic, rush their tempo, and the entire movement collapses into rhythmic chaos.",
        "question": "How do you coordinate two sections separated by 130ms of physical acoustic latency so the audience hears a single, unified attack?",
        "options": [
            {
                "id": "A",
                "text": "Instruct the offstage trumpets to ignore what they hear and synchronize strictly on a visible beat (video monitor / assistant conductor), playing 'early' to their own ears.",
                "is_correct": True,
                "feedback": "Maestro's Choice! Sound is slow (~343 m/s), but light is instantaneous. If a distant section relies on acoustic feedback, they will always drag. They must trust the shared visible clock and accept feeling locally 'wrong' so the chord lands right in the house."
            },
            {
                "id": "B",
                "text": "Have the on-stage orchestra pause and wait for the offstage trumpets to echo before continuing.",
                "is_correct": False,
                "feedback": "Deadly trap: Stopping the main tempo for every remote component destroys the master groove and introduces indefinite latency spikes into the primary performance."
            },
            {
                "id": "C",
                "text": "Tell the trumpets to play twice as loud so the sound wave travels through the air faster.",
                "is_correct": False,
                "feedback": "Acoustic violation: Sound velocity in air is determined by temperature and atmospheric density, not decibels! Playing louder only deafens the balcony."
            }
        ],
        "architectural_takeaway": "Distributed components across physical regions cannot synchronize via peer echo without cascading latency drift. Decouple via global deterministic timestamps and visible clock synchronization rather than blocking on round-trip replies."
    },
    {
        "id": "fortissimo-exhaustion",
        "title": "The All-Fortissimo Score Collapse",
        "category": "Dynamic Headroom & Priority Creep",
        "hall": "Symphony Auditorium",
        "scenario": "A guest composer delivers a 400-measure manuscript where every single stave—from the piccolo to the tuba—is marked triple-forte (fff) from the opening measure. By Measure 60, the brass players' lips are numb, the strings are scraping harshly, the woodwinds are completely inaudible, and the audience is completely numb to the volume.",
        "question": "How do you restore dramatic contrast, preserve player stamina, and protect the climactic finish?",
        "options": [
            {
                "id": "A",
                "text": "Add eight more brass players to the roster so they can take turns blasting at maximum volume.",
                "is_correct": False,
                "feedback": "Naive scaling: Adding more heavy instruments only accelerates auditory fatigue and burns your budget without fixing the lack of dynamic contrast."
            },
            {
                "id": "B",
                "text": "Rescore the baseline: enforce pianissimo (p) and mezzo-forte (mf) for the narrative passages, preserving the true triple-forte exclusively for the 8-measure climax.",
                "is_correct": True,
                "feedback": "Maestro's Choice! Dynamics carry information only through contrast. When everything is marked loud, nothing is loud. You create impact not by pushing the ceiling, but by rigorously maintaining a low dynamic floor."
            },
            {
                "id": "C",
                "text": "Place acoustic baffles directly in front of the brass bells to dampen their volume without telling them.",
                "is_correct": False,
                "feedback": "Superficial duct tape: Physical mufflers do not fix the underlying score flaw, and the musicians will still suffer exhaustion playing against the resistance."
            }
        ],
        "architectural_takeaway": "An all-P1 backlog is a score marked fff from bar one: zero informational signal. Preserve priority headroom by establishing a strict, quiet baseline and reserving critical tier-1 treatment for genuine emergency climaxes."
    },
    {
        "id": "rehearsal-economy-bar214",
        "title": "The Rehearsal Economy: Bar 1 vs Bar 214",
        "category": "Integration Seams vs. Component Homework",
        "hall": "Rehearsal Studio (90 Minutes Room Time Remaining)",
        "scenario": "You have one 90-minute dress rehearsal before tomorrow's premiere. The score has a fiendishly difficult solo violin passage at Bar 40, and a treacherous meter shift (7/8 to 5/4) with an asynchronous section handoff between woodwinds and cellos at Bar 214. The young assistant wants to start at Bar 1 and spend 40 minutes drilling the violin solo.",
        "question": "How do you allocate the scarcest resource in the hall (synchronous room time)?",
        "options": [
            {
                "id": "A",
                "text": "Start at Bar 1 and rehearse in linear order so the orchestra feels a sense of completion.",
                "is_correct": False,
                "feedback": "Classic rookie blunder: You'll run out of clock by Bar 100, leaving the critical second-half transitions completely untested until the live performance."
            },
            {
                "id": "B",
                "text": "Spend the entire rehearsal on the virtuoso violin solo since it is the most technically demanding passage.",
                "is_correct": False,
                "feedback": "Wasted budget: The soloist can practice their finger mechanics alone in their practice room. You do not hold 100 people hostage for homework."
            },
            {
                "id": "C",
                "text": "Start directly at Bar 214: drill only the seam where two sections must agree on the handoff, leaving solo mechanics for private homework.",
                "is_correct": True,
                "feedback": "Maestro's Choice! Rehearse what cannot be practiced in isolation. Individual virtuosity is homework; agreement across seams is what earns the room."
            }
        ],
        "architectural_takeaway": "Do not burn architecture review cycles on isolated component implementations that teams can unit test alone. Focus exclusively on the interfaces, contracts, handoffs, and transition boundaries where independent services must agree."
    },
    {
        "id": "n2-sightline-collapse",
        "title": "The 100-Player Coordination Breakdown",
        "category": "Interface Boundaries & Sub-ensembles",
        "hall": "Philharmonic Concert Stage (104 Musicians)",
        "scenario": "During a massive Mahler movement, individual back-desk string players and second-chair woodwinds start making direct micro-adjustments with percussionists across the stage, bypassing their section leaders. The result is 4,900 competing peer-to-peer sightlines, frayed attacks, and erratic tempo hunting.",
        "question": "How do you restructure the ensemble's communication topology to prevent cognitive overload?",
        "options": [
            {
                "id": "A",
                "text": "Enforce strict hierarchical section surfaces: individual players watch only their section principal; the conductor addresses only 12 principals; sections interact only at defined score cues.",
                "is_correct": True,
                "feedback": "Maestro's Choice! An orchestra is a small ensemble of small ensembles. Nobody in the hall should hold more than a dozen relationships at once. Principals act as clean abstraction interfaces."
            },
            {
                "id": "B",
                "text": "Give every single musician an earpiece with a metronome click track so all 104 people are directly coupled.",
                "is_correct": False,
                "feedback": "Rigid over-coupling: A click track destroys musicality, eliminates phrasing elasticity, and creates single-point-of-failure brittleness."
            },
            {
                "id": "C",
                "text": "Reseat the orchestra in a giant single circle so everyone has a direct line of sight to everyone else.",
                "is_correct": False,
                "feedback": "Combinatorial disaster: Full peer-to-peer meshes scale as O(N²). You cannot solve communication overhead by adding more physical connections."
            }
        ],
        "architectural_takeaway": "Decouple massive organizations into autonomous squads bounded by clear team interfaces. The enterprise architect interacts with bounded domain leads, not every developer's daily pull request."
    }
]


def get_inbox_content():
    if not INBOX_FILE.exists():
        return ""
    text = INBOX_FILE.read_text(encoding="utf-8").strip()
    clean = text.replace(PLACEHOLDER.strip(), "").strip()
    return clean


def set_inbox_content(content):
    content = content.strip()
    if content:
        INBOX_FILE.write_text(f"{PLACEHOLDER}\n\n{content}\n", encoding="utf-8")
    else:
        INBOX_FILE.write_text(f"{PLACEHOLDER}\n", encoding="utf-8")


def load_chat_history():
    if not CHAT_HISTORY_FILE.exists():
        return []
    try:
        return json.loads(CHAT_HISTORY_FILE.read_text(encoding="utf-8"))
    except Exception:
        return []


def save_chat_history(history):
    CHAT_HISTORY_FILE.write_text(json.dumps(history, indent=2), encoding="utf-8")


def parse_dialogue_file(path: Path):
    text = path.read_text(encoding="utf-8")
    fm_match = FRONTMATTER_RE.match(text)
    metadata = {}
    body = text
    if fm_match:
        fm_text = fm_match.group(1)
        body = text[fm_match.end():]
        for line in fm_text.splitlines():
            if ":" in line:
                k, v = line.split(":", 1)
                metadata[k.strip()] = v.strip()

    title = metadata.get("title", path.stem.replace("-", " ").title())
    date_str = metadata.get("date", path.stem[:10] if len(path.stem) >= 10 else "")
    dtype = metadata.get("type", "dialogue")
    return {
        "filename": path.name,
        "title": title,
        "date": date_str,
        "type": dtype,
        "raw_body": body,
        "raw_full": text,
    }


def get_all_dialogues():
    if not DIALOGUES_DIR.exists():
        return []
    files = sorted(DIALOGUES_DIR.glob("*.md"), reverse=True)
    return [parse_dialogue_file(f) for f in files]


def generate_conductor_reply(user_message, history):
    context_msgs = []
    for h in history[-8:]:
        role = "User (DevOps / Architect)" if h["role"] == "user" else "Conductor Roommate"
        context_msgs.append(f"{role}: {h['content']}")

    full_prompt = (
        f"{SYSTEM_PROMPT}\n\n"
        f"--- RECENT CONVERSATION OVER TEA ---\n"
        f"{chr(10).join(context_msgs)}\n\n"
        f"User (DevOps / Architect): {user_message}\n\n"
        f"Conductor Roommate:"
    )

    env = os.environ.copy()
    env["PATH"] = f"/opt/homebrew/bin:/usr/local/bin:{env.get('PATH', '')}"

    # Try agy first
    try:
        proc = subprocess.run(
            ["agy", "-p", full_prompt],
            capture_output=True,
            text=True,
            timeout=45,
            env=env,
            cwd=str(ROOT),
        )
        if proc.returncode == 0 and proc.stdout.strip():
            return proc.stdout.strip()
    except Exception as e:
        print(f"agy invocation error: {e}")

    # Fallback to claude
    try:
        proc = subprocess.run(
            ["claude", "-p", full_prompt, "--dangerously-skip-permissions"],
            capture_output=True,
            text=True,
            timeout=60,
            env=env,
            cwd=str(ROOT),
            stdin=subprocess.DEVNULL,
        )
        if proc.returncode == 0 and proc.stdout.strip():
            out = proc.stdout.strip()
            out = re.sub(r"^Warning:.*?\n", "", out).strip()
            return out
    except Exception as e:
        print(f"claude invocation error: {e}")

    return "*Sets his mug down with a soft, warm clink, watching the steam rise.* Drink your tea while it is hot. Think about where the acoustic seam lies in that score, and ask me again—I want to hear how you govern the silence."


# --- MODERN SINGLE-PAGE APPLICATION UI ---
HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Room 402 · Late-Night Conductor & Architect Studio</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700;800&family=Lora:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <style>
    :root {
      --bg-deep: #08070c;
      --bg-panel: #0f0d16;
      --bg-card: #151220;
      --bg-card-hover: #1c182b;
      --border-subtle: #241f33;
      --border-strong: #38304f;
      --text-main: #f5f0e6;
      --text-muted: #a39b8e;
      --text-dim: #6e675b;
      --accent-warm: #e58239;
      --accent-glow: rgba(229, 130, 57, 0.25);
      --gold: #d4af37;
      --gold-dim: #8b7324;
      --green-soft: #4eaa7b;
      --red-soft: #d95b5b;
      --font-body: 'Plus Jakarta Sans', -apple-system, sans-serif;
      --font-serif: 'Lora', Georgia, serif;
      --font-display: 'Cinzel', serif;
      --font-mono: 'JetBrains Mono', monospace;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      background: var(--bg-deep);
      color: var(--text-main);
      font-family: var(--font-body);
      height: 100vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    /* Top Bar */
    header {
      height: 64px;
      background: rgba(15, 13, 22, 0.95);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--border-subtle);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 24px;
      flex-shrink: 0;
      z-index: 50;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .brand-icon {
      font-size: 24px;
      animation: steamSway 4s ease-in-out infinite alternate;
      cursor: pointer;
    }

    @keyframes steamSway {
      0% { transform: translateY(0px) rotate(0deg); }
      100% { transform: translateY(-2px) rotate(3deg); }
    }

    .brand-title {
      font-family: var(--font-display);
      font-size: 16px;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: var(--text-main);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .brand-title span {
      color: var(--accent-warm);
    }

    .brand-sub {
      font-size: 11px;
      color: var(--text-dim);
      letter-spacing: 0.04em;
    }

    /* Navigation Tabs */
    .nav-tabs {
      display: flex;
      gap: 6px;
      background: rgba(8, 7, 12, 0.6);
      padding: 4px;
      border-radius: 30px;
      border: 1px solid var(--border-subtle);
    }

    .nav-tab {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 16px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 500;
      color: var(--text-muted);
      cursor: pointer;
      border: none;
      background: transparent;
      transition: all 0.2s ease;
    }

    .nav-tab:hover {
      color: var(--text-main);
      background: rgba(255, 255, 255, 0.04);
    }

    .nav-tab.active {
      background: var(--accent-warm);
      color: #08070c;
      font-weight: 600;
      box-shadow: 0 2px 10px var(--accent-glow);
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .audio-btn {
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      color: var(--text-muted);
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 12px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s ease;
    }

    .audio-btn:hover {
      border-color: var(--accent-warm);
      color: var(--text-main);
    }

    .audio-btn.playing {
      border-color: var(--accent-warm);
      color: var(--accent-warm);
      background: rgba(229, 130, 57, 0.12);
    }

    /* Main Container */
    main {
      flex: 1;
      overflow: hidden;
      position: relative;
      display: flex;
    }

    .view-panel {
      position: absolute;
      inset: 0;
      display: none;
      overflow: hidden;
    }

    .view-panel.active {
      display: flex;
    }

    /* --- VIEW 1: LATE-NIGHT TEA CHAT --- */
    .chat-view {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      max-width: 900px;
      margin: 0 auto;
      padding: 0 20px;
    }

    .chat-scroll {
      flex: 1;
      overflow-y: auto;
      padding: 24px 0 16px;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .message-row {
      display: flex;
      flex-direction: column;
      gap: 6px;
      max-width: 100%;
      animation: fadeIn 0.3s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .message-row.user {
      align-items: flex-end;
    }

    .message-row.assistant {
      align-items: flex-start;
    }

    .msg-header {
      font-size: 11px;
      color: var(--text-dim);
      letter-spacing: 0.05em;
      text-transform: uppercase;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0 4px;
    }

    .msg-header .badge {
      font-size: 9px;
      padding: 2px 6px;
      border-radius: 4px;
      background: var(--border-subtle);
      color: var(--accent-warm);
    }

    .msg-bubble {
      padding: 18px 22px;
      border-radius: 16px;
      font-size: 15px;
      line-height: 1.68;
    }

    .message-row.user .msg-bubble {
      background: var(--bg-card);
      border: 1px solid var(--border-strong);
      color: var(--text-main);
      border-bottom-right-radius: 4px;
      max-width: 80%;
    }

    .message-row.assistant .msg-bubble {
      background: rgba(19, 17, 27, 0.85);
      border: 1px solid var(--border-subtle);
      color: var(--text-main);
      font-family: var(--font-serif);
      font-size: 16px;
      line-height: 1.75;
      border-bottom-left-radius: 4px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      max-width: 100%;
    }

    .msg-bubble p {
      margin-bottom: 14px;
    }
    .msg-bubble p:last-child {
      margin-bottom: 0;
    }

    .msg-bubble strong {
      color: var(--gold);
      font-weight: 600;
    }

    .msg-bubble em {
      color: #e8d0b5;
      font-style: italic;
    }

    .chat-input-bar {
      padding: 16px 0 24px;
      flex-shrink: 0;
    }

    .input-box-wrapper {
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      border-radius: 16px;
      padding: 10px 14px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4);
      transition: border-color 0.2s ease;
    }

    .input-box-wrapper:focus-within {
      border-color: var(--accent-warm);
      box-shadow: 0 8px 30px var(--accent-glow);
    }

    .chat-textarea {
      width: 100%;
      background: transparent;
      border: none;
      outline: none;
      color: var(--text-main);
      font-family: var(--font-body);
      font-size: 15px;
      line-height: 1.5;
      resize: none;
      height: 48px;
      max-height: 140px;
    }

    .chat-textarea::placeholder {
      color: var(--text-dim);
    }

    .input-actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-top: 1px solid rgba(255, 255, 255, 0.04);
      padding-top: 8px;
    }

    .quick-triggers {
      display: flex;
      gap: 6px;
    }

    .quick-pill {
      font-size: 11px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--border-subtle);
      color: var(--text-muted);
      padding: 4px 10px;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .quick-pill:hover {
      background: rgba(229, 130, 57, 0.15);
      border-color: var(--accent-warm);
      color: var(--text-main);
    }

    .send-btn {
      background: var(--accent-warm);
      color: #08070c;
      border: none;
      padding: 6px 18px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s ease;
    }

    .send-btn:hover {
      background: #f0954f;
      box-shadow: 0 0 12px var(--accent-glow);
    }

    .send-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* --- VIEW 2: PODIUM QUIZZES & SCENARIOS --- */
    .quiz-view {
      width: 100%;
      height: 100%;
      display: grid;
      grid-template-columns: 320px 1fr;
      overflow: hidden;
    }

    .quiz-sidebar {
      background: var(--bg-panel);
      border-right: 1px solid var(--border-subtle);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .quiz-sidebar-header {
      padding: 18px 20px;
      border-bottom: 1px solid var(--border-subtle);
      font-family: var(--font-display);
      font-size: 13px;
      letter-spacing: 0.06em;
      color: var(--gold);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .quiz-list {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .quiz-card {
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      border-radius: 12px;
      padding: 14px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .quiz-card:hover {
      border-color: var(--border-strong);
      background: var(--bg-card-hover);
    }

    .quiz-card.active {
      border-color: var(--accent-warm);
      background: rgba(229, 130, 57, 0.08);
      box-shadow: 0 0 16px var(--accent-glow);
    }

    .quiz-card-cat {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--accent-warm);
      margin-bottom: 4px;
    }

    .quiz-card-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-main);
      margin-bottom: 6px;
    }

    .quiz-card-hall {
      font-size: 11px;
      color: var(--text-dim);
    }

    .quiz-main {
      flex: 1;
      overflow-y: auto;
      padding: 32px 40px;
      display: flex;
      flex-direction: column;
      gap: 24px;
      max-width: 860px;
    }

    .quiz-header-banner {
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      border-radius: 16px;
      padding: 24px;
      position: relative;
      overflow: hidden;
    }

    .quiz-header-banner::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: linear-gradient(90deg, var(--accent-warm), var(--gold));
    }

    .quiz-meta-tag {
      display: inline-block;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--accent-warm);
      font-weight: 600;
      margin-bottom: 8px;
    }

    .quiz-title-main {
      font-family: var(--font-serif);
      font-size: 26px;
      font-weight: 600;
      color: var(--text-main);
      margin-bottom: 12px;
    }

    .quiz-scenario-box {
      font-family: var(--font-serif);
      font-size: 16px;
      line-height: 1.75;
      color: #dfd8cc;
      background: rgba(8, 7, 12, 0.4);
      padding: 16px 20px;
      border-radius: 12px;
      border-left: 3px solid var(--gold);
      margin-top: 14px;
    }

    .quiz-question-title {
      font-size: 16px;
      font-weight: 600;
      color: var(--gold);
      margin-top: 8px;
      margin-bottom: 16px;
    }

    .quiz-options-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .quiz-opt-btn {
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      border-radius: 14px;
      padding: 18px 22px;
      text-align: left;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: flex-start;
      gap: 16px;
      color: var(--text-main);
    }

    .quiz-opt-btn:hover:not(:disabled) {
      border-color: var(--accent-warm);
      background: var(--bg-card-hover);
      transform: translateX(4px);
    }

    .quiz-opt-btn .opt-badge {
      font-family: var(--font-display);
      font-weight: 700;
      font-size: 14px;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: var(--bg-deep);
      border: 1px solid var(--border-strong);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      color: var(--accent-warm);
    }

    .quiz-opt-btn.correct {
      border-color: var(--green-soft);
      background: rgba(78, 170, 123, 0.1);
    }

    .quiz-opt-btn.correct .opt-badge {
      background: var(--green-soft);
      color: #08070c;
    }

    .quiz-opt-btn.wrong {
      border-color: var(--red-soft);
      background: rgba(217, 91, 91, 0.1);
    }

    .quiz-opt-btn.wrong .opt-badge {
      background: var(--red-soft);
      color: #ffffff;
    }

    .quiz-feedback-box {
      display: none;
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      border-radius: 16px;
      padding: 24px;
      animation: fadeIn 0.3s ease;
    }

    .quiz-feedback-box.active {
      display: block;
    }

    .feedback-title {
      font-family: var(--font-display);
      font-size: 16px;
      font-weight: 700;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .feedback-body {
      font-family: var(--font-serif);
      font-size: 15px;
      line-height: 1.7;
      color: var(--text-main);
      margin-bottom: 16px;
    }

    .takeaway-card {
      background: rgba(212, 175, 55, 0.08);
      border-left: 3px solid var(--gold);
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 13px;
      line-height: 1.6;
      color: #e5d8b8;
    }

    /* --- VIEW 3: ACOUSTIC LAB & STAGE SIMULATOR --- */
    .lab-view {
      width: 100%;
      height: 100%;
      display: grid;
      grid-template-columns: 360px 1fr;
      overflow: hidden;
    }

    .lab-controls {
      background: var(--bg-panel);
      border-right: 1px solid var(--border-subtle);
      padding: 24px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .lab-ctrl-title {
      font-family: var(--font-display);
      font-size: 14px;
      color: var(--gold);
      letter-spacing: 0.06em;
      border-bottom: 1px solid var(--border-subtle);
      padding-bottom: 8px;
    }

    .control-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .control-label {
      font-size: 12px;
      color: var(--text-muted);
      display: flex;
      justify-content: space-between;
    }

    .control-label span {
      color: var(--accent-warm);
      font-family: var(--font-mono);
    }

    .lab-select, .lab-slider {
      width: 100%;
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      color: var(--text-main);
      padding: 8px 12px;
      border-radius: 8px;
      outline: none;
      font-family: var(--font-body);
      font-size: 13px;
    }

    .lab-slider {
      padding: 0;
      height: 6px;
      accent-color: var(--accent-warm);
      cursor: pointer;
    }

    .lab-stage-panel {
      flex: 1;
      display: flex;
      flex-direction: column;
      padding: 24px;
      gap: 16px;
      overflow: hidden;
    }

    .canvas-card {
      flex: 1;
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      border-radius: 16px;
      position: relative;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    #stageCanvas {
      width: 100%;
      height: 100%;
    }

    .sim-readout {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      flex-shrink: 0;
    }

    .readout-box {
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      border-radius: 12px;
      padding: 12px 16px;
    }

    .readout-label {
      font-size: 10px;
      color: var(--text-dim);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .readout-value {
      font-size: 18px;
      font-weight: 700;
      font-family: var(--font-mono);
      color: var(--text-main);
      margin-top: 4px;
    }

    .readout-value.warning {
      color: var(--red-soft);
    }
    .readout-value.ok {
      color: var(--green-soft);
    }

    /* --- VIEW 4: DIALOGUE ARCHIVE --- */
    .archive-view {
      width: 100%;
      height: 100%;
      display: grid;
      grid-template-columns: 340px 1fr;
      overflow: hidden;
    }

    .archive-sidebar {
      background: var(--bg-panel);
      border-right: 1px solid var(--border-subtle);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .archive-search {
      padding: 16px;
      border-bottom: 1px solid var(--border-subtle);
    }

    .archive-input {
      width: 100%;
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      color: var(--text-main);
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 13px;
      outline: none;
    }

    .dialogue-list {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .dialogue-item {
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      border-radius: 10px;
      padding: 12px 14px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .dialogue-item:hover {
      border-color: var(--border-strong);
      background: var(--bg-card-hover);
    }

    .dialogue-item.active {
      border-color: var(--accent-warm);
      background: rgba(229, 130, 57, 0.08);
    }

    .dialogue-item-date {
      font-size: 10px;
      font-family: var(--font-mono);
      color: var(--accent-warm);
      margin-bottom: 4px;
    }

    .dialogue-item-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-main);
    }

    .archive-reader {
      flex: 1;
      overflow-y: auto;
      padding: 40px 60px;
      background: var(--bg-deep);
    }

    .reader-article {
      max-width: 720px;
      margin: 0 auto;
      font-family: var(--font-serif);
      font-size: 17px;
      line-height: 1.8;
      color: #eae3d5;
    }

    .reader-article h1 {
      font-family: var(--font-display);
      font-size: 32px;
      font-weight: 700;
      color: var(--text-main);
      margin-bottom: 8px;
    }

    .reader-article .reader-meta {
      font-family: var(--font-mono);
      font-size: 12px;
      color: var(--gold);
      margin-bottom: 32px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--border-subtle);
    }

    .reader-article h2 {
      font-family: var(--font-display);
      font-size: 20px;
      color: var(--gold);
      margin-top: 36px;
      margin-bottom: 16px;
    }

    .reader-article p {
      margin-bottom: 20px;
    }

    .reader-article strong {
      color: #ffffff;
    }

    .reader-article em {
      color: #f3dfca;
    }

    /* Scrollbars */
    ::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    ::-webkit-scrollbar-track {
      background: transparent;
    }
    ::-webkit-scrollbar-thumb {
      background: var(--border-strong);
      border-radius: 3px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: var(--accent-warm);
    }
  </style>
</head>
<body>

  <!-- Top Navigation Bar -->
  <header>
    <div class="brand">
      <div class="brand-icon" id="kettleIcon" title="Pour tea / Trigger sound">🫖</div>
      <div>
        <div class="brand-title">ROOM 402 <span>·</span> LATE-NIGHT CONDUCTOR</div>
        <div class="brand-sub">Symphony Orchestra Craft & Enterprise Architecture</div>
      </div>
    </div>

    <nav class="nav-tabs">
      <button class="nav-tab active" onclick="switchView('chat')">☕ Tea Dialogues</button>
      <button class="nav-tab" onclick="switchView('quiz')">🎯 Podium Quizzes</button>
      <button class="nav-tab" onclick="switchView('lab')">🏛️ Acoustic Lab</button>
      <button class="nav-tab" onclick="switchView('archive')">📜 Score Archive</button>
    </nav>

    <div class="header-actions">
      <button class="audio-btn" id="audioToggleBtn" onclick="toggleAmbientAudio()">
        <span id="audioIcon">🌧️</span> <span id="audioText">Rain & Tea Ambient</span>
      </button>
    </div>
  </header>

  <!-- Main Viewports -->
  <main>
    
    <!-- VIEW 1: LATE-NIGHT TEA CHAT -->
    <div class="view-panel active" id="chatView">
      <div class="chat-view">
        <div class="chat-scroll" id="chatScroll">
          <!-- Chat messages rendered dynamically -->
        </div>

        <div class="chat-input-bar">
          <div class="input-box-wrapper">
            <textarea 
              class="chat-textarea" 
              id="chatInput" 
              placeholder="Ask about dynamic ceilings, counterpoint seams, latency drift over tea..."
              onkeydown="handleTextKey(event)"
            ></textarea>
            <div class="input-actions">
              <div class="quick-triggers">
                <button class="quick-pill" onclick="sendQuickPrompt('Give me a foundational conductor quiz on latency and acoustic physics.')">🎯 Trigger Quiz</button>
                <button class="quick-pill" onclick="sendQuickPrompt('What is the difference between individual virtuosity and enterprise agreement?')">🎻 Seams vs Homework</button>
                <button class="quick-pill" onclick="sendQuickPrompt('How do I handle noisy neighbor instruments blowing the dynamic ceiling?')">🎺 Fortissimo Ceiling</button>
              </div>
              <button class="send-btn" id="sendBtn" onclick="submitUserMessage()">
                <span>Pour</span> <span>☕</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- VIEW 2: PODIUM QUIZZES & SCENARIOS -->
    <div class="view-panel" id="quizView">
      <div class="quiz-view">
        <div class="quiz-sidebar">
          <div class="quiz-sidebar-header">
            <span>MASTERCLASS SCENARIOS</span>
            <span id="quizCount">5 Cases</span>
          </div>
          <div class="quiz-list" id="quizList">
            <!-- Quiz cards rendered dynamically -->
          </div>
        </div>

        <div class="quiz-main" id="quizMain">
          <div class="quiz-header-banner">
            <div class="quiz-meta-tag" id="qCategory">Acoustic Clearance</div>
            <h2 class="quiz-title-main" id="qTitle">The Cathedral Reverberation Crisis</h2>
            <div style="font-size: 13px; color: var(--gold);" id="qHall">📍 Stone Cathedral (RT60: 4.5s Tail)</div>
            <div class="quiz-scenario-box" id="qScenario">
              Loading scenario...
            </div>
          </div>

          <div class="quiz-question-title" id="qQuestion">
            What is your architectural intervention?
          </div>

          <div class="quiz-options-list" id="qOptions">
            <!-- Options rendered dynamically -->
          </div>

          <div class="quiz-feedback-box" id="qFeedback">
            <div class="feedback-title" id="fbTitle">🎯 MAESTRO'S VERDICT</div>
            <div class="feedback-body" id="fbText"></div>
            <div class="takeaway-card">
              <strong>Enterprise Architecture Principle:</strong>
              <div id="fbTakeaway" style="margin-top: 4px;"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- VIEW 3: ACOUSTIC LAB & STAGE SIMULATOR -->
    <div class="view-panel" id="labView">
      <div class="lab-view">
        <div class="lab-controls">
          <div class="lab-ctrl-title">ROOM & ACOUSTIC PARAMETERS</div>

          <div class="control-group">
            <label class="control-label">Venue & Reverberation (RT60) <span id="valRt60">4.5s</span></label>
            <select class="lab-select" id="selVenue" onchange="updateSimVenue()">
              <option value="4.5">Stone Cathedral (4.5s Tail - High Reverberation)</option>
              <option value="1.9" selected>Concert Symphony Hall (1.9s Tail - Balanced)</option>
              <option value="0.7">Dry Recording Studio (0.7s Tail - Tight)</option>
            </select>
          </div>

          <div class="control-group">
            <label class="control-label">Master Tempo <span id="valBpm">120 BPM</span></label>
            <input type="range" class="lab-slider" id="sldBpm" min="60" max="180" value="120" oninput="updateSimParams()">
          </div>

          <div class="control-group">
            <label class="control-label">Heavy Brass Dynamic (Trombones) <span id="valBrass">ff (88 dB)</span></label>
            <input type="range" class="lab-slider" id="sldBrass" min="40" max="100" value="88" oninput="updateSimParams()">
          </div>

          <div class="control-group">
            <label class="control-label">Solo Woodwind Dynamic (Flute) <span id="valFlute">p (58 dB)</span></label>
            <input type="range" class="lab-slider" id="sldFlute" min="40" max="100" value="58" oninput="updateSimParams()">
          </div>

          <div class="control-group">
            <label class="control-label">Offstage Distance <span id="valDist">35 meters</span></label>
            <input type="range" class="lab-slider" id="sldDist" min="5" max="60" value="35" oninput="updateSimParams()">
          </div>

          <button class="audio-btn" style="width: 100%; justify-content: center; margin-top: 8px;" onclick="playSimSoundPulse()">
            🔊 Test Acoustic Tone & Reverb
          </button>
        </div>

        <div class="lab-stage-panel">
          <div class="canvas-card">
            <canvas id="stageCanvas"></canvas>
          </div>

          <div class="sim-readout">
            <div class="readout-box">
              <div class="readout-label">Acoustic Latency</div>
              <div class="readout-value" id="roLatency">102 ms</div>
            </div>
            <div class="readout-box">
              <div class="readout-label">Dynamic Headroom</div>
              <div class="readout-value" id="roHeadroom">+12 dB</div>
            </div>
            <div class="readout-box">
              <div class="readout-label">Timbre Collision</div>
              <div class="readout-value ok" id="roCollision">Safe</div>
            </div>
            <div class="readout-box">
              <div class="readout-label">Audience Clarity</div>
              <div class="readout-value ok" id="roClarity">94%</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- VIEW 4: DIALOGUE ARCHIVE -->
    <div class="view-panel" id="archiveView">
      <div class="archive-view">
        <div class="archive-sidebar">
          <div class="archive-search">
            <input type="text" class="archive-input" id="archiveSearch" placeholder="Search movements & themes..." oninput="filterDialogues()">
          </div>
          <div class="dialogue-list" id="dialogueList">
            <!-- Dialogue items rendered dynamically -->
          </div>
        </div>

        <div class="archive-reader" id="archiveReader">
          <article class="reader-article" id="readerArticle">
            <div style="color: var(--text-dim); font-size: 14px; text-align: center; margin-top: 100px;">
              Select a score movement from the left to read.
            </div>
          </article>
        </div>
      </div>
    </div>

  </main>

  <script>
    // State
    let currentView = 'chat';
    let chatHistory = [];
    let dialogues = [];
    let quizzes = [];
    let activeQuizIndex = 0;
    let audioContext = null;
    let ambientGain = null;
    let isAmbientPlaying = false;

    // Initialize
    window.addEventListener('DOMContentLoaded', async () => {
      await loadInitialData();
      initStageCanvas();
    });

    async function loadInitialData() {
      try {
        // Load chat history
        const chatRes = await fetch('/api/chat-history');
        chatHistory = await chatRes.json();
        renderChat();

        // Load quizzes
        const quizRes = await fetch('/api/quizzes');
        quizzes = await quizRes.json();
        renderQuizList();
        selectQuiz(0);

        // Load dialogues
        const diaRes = await fetch('/api/dialogues');
        dialogues = await diaRes.json();
        renderDialogueList(dialogues);
        if (dialogues.length > 0) {
          selectDialogue(0);
        }
      } catch (err) {
        console.error('Data load error:', err);
      }
    }

    function switchView(viewName) {
      currentView = viewName;
      document.querySelectorAll('.nav-tab').forEach((tab, i) => {
        tab.classList.toggle('active', ['chat', 'quiz', 'lab', 'archive'][i] === viewName);
      });
      document.querySelectorAll('.view-panel').forEach(panel => {
        panel.classList.remove('active');
      });
      document.getElementById(viewName + 'View').classList.add('active');

      if (viewName === 'lab') {
        resizeStageCanvas();
      }
    }

    // --- CHAT LOGIC ---
    function renderChat() {
      const container = document.getElementById('chatScroll');
      container.innerHTML = '';

      if (chatHistory.length === 0) {
        container.innerHTML = `
          <div class="message-row assistant">
            <div class="msg-header">
              <span>Maestro Flatmate</span>
              <span class="badge">Room 402</span>
            </div>
            <div class="msg-bubble">
              <p><em>*Pours hot tea into your mug, listening to the radiator hum.*</em></p>
              <p>Pull up a chair. You spent all day tuning instrument valves in the pit, and now you have a dozen systems demanding a master score. Tell me what is colliding on your stand tonight, or pick a quiz to test your ears on acoustic clearance.</p>
            </div>
          </div>
        `;
        return;
      }

      chatHistory.forEach(msg => {
        const row = document.createElement('div');
        row.className = `message-row ${msg.role === 'user' ? 'user' : 'assistant'}`;

        const header = document.createElement('div');
        header.className = 'msg-header';
        header.innerHTML = msg.role === 'user' 
          ? `<span>You</span> <span class="badge">Architect</span>` 
          : `<span>Maestro Flatmate</span> <span class="badge">Room 402</span>`;

        const bubble = document.createElement('div');
        bubble.className = 'msg-bubble';
        bubble.innerHTML = marked.parse(msg.content);

        row.appendChild(header);
        row.appendChild(bubble);
        container.appendChild(row);
      });

      container.scrollTop = container.scrollHeight;
    }

    function handleTextKey(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        submitUserMessage();
      }
    }

    function sendQuickPrompt(promptText) {
      document.getElementById('chatInput').value = promptText;
      submitUserMessage();
    }

    async function submitUserMessage() {
      const input = document.getElementById('chatInput');
      const text = input.value.trim();
      if (!text) return;

      const sendBtn = document.getElementById('sendBtn');
      sendBtn.disabled = true;
      input.value = '';

      // Optimistic append
      chatHistory.push({ role: 'user', content: text });
      renderChat();

      // Show typing indicator
      const container = document.getElementById('chatScroll');
      const typingRow = document.createElement('div');
      typingRow.className = 'message-row assistant';
      typingRow.id = 'typingIndicator';
      typingRow.innerHTML = `
        <div class="msg-header"><span>Maestro Flatmate</span> <span class="badge">Steeping Tea...</span></div>
        <div class="msg-bubble"><p><em>*Taps his mug, listening to the reverberation...*</em></p></div>
      `;
      container.appendChild(typingRow);
      container.scrollTop = container.scrollHeight;

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text })
        });
        const data = await res.json();
        
        const typing = document.getElementById('typingIndicator');
        if (typing) typing.remove();

        if (data.ok) {
          chatHistory.push({ role: 'assistant', content: data.reply });
          renderChat();
        }
      } catch (err) {
        console.error('Chat error:', err);
      } finally {
        sendBtn.disabled = false;
      }
    }

    // --- QUIZ LOGIC ---
    function renderQuizList() {
      const list = document.getElementById('quizList');
      list.innerHTML = '';
      document.getElementById('quizCount').innerText = `${quizzes.length} Cases`;

      quizzes.forEach((q, idx) => {
        const card = document.createElement('div');
        card.className = `quiz-card ${idx === activeQuizIndex ? 'active' : ''}`;
        card.onclick = () => selectQuiz(idx);
        card.innerHTML = `
          <div class="quiz-card-cat">${q.category}</div>
          <div class="quiz-card-title">${q.title}</div>
          <div class="quiz-card-hall">📍 ${q.hall}</div>
        `;
        list.appendChild(card);
      });
    }

    function selectQuiz(idx) {
      activeQuizIndex = idx;
      renderQuizList();
      const q = quizzes[idx];
      if (!q) return;

      document.getElementById('qCategory').innerText = q.category;
      document.getElementById('qTitle').innerText = q.title;
      document.getElementById('qHall').innerText = `📍 ${q.hall}`;
      document.getElementById('qScenario').innerText = q.scenario;
      document.getElementById('qQuestion').innerText = q.question;

      const optContainer = document.getElementById('qOptions');
      optContainer.innerHTML = '';
      document.getElementById('qFeedback').classList.remove('active');

      q.options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'quiz-opt-btn';
        btn.onclick = () => handleQuizAnswer(opt);
        btn.innerHTML = `
          <div class="opt-badge">${opt.id}</div>
          <div>${opt.text}</div>
        `;
        optContainer.appendChild(btn);
      });
    }

    function handleQuizAnswer(selectedOpt) {
      const q = quizzes[activeQuizIndex];
      const buttons = document.querySelectorAll('.quiz-opt-btn');

      buttons.forEach((btn, i) => {
        btn.disabled = true;
        const opt = q.options[i];
        if (opt.is_correct) {
          btn.classList.add('correct');
        } else if (opt.id === selectedOpt.id) {
          btn.classList.add('wrong');
        }
      });

      const fbBox = document.getElementById('qFeedback');
      fbBox.classList.add('active');

      document.getElementById('fbTitle').innerHTML = selectedOpt.is_correct 
        ? `🎯 MAESTRO'S COMMENDATION (FLAWLESS SCORE)` 
        : `⚠️ COLLISION DETECTED (ACOUSTIC FAILURE)`;
      document.getElementById('fbTitle').style.color = selectedOpt.is_correct ? 'var(--green-soft)' : 'var(--red-soft)';
      document.getElementById('fbText').innerText = selectedOpt.feedback;
      document.getElementById('fbTakeaway').innerText = q.architectural_takeaway;
    }

    // --- ACOUSTIC STAGE LAB CANVAS ---
    let canvas, ctx;
    let simAnimId = null;
    let waveTime = 0;

    function initStageCanvas() {
      canvas = document.getElementById('stageCanvas');
      ctx = canvas.getContext('2d');
      window.addEventListener('resize', resizeStageCanvas);
      resizeStageCanvas();
      runCanvasLoop();
    }

    function resizeStageCanvas() {
      if (!canvas) return;
      canvas.width = canvas.parentElement.clientWidth * window.devicePixelRatio;
      canvas.height = canvas.parentElement.clientHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }

    function updateSimVenue() {
      const rt60 = document.getElementById('selVenue').value;
      document.getElementById('valRt60').innerText = `${rt60}s`;
      updateSimParams();
    }

    function updateSimParams() {
      const bpm = document.getElementById('sldBpm').value;
      const brass = document.getElementById('sldBrass').value;
      const flute = document.getElementById('sldFlute').value;
      const dist = document.getElementById('sldDist').value;
      const rt60 = parseFloat(document.getElementById('selVenue').value);

      document.getElementById('valBpm').innerText = `${bpm} BPM`;
      document.getElementById('valBrass').innerText = `${brass >= 85 ? 'ff' : brass >= 70 ? 'f' : 'mf'} (${brass} dB)`;
      document.getElementById('valFlute').innerText = `${flute <= 55 ? 'pp' : flute <= 65 ? 'p' : 'mf'} (${flute} dB)`;
      document.getElementById('valDist').innerText = `${dist} meters`;

      // Calculate physical values
      const latencyMs = Math.round((dist / 343) * 1000);
      const headroomDb = Math.round(100 - brass);
      const isCollision = (brass - flute > 25) && rt60 > 2.0;
      const clarityPct = Math.max(10, Math.min(99, Math.round(100 - (rt60 * 12) - (brass - flute) * 0.4)));

      document.getElementById('roLatency').innerText = `${latencyMs} ms`;
      document.getElementById('roHeadroom').innerText = `${headroomDb} dB`;
      
      const colEl = document.getElementById('roCollision');
      colEl.innerText = isCollision ? '⚠️ Masking Danger' : 'Safe Clearance';
      colEl.className = `readout-value ${isCollision ? 'warning' : 'ok'}`;

      const clEl = document.getElementById('roClarity');
      clEl.innerText = `${clarityPct}%`;
      clEl.className = `readout-value ${clarityPct < 60 ? 'warning' : 'ok'}`;
    }

    function runCanvasLoop() {
      waveTime += 0.03;
      drawStage();
      simAnimId = requestAnimationFrame(runCanvasLoop);
    }

    function drawStage() {
      if (!ctx || !canvas) return;
      const w = canvas.width / window.devicePixelRatio;
      const h = canvas.height / window.devicePixelRatio;

      ctx.clearRect(0, 0, w, h);

      // Background acoustics grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }

      const centerX = w / 2;
      const podiumY = h - 60;

      // Draw Hall Shell
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.2)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(centerX, podiumY, h * 0.8, Math.PI, 0, false);
      ctx.stroke();

      // Sound pressure waves from heavy brass
      const brassVal = parseFloat(document.getElementById('sldBrass').value);
      const rt60 = parseFloat(document.getElementById('selVenue').value);
      const waveCount = 5;

      for (let i = 0; i < waveCount; i++) {
        const radius = ((waveTime * 60 + i * 45) % (h * 0.75));
        const alpha = Math.max(0, (1 - radius / (h * 0.75))) * (brassVal / 100) * (rt60 / 4.5);
        ctx.strokeStyle = `rgba(229, 130, 57, ${alpha * 0.6})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(centerX + 80, podiumY - 140, radius, Math.PI * 0.8, Math.PI * 2.2, false);
        ctx.stroke();
      }

      // Draw Sections
      // 1. Conductor Podium
      ctx.fillStyle = '#d4af37';
      ctx.beginPath();
      ctx.arc(centerX, podiumY, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = '10px Plus Jakarta Sans';
      ctx.fillText('Podium', centerX - 18, podiumY + 22);

      // 2. Solo Woodwinds
      ctx.fillStyle = '#4eaa7b';
      ctx.beginPath();
      ctx.arc(centerX - 60, podiumY - 80, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillText('Solo Flute', centerX - 85, podiumY - 95);

      // 3. Heavy Brass
      ctx.fillStyle = '#e58239';
      ctx.beginPath();
      ctx.arc(centerX + 80, podiumY - 140, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillText('Trombones (ff)', centerX + 50, podiumY - 160);

      // 4. Offstage Trumpet
      const dist = parseFloat(document.getElementById('sldDist').value);
      const offstageY = podiumY - (dist * 3.8);
      ctx.fillStyle = '#d95b5b';
      ctx.beginPath();
      ctx.arc(centerX + 160, Math.max(40, offstageY), 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillText(`Offstage (${dist}m)`, centerX + 110, Math.max(40, offstageY) - 12);
    }

    function playSimSoundPulse() {
      initAudio();
      if (!audioContext) return;

      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const rt60 = parseFloat(document.getElementById('selVenue').value);

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(146.83, audioContext.currentTime); // D3 trombone tone

      gain.gain.setValueAtTime(0.3, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + rt60);

      osc.connect(gain);
      gain.connect(audioContext.destination);

      osc.start();
      osc.stop(audioContext.currentTime + rt60);
    }

    // --- AMBIENT SOUND GENERATOR (Web Audio API) ---
    function initAudio() {
      if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
    }

    function toggleAmbientAudio() {
      initAudio();
      const btn = document.getElementById('audioToggleBtn');

      if (isAmbientPlaying) {
        if (ambientGain) {
          ambientGain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.5);
        }
        isAmbientPlaying = false;
        btn.classList.remove('playing');
        document.getElementById('audioText').innerText = 'Rain & Tea Ambient (Off)';
      } else {
        startRainAmbient();
        isAmbientPlaying = true;
        btn.classList.add('playing');
        document.getElementById('audioText').innerText = 'Rain & Tea Ambient (Playing)';
      }
    }

    function startRainAmbient() {
      if (!audioContext) return;

      // Synthesize rain noise buffer
      const bufferSize = audioContext.sampleRate * 2;
      const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
      const data = buffer.getChannelData(0);
      let lastOut = 0.0;

      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + (0.02 * white)) / 1.02; // Pink/Brownian rain filter
        lastOut = data[i];
        data[i] *= 2.5;
      }

      const noise = audioContext.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      const filter = audioContext.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, audioContext.currentTime);

      ambientGain = audioContext.createGain();
      ambientGain.gain.setValueAtTime(0.0001, audioContext.currentTime);
      ambientGain.gain.exponentialRampToValueAtTime(0.12, audioContext.currentTime + 1.0);

      noise.connect(filter);
      filter.connect(ambientGain);
      ambientGain.connect(audioContext.destination);

      noise.start();
    }

    // --- DIALOGUE ARCHIVE ---
    function renderDialogueList(items) {
      const list = document.getElementById('dialogueList');
      list.innerHTML = '';

      items.forEach((item, idx) => {
        const el = document.createElement('div');
        el.className = 'dialogue-item';
        el.onclick = () => selectDialogue(idx);
        el.innerHTML = `
          <div class="dialogue-item-date">${item.date || 'Movement'}</div>
          <div class="dialogue-item-title">${item.title}</div>
        `;
        list.appendChild(el);
      });
    }

    function selectDialogue(idx) {
      const items = document.querySelectorAll('.dialogue-item');
      items.forEach((it, i) => it.classList.toggle('active', i === idx));

      const d = dialogues[idx];
      if (!d) return;

      const article = document.getElementById('readerArticle');
      article.innerHTML = `
        <h1>${d.title}</h1>
        <div class="reader-meta">DATE: ${d.date} · TYPE: ${d.type.toUpperCase()}</div>
        ${marked.parse(d.raw_body)}
      `;
      document.getElementById('archiveReader').scrollTop = 0;
    }

    function filterDialogues() {
      const q = document.getElementById('archiveSearch').value.toLowerCase();
      const filtered = dialogues.filter(d => 
        d.title.toLowerCase().includes(q) || 
        d.raw_body.toLowerCase().includes(q) ||
        d.date.includes(q)
      );
      renderDialogueList(filtered);
    }
  </script>
</body>
</html>
"""


class ConductorWebHandler(BaseHTTPRequestHandler):

    def do_GET(self):
        parsed = urlparse(self.path)

        if parsed.path in ("/", "/index.html"):
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(HTML_TEMPLATE.encode("utf-8"))
            return

        if parsed.path == "/api/chat-history":
            history = load_chat_history()
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps(history).encode("utf-8"))
            return

        if parsed.path == "/api/quizzes":
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps(BUILTIN_QUIZZES).encode("utf-8"))
            return

        if parsed.path == "/api/dialogues":
            dia = get_all_dialogues()
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps(dia).encode("utf-8"))
            return

        if parsed.path == "/api/inbox":
            inbox_text = get_inbox_content()
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps({"content": inbox_text}).encode("utf-8"))
            return

        self.send_error(404, "Not Found")

    def do_POST(self):
        parsed = urlparse(self.path)
        content_len = int(self.headers.get("Content-Length", 0))
        raw_body = self.rfile.read(content_len).decode("utf-8") if content_len > 0 else ""

        if parsed.path == "/api/chat":
            try:
                data = json.loads(raw_body)
                user_msg = data.get("message", "").strip()
                if not user_msg:
                    self.send_response(400)
                    self.end_headers()
                    return

                history = load_chat_history()
                reply = generate_conductor_reply(user_msg, history)

                history.append({"role": "user", "content": user_msg, "timestamp": datetime.now().isoformat()})
                history.append({"role": "assistant", "content": reply, "timestamp": datetime.now().isoformat()})
                save_chat_history(history)

                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.end_headers()
                self.wfile.write(json.dumps({"ok": True, "reply": reply}).encode("utf-8"))
            except Exception as e:
                self.send_response(500)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.end_headers()
                self.wfile.write(json.dumps({"ok": False, "error": str(e)}).encode("utf-8"))
            return

        if parsed.path == "/api/clear-history":
            save_chat_history([])
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps({"ok": True}).encode("utf-8"))
            return

        if parsed.path == "/api/inbox":
            try:
                data = json.loads(raw_body)
                content = data.get("content", "")
                set_inbox_content(content)
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.end_headers()
                self.wfile.write(json.dumps({"ok": True, "inbox_text": content}).encode("utf-8"))
            except Exception as e:
                self.send_error(500, str(e))
            return

        self.send_error(404, "Not Found")

    def log_message(self, format, *args):
        pass


def run_server(port=7332, should_open=True):
    server = ThreadingHTTPServer(("127.0.0.1", port), ConductorWebHandler)
    url = f"http://127.0.0.1:{port}"
    print(f"🎼 Room 402 Late-Night Conductor Studio running on {url}")
    if should_open:
        webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server...")
        server.server_close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Room 402 Late-Night Conductor & Architect Studio")
    parser.add_argument("--port", type=int, default=7332, help="Port to listen on (default 7332)")
    parser.add_argument("--no-open", dest="open", action="store_false", help="Don't open browser automatically")
    parser.add_argument("--open", dest="open", action="store_true", default=True, help="Open browser on start")
    args = parser.parse_args()
    run_server(port=args.port, should_open=args.open)
