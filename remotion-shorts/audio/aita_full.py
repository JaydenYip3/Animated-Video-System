# Full sound for "AITA: the name" (112.667 s): the voice (gain only) + an original score in sections that follow the
# story (playful F major setup, a dead stop for the awkward silence, minor-key tension, a quiet evening pulse for the
# texts, a hard stop on "you will never see my daughter again", a music-box memory, a bouncy future montage, a light
# ending), ducked -3 dB under speech from words.json, + synthesized SFX on the picture events (src/videos/aita/story.ts).
# Standard mix: music bed -10 LU under the voice (+3 dB standard), SFX -6 dB, master -15 LUFS, <= -1 dBTP (soft limiter).
# Writes ../out/aita/mix_full.wav (48 kHz stereo 24-bit, exact length) + stems + cues_full.md.
import json
import os
import numpy as np
from dsp import SR, ns, st, dbg, rng, read_wav, write_wav, integrated, momentary_max, true_peak, place, pan, fades, lp
from instruments import m2f, pluck, glock, pad, musicbox, brush, triangle, timpani, cymbal, snare
from sfx_gen import whoosh, bird_chirps, breeze, crickets, wood_crack

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
FPS = 30
TOTAL = 3380
DUR = TOTAL / FPS
N = ns(DUR)
B = 60 / 116  # beat


def F(f):
    return f / FPS


def voice():
    v = read_wav(os.path.join(ROOT, "voice/aita/voice_full.wav"))
    v = st(v[0] if isinstance(v, tuple) else v)[:, :N]
    out = np.zeros((2, N))
    out[:, : v.shape[1]] = v
    return out


# ---------------------------------------------------------------- score
PLAY = [(53, [65, 69, 72]), (50, [62, 65, 69]), (46, [62, 65, 70]), (48, [64, 67, 72])]   # F Dm Bb C
TENSE = [(50, [62, 65, 69]), (46, [62, 65, 70]), (43, [62, 67, 70]), (45, [61, 64, 69])]  # Dm Bb Gm A
NIGHT = [(50, [62, 65, 69]), (53, [65, 69, 72]), (46, [62, 65, 70]), (45, [61, 64, 69])]


def bars(m, r, t0, t1, prog, style, beat=B):
    """lay a section from t0 to t1 (s), whole bars of 4 beats"""
    nb = int((t1 - t0) / (4 * beat) + 0.999)
    for bi in range(nb):
        root, tri = prog[bi % len(prog)]
        tb = t0 + bi * 4 * beat
        if tb >= t1 - 0.05:
            break
        if style in ("play", "montage", "end"):
            place(m, pan(pluck(m2f(root - 12), 0.9, r, 0.6, 0.3), -0.1), tb)
            place(m, pan(pluck(m2f(root - 5), 0.7, r, 0.5, 0.3), -0.1), tb + 2 * beat)
            for k in (1, 3):
                for j, n in enumerate(tri):
                    place(m, pan(pluck(m2f(n), 0.32, r, 0.35, 0.6), 0.25 * (j - 1)), tb + k * beat + 0.006 * j)
            place(m, pad([m2f(n) for n in tri], 4 * beat, 0.11, r, att=0.4, rel=0.6), tb)
            for k in (1, 3):
                place(m, pan(brush(0.25, r, 0.2), 0.3), tb + k * beat)
            if style == "montage":
                for k in range(8):
                    place(m, pan(snare(0.12 + 0.06 * (k % 2 == 0), r, 0.12), 0.2), tb + k * beat / 2)
        elif style == "tense":
            for k in range(8):  # staccato low 8ths
                place(m, pan(pluck(m2f(root - 12 + (7 if k % 4 == 2 else 0)), 0.6 + 0.2 * (k % 2 == 0), r, 0.25, 0.25), -0.15), tb + k * beat / 2)
            place(m, pad([m2f(n - 12) for n in tri], 4 * beat, 0.14, r, att=0.8, rel=0.8, warm=600), tb)
            place(m, pan(glock(m2f(tri[-1] + 12), 0.18, r, 1.0), 0.3), tb + 3.5 * beat)
        elif style == "night":
            place(m, pad([m2f(n) for n in tri], 4 * beat, 0.13, r, att=1.0, rel=1.0, warm=700), tb)
            for k in (0, 2):
                place(m, pan(pluck(m2f(root - 12), 0.45, r, 0.9, 0.2), -0.1), tb + k * beat)
            for k, n in enumerate([tri[0] + 24, tri[2] + 12]):
                place(m, pan(musicbox(m2f(n), 0.25, r, 1.4), 0.25), tb + (1.5 + 2 * k) * beat)
        elif style == "angry":
            for k in range(16):
                place(m, pan(pluck(m2f(root - 12), 0.75, r, 0.18, 0.4), -0.1), tb + k * beat / 4)
            place(m, timpani(m2f(root - 12), 0.8, r, 1.6), tb)
            place(m, pad([m2f(n - 12) for n in tri], 4 * beat, 0.16, r, att=0.2, rel=0.4, warm=900), tb)
        elif style == "pulse":
            for k in range(4):
                place(m, pan(pluck(m2f(root - 12 if k % 2 == 0 else root - 5), 0.55, r, 0.35, 0.35), -0.1), tb + k * beat)
            place(m, pan(pluck(m2f(tri[k % 3] + 12), 0.25, r, 0.3, 0.7), 0.3), tb + 3.5 * beat)


def melody(m, r, t0, notes, inst=glock, vel=0.38, p=0.2):
    for b_, n in notes:
        place(m, pan(inst(m2f(n), vel, r, 1.4), p), t0 + b_ * B)


def music():
    r = rng(7)
    m = np.zeros((2, N + ns(4)))
    # setup: hook .. "pronounced Maria"  (frames 0-1063)
    bars(m, r, 0.12, F(1063), PLAY, "play")
    hook = [(0.0, 72), (0.5, 74), (1.0, 76), (2.0, 72), (6.0, 77), (6.5, 76), (7.0, 74), (8.0, 72)]
    for rep in range(0, 16, 4):
        melody(m, r, 0.12 + rep * 4 * B * 2, [(b, n + 12) for b, n in hook], vel=0.32)
    # 1063-1175 the punchline never comes: music out, crickets (sfx)
    # 1175-1709 tension
    bars(m, r, F(1175), F(1709), TENSE, "tense")
    # 1709-2231 evening texts
    bars(m, r, F(1709), F(2231), NIGHT, "night", beat=B * 1.15)
    # 2231-2402 she loses it
    bars(m, r, F(2231), F(2402), TENSE[:2], "angry")
    # 2402 hard stop. 2461-2529 memory: music box
    place(m, pad([m2f(n) for n in [62, 65, 69]], 2.3, 0.12, r, att=0.6, rel=1.2, warm=700), F(2461))
    melody(m, r, F(2461), [(0, 84), (0.5, 81), (1, 77), (2, 74), (3, 77), (3.5, 74)], musicbox, 0.4, -0.2)
    # 2529-2788 email / husband: curious pulse
    bars(m, r, F(2529), F(2788), [(46, [62, 65, 70]), (48, [64, 67, 72]), (45, [61, 64, 69]), (50, [62, 65, 69])], "pulse")
    # 2823-3067 future montage
    bars(m, r, F(2823), F(3067), PLAY, "montage")
    melody(m, r, F(2823), [(b, n + 12) for b, n in hook], vel=0.3)
    # 3067-end: light ending, resolve on F on "will ruin her life"
    bars(m, r, F(3067), F(3349), PLAY, "end")
    melody(m, r, F(3246), [(b, n + 12) for b, n in hook[:4]], vel=0.3)
    t = F(3349)
    for n in (41, 53):
        place(m, pan(pluck(m2f(n), 0.9, r, 1.2, 0.3), -0.1), t)
    place(m, pad([m2f(n) for n in [65, 69, 72, 77]], 0.6, 0.16, r, att=0.05, rel=0.6), t)
    place(m, pan(glock(m2f(89), 0.45, r, 1.6), 0.2), t)
    m = m[:, :N]
    # gaps: silence for the awkward pause and after "never see my daughter again"
    env = np.ones(N)
    for a, b in ((1063, 1175), (2402, 2461)):
        i0, i1 = ns(F(a)), ns(F(b))
        env[i0:i1] = 0
        k = ns(0.12)
        env[max(0, i0 - k):i0] = np.minimum(env[max(0, i0 - k):i0], np.linspace(1, 0, min(k, i0)))
    for a, b in ((2788, 2823),):  # "Unique? Sure." deadpan: duck out
        env[ns(F(a)):ns(F(b))] = 0.15
    env = np.convolve(env, np.ones(ns(0.02)) / ns(0.02), "same")
    return m * env[None, :]


def duck(words):
    g = np.zeros(N)
    for w in words:
        if w["s"] < DUR:
            g[ns(max(0, w["s"] - 0.08)): ns(min(DUR, w["e"] + 0.12))] = 1
    k = np.exp(-np.arange(ns(0.45)) / ns(0.15))
    g = np.minimum(1, np.convolve(g, k / k.sum() * 3, "same"))
    return dbg(-3.0 * g)


# ---------------------------------------------------------------- sfx
def tok(r, n, vel=0.7):
    """toy block landing: bright wooden pluck + a knock"""
    y = pluck(m2f(n), vel, r, 0.18, 0.95, 0.5)
    y[: ns(0.01)] += r.standard_normal(ns(0.01)) * 0.25 * vel * np.linspace(1, 0, ns(0.01))
    return y


def ding(r, hi=96):
    a = glock(m2f(hi), 0.6, r, 1.0)
    out = np.zeros(len(a) + ns(0.09))
    out[: len(a)] += a
    out[ns(0.09):] += glock(m2f(hi + 4), 0.6, r, 1.0)[: len(out) - ns(0.09)]
    return out


def buzz(r):
    t = np.arange(ns(0.35)) / SR
    y = np.sign(np.sin(2 * np.pi * 150 * t)) * (np.sin(2 * np.pi * 22 * t) > 0) * 0.3
    return fades(lp(y, 1800), 0.005, 0.05)


def sfx():
    r = rng(11)
    s = np.zeros((2, N + ns(3)))
    ev = []

    def at(f, x, name, p=0.0, g=1.0):
        place(s, pan(x, p) if np.ndim(x) == 1 else x, F(f), g)
        ev.append((f, name))

    W = lambda d=0.5, pk=0.3, lo=500, hi=3000, tail=0.12, air=0.15: whoosh(d, r, peak=pk, f_lo=lo, f_hi=hi, tail=tail, air=air)
    at(74 - 9, W(), "whoosh into the CU on 'ruining'", 0.3)
    at(76, triangle(0.6, r, 0.9, 1760.0), "ting: Loreen's shock", 0.2, 0.7)
    at(150, glock(m2f(96), 0.6, r, 1.6), "bell on the white flash")
    at(182, W(0.8, 0.4, 300, 1500, 0.2), "glide me -> Loreen", 0.2, 0.6)
    at(222, W(0.35, 0.2, 700, 3500, 0.1), "cut to the wide", -0.2, 0.7)
    at(286, W(1.0, 0.5, 900, 4000, 0.3, 0.4), "shimmer into the flashback", 0, 0.6)
    for k in range(3):
        at(330 + k * 14, musicbox(m2f(88 + 3 * k), 0.4, r, 1.0), "hearts", 0.2, 0.5)
    at(432, W(0.6, 0.15, 1200, 5000, 0.4, 0.5), "sparkle: the baby", 0, 0.6)
    for k, n in enumerate([96, 100, 103, 108]):
        at(434 + k * 4, glock(m2f(n), 0.35, r, 0.8), "sparkle notes", 0.3, 0.6)
    at(574, W(1.2, 0.6, 800, 3500, 0.5, 0.5), "glow swell", 0, 0.6)
    at(608, glock(m2f(101), 0.5, r, 1.4), "'so proud' ting", 0.2, 0.6)
    at(679, glock(m2f(98), 0.4, r, 1.2), "the name: sparkle", 0.2, 0.6)
    for k, f in enumerate([826, 839, 850, 862, 872, 882, 889, 899, 908, 914, 921]):
        at(f - 2 + 6, tok(r, 72 + k * 2), f"block {k + 1} lands", 0.25, 0.8)
    for k, f in enumerate([1007, 1009, 1011, 1013, 1015, 1017, 1019]):
        at(f + 5, tok(r, 88 + k, 0.5), f"middle-name block {k + 1}", 0.1, 0.6)
    at(1063, crickets(3.6, r), "crickets: the punchline never comes", 0, 0.8)
    at(1129, triangle(0.4, r, 0.6, 1320.0), "'completely serious' tick", 0, 0.5)
    at(1359, timpani(m2f(38), 0.5, r, 1.2), "face fell: low thud")
    at(1387, W(0.4, 0.15, 400, 2500, 0.15), "angry burst pops", 0.2, 0.7)
    at(TOPPLE := 1684, wood_crack(r), "tower topples", 0.2, 0.7)
    for k in range(11):
        at(1688 + int(3 + 4 * k + 3 * np.sin(k)), tok(r, 60 + (k * 5) % 14, 0.55), f"block {k + 1} hits", 0.3 - 0.05 * k, 0.6)
    at(1709 - 5, W(1.0, 0.5, 300, 1800, 0.3), "into the evening", 0, 0.5)
    for f in (1785, 1800, 1826, 1852, 1906, 2170):
        at(f, W(0.25, 0.08, 1500, 6000, 0.08, 0.6), "message sent", 0.15, 0.5)
    for f in (1965, 2005, 2240, 2288):
        at(f, W(0.25, 0.08, 1500, 6000, 0.08, 0.6), "Loreen sends (red)", -0.15, 0.4)
    for f in (2036, 2050, 2066, 2084, 2340):
        at(f, buzz(r), "angry message buzz", 0, 0.7)
    at(2232, cymbal(0.5, r, 1.6), "she loses it: crash")
    at(2232, timpani(m2f(38), 0.9, r, 1.5), "she loses it: boom")
    at(2378, timpani(m2f(36), 0.6, r, 1.2), "'out of me' thud")
    at(2402, W(0.6, 0.45, 200, 900, 0.1, 0.0), "'never see my daughter' suck-in", 0, 0.7)
    at(2461 - 5, W(1.0, 0.5, 900, 4000, 0.3, 0.4), "shimmer into the memory", 0, 0.5)
    at(2493 - 6, W(1.0, 0.5, 200, 800, 0.4, 0.0), "memory falls away", 0, 0.5)
    at(2581, ding(r), "email ding")
    at(2601, W(0.35, 0.2, 700, 3500, 0.1), "cut to the husband", -0.2, 0.6)
    at(2693, glock(m2f(100), 0.35, r, 1.0), "'cute' ting", 0.2, 0.5)
    at(2733, W(0.6, 0.15, 1200, 5000, 0.4, 0.5), "'unique' sparkle", 0.2, 0.5)
    at(2806, triangle(0.3, r, 0.6, 2093.0), "'Sure.' tick", 0, 0.5)
    at(2823 - 5, W(1.0, 0.5, 900, 4000, 0.3, 0.4), "into the future", 0, 0.5)
    for k, f in enumerate([2877, 2880, 2884]):
        at(f, snare(0.25, r, 0.12), "bully snicker hits", -0.3 + 0.3 * k, 0.4)
    for f in (2896, 2929, 2957):
        at(f - 4, W(0.3, 0.15, 900, 4500, 0.08), "montage cut", 0.2, 0.6)
    at(2999, W(0.6, 0.3, 300, 1200, 0.3), "pull out", 0, 0.5)
    at(3067 - 4, W(0.6, 0.3, 600, 2500, 0.2), "back to now", 0, 0.5)
    at(3194 - 3, W(0.35, 0.2, 700, 3500, 0.1), "cut to the judges", 0, 0.6)
    at(3225, timpani(m2f(41), 0.35, r, 1.0), "judges' look", 0, 0.6)
    at(3246 - 4, W(0.6, 0.3, 600, 2500, 0.2), "back to the hook framing", 0, 0.5)
    s = s[:, :N]
    # ambience: street birds + breeze by day, room tone inside, crickets on the evening bench
    amb = np.zeros((2, N))
    from story_sets import SETS
    for a, b, kind in SETS:
        d = F(b - a)
        if kind == "street_day":
            x = st(breeze(d, r, 0.5)) * 0.4 + pan(bird_chirps(d, r, 0.35), 0.4) * 0.5
        elif kind == "street_golden":
            x = st(breeze(d, r, 0.4)) * 0.35 + pan(crickets(d, r, 2), 0.3) * 0.35
        else:
            x = st(lp(r.standard_normal(ns(d)), 300)) * 0.12
        x = st(x)[:, : ns(d)]
        x = fades(x, 0.15, 0.15)
        place(amb, x, F(a))
    return s, amb, ev


def soft_limit(x, ceil_db=-1.2):
    c = dbg(ceil_db)
    return np.where(np.abs(x) < 0.7 * c, x, np.sign(x) * (0.7 * c + 0.3 * c * np.tanh((np.abs(x) - 0.7 * c) / (0.3 * c))))


def main():
    words = json.load(open(os.path.join(ROOT, "voice/aita/words.json")))
    v = voice()
    lv = integrated(v)
    m = music()
    m *= dbg((lv - 10.0) - integrated(m))
    m *= duck(words)[None, :]
    s, amb, ev = sfx()
    s *= dbg((lv - 12.0) - momentary_max(s))
    amb *= dbg((lv - 24.0) - integrated(amb))
    s = s + amb
    mix = v + m + s
    g = dbg(-15.0 - integrated(mix))
    mix = soft_limit(mix * g)
    for _ in range(3):  # true-peak safety
        tp = true_peak(mix)
        if tp <= -1.0:
            break
        mix *= dbg(-1.05 - tp)
    mix = fades(mix, 0.002, 0.05)
    out = os.path.join(ROOT, "out/aita")
    write_wav(os.path.join(out, "mix_full.wav"), mix)
    for name, x in (("voice", v), ("music", m), ("sfx", s)):
        write_wav(os.path.join(out, f"stem_full_{name}.wav"), x * g)
    rep = f"voice {lv:.1f} LUFS | mix {integrated(mix):.1f} LUFS, TP {true_peak(mix):.1f} dBTP, {mix.shape[1] / SR:.3f} s"
    print(rep)
    with open(os.path.join(out, "cues_full.md"), "w") as fh:
        fh.write("# AITA: the name - sound cues\n\n" + rep + "\n\n| frame | time | event |\n|---|---|---|\n")
        for f, n in sorted(ev):
            fh.write(f"| {f} | {f / FPS:.2f} s | {n} |\n")
    print(len(ev), "events")


if __name__ == "__main__":
    main()
