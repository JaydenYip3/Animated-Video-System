// The year stamps of "mao-zedong-3": numbers only (no words), a printed-ink year over a thin timeline 1911-1950.
// Each year pops in 2 frames before it is spoken and stays ~2.6 s; the ending fills the whole line ("half a century").
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { FPS, W, LEAD, clamp01, smooth, easeOut } from "./story";

const YEARS: [number, number][] = [
  [1911, W.y1911], [1927, W.y1927], [1934, W.y1934], [1937, W.y1937], [1945, W.y1945], [1949, W.won], [1950, W.y1950],
];
const Y0 = 1911, Y1 = 1950;
const X0 = 170, X1 = 910, LINE_Y = 395;
const xOf = (y: number) => X0 + ((y - Y0) / (Y1 - Y0)) * (X1 - X0);
const HOLD = 2.6;
const INKC = "#2a211c", PAPER = "#f3e7cb", RED = "#b8362a";

export const Years: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  // which year stamp is live
  let cur = -1;
  for (let i = 0; i < YEARS.length; i++) if (t >= YEARS[i][1] - LEAD) cur = i;
  const ending = t >= W.mao4 - 0.1;
  if (cur < 0) return null;
  const [year, ty] = YEARS[cur];
  const age = t - (ty - LEAD);
  // visibility of the stamp + line: in 0.15 s, hold, out 0.35 s (the next stamp replaces it directly)
  const nextT = cur + 1 < YEARS.length ? YEARS[cur + 1][1] - LEAD : Infinity;
  const end = Math.min(ty - LEAD + HOLD, nextT);
  const vis = ending ? smooth((t - (W.mao4 - 0.1)) / 0.4) * (1 - smooth((t - (W.end + 0.6)) / 0.5))
    : clamp01(age / 0.12) * (1 - smooth((t - end) / 0.35));
  if (vis <= 0.001) return null;
  // marker slides from the previous year to this one
  const prevYear = cur > 0 ? YEARS[cur - 1][0] : Y0;
  const slide = easeOut(age / 0.45);
  const mx = xOf(prevYear + (year - prevYear) * (cur > 0 ? slide : 1));
  const pop = 1 + 0.22 * Math.exp(-age * 9) * (age < 0.6 ? 1 : 0);
  const fill = ending ? easeOut((t - W.half) / 1.4) : 0;
  const fillX = ending ? X0 + (X1 - X0) * fill : mx;
  const font = "'DejaVu Serif', Georgia, serif";
  return (
    <AbsoluteFill style={{ opacity: vis, pointerEvents: "none" }}>
      <svg width={1080} height={1920} viewBox="0 0 1080 1920">
        <defs>
          <filter id="yshadow" x="-20%" y="-20%" width="140%" height="160%">
            <feDropShadow dx="0" dy="5" stdDeviation="6" floodColor="#000000" floodOpacity="0.45" />
          </filter>
        </defs>
        <g filter="url(#yshadow)">
          {/* the timeline: paper line with ink edges, ticks at each spoken year */}
          <line x1={X0 - 20} y1={LINE_Y} x2={X1 + 20} y2={LINE_Y} stroke={INKC} strokeWidth={13} strokeLinecap="round" />
          <line x1={X0 - 20} y1={LINE_Y} x2={X1 + 20} y2={LINE_Y} stroke={PAPER} strokeWidth={7} strokeLinecap="round" />
          <line x1={X0} y1={LINE_Y} x2={ending ? fillX : mx} y2={LINE_Y} stroke={RED} strokeWidth={7} strokeLinecap="round" />
          {YEARS.map(([y]) => {
            const lit = ending ? xOf(y) <= fillX + 1 : y <= (cur > 0 ? prevYear + (year - prevYear) * slide : year);
            return <circle key={y} cx={xOf(y)} cy={LINE_Y} r={11} fill={lit ? RED : PAPER} stroke={INKC} strokeWidth={5} />;
          })}
          {!ending && <circle cx={mx} cy={LINE_Y} r={19 * pop} fill={RED} stroke={INKC} strokeWidth={6} />}
          {!ending && (
            <text x={540} y={325} textAnchor="middle" fontFamily={font} fontWeight={700} fontSize={128 * pop} fill={PAPER}
              stroke={INKC} strokeWidth={10} paintOrder="stroke" strokeLinejoin="round" letterSpacing={4}>{year}</text>
          )}
          {ending && (
            <>
              <text x={X0} y={330} textAnchor="middle" fontFamily={font} fontWeight={700} fontSize={84} fill={PAPER}
                stroke={INKC} strokeWidth={8} paintOrder="stroke" strokeLinejoin="round">{Y0}</text>
              <text x={X1} y={330} textAnchor="middle" fontFamily={font} fontWeight={700} fontSize={84} fill={PAPER}
                stroke={INKC} strokeWidth={8} paintOrder="stroke" strokeLinejoin="round" opacity={smooth((fill - 0.85) / 0.15)}>{Y1}</text>
            </>
          )}
        </g>
      </svg>
    </AbsoluteFill>
  );
};
