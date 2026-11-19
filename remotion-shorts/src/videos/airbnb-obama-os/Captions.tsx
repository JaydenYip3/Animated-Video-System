// Bold word-synced captions (exact script words, never the transcript's spelling) + the cash counter for
// "airbnb-obama-os". Pure functions of the frame. Words keep their layout slot from the start of their chunk
// (no reflow); each word pops in on its onset, the word being spoken is yellow, the rest white.
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { FPS, W, COUNT0, COUNT1, countAt, TOTAL } from "./story";

type Chunk = { words: [string, number][]; end: number };
const CHUNKS: Chunk[] = [
  { words: [["2008.", W.y2008]], end: 1.15 },
  { words: [["Airbnb", W.airbnb], ["is", W.is], ["broke.", W.broke]], end: 3.05 },
  { words: [["The", W.the], ["founders", W.founders], ["are", W.are], ["maxing", W.maxing], ["out", W.out]], end: W.credit - 0.02 },
  { words: [["credit", W.credit], ["cards.", W.cards]], end: 5.36 },
  { words: [["So", W.so], ["they", W.they], ["sell", W.sell], ["cereal.", W.cereal]], end: 6.52 },
  { words: [["“Obama", W.obama], ["O’s.”", W.os]], end: 7.52 },
  { words: [["$40", W.forty], ["a", W.a], ["box.", W.box]], end: 8.98 },
  { words: [["They", W.they2], ["raise", W.raise], ["about", W.about], ["$30,000.", W.thirty]], end: 10.86 },
  { words: [["The", W.the2], ["company", W.company], ["survives.", W.survives]], end: 12.32 },
  { words: [["Today,", W.today]], end: 13.06 },
  { words: [["Airbnb", W.airbnb2], ["is", W.is2], ["worth", W.worth], ["billions.", W.billions]], end: TOTAL / FPS },
];
const LEADF = 1; // words land 1 frame before their onset
const FONT = '"DejaVu Sans", sans-serif';

const pop = (df: number) => (df < 0 ? 0 : df < 3 ? 0.55 + 0.6 * (df / 3) : df < 6 ? 1.15 - 0.15 * ((df - 3) / 3) : 1);

const Word: React.FC<{ text: string; df: number; current: boolean; big: boolean }> = ({ text, df, current, big }) => {
  const k = pop(df);
  return (
    <span style={{
      display: "inline-block", margin: "0 14px", opacity: df < 0 ? 0 : 1, transform: `scale(${k.toFixed(3)}) rotate(${current ? -2 : 0}deg)`,
      color: current ? "#ffd84a" : "#ffffff", fontFamily: FONT, fontWeight: 700, fontSize: big ? 118 : 92, lineHeight: 1.12,
      WebkitTextStroke: "16px #1a0f1e", paintOrder: "stroke fill", letterSpacing: -1,
      textShadow: "0 8px 0 rgba(26,15,30,0.85), 0 14px 22px rgba(0,0,0,0.35)",
    }}>{text}</span>
  );
};

export const Captions: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const ch = CHUNKS.find((c) => t >= c.words[0][1] - LEADF / FPS && t < c.end);
  const nums = (n: number) => "$" + n.toLocaleString("en-US");
  // counter: slides in just before the count, pops on the final value, leaves after "survives"
  const cIn = COUNT0 - 0.35, cOut = 12.3;
  const showC = t >= cIn && t < cOut;
  const v = countAt(t);
  const slide = Math.min(1, (t - cIn) / 0.2), fin = t >= COUNT1 ? Math.max(0, 1 - (t - COUNT1) / 0.25) : 0;
  const leave = t > cOut - 0.2 ? (cOut - t) / 0.2 : 1;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {showC && (
        <div style={{ position: "absolute", top: 210, left: 0, right: 0, display: "flex", justifyContent: "center",
          transform: `translateY(${(-260 * (1 - slide)).toFixed(1)}px) scale(${(1 + 0.18 * fin).toFixed(3)})`, opacity: Math.max(0, leave) }}>
          <div style={{ background: "#1d4a22", border: "10px solid #10230f", borderRadius: 48, padding: "18px 54px 26px",
            boxShadow: "0 14px 0 #10230f, 0 24px 40px rgba(0,0,0,0.35)" }}>
            <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 150, color: t >= COUNT1 ? "#b8ff7a" : "#8ef06a", letterSpacing: -2,
              WebkitTextStroke: "10px #0b1a0b", paintOrder: "stroke fill", fontVariantNumeric: "tabular-nums" }}>{nums(Math.max(0, v))}</span>
          </div>
        </div>
      )}
      {ch && (
        <div style={{ position: "absolute", top: 1150, left: 90, right: 90, height: 330, display: "flex", alignItems: "center", justifyContent: "center",
          flexWrap: "wrap", textAlign: "center", alignContent: "center" }}>
          {ch.words.map(([w, ts], i) => {
            const df = f - Math.round(ts * FPS) + LEADF;
            const next = ch.words[i + 1]?.[1] ?? ch.end;
            const current = t >= ts - LEADF / FPS && t < next - LEADF / FPS;
            return <Word key={i} text={w} df={df} current={current} big={ch.words.length === 1} />;
          })}
        </div>
      )}
    </AbsoluteFill>
  );
};
