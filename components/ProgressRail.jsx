"use client";

import { Fragment, useEffect, useMemo, useRef } from "react";

// Collapses the flat step list into what the rail shows:
//   { kind: "exercise", exercise, moveSteps: [stepIndex, ...] }  one dot per set
//   { kind: "break", stepIndex, seconds }                        rest between moves
// Rest between sets of the same exercise is implied by the gap between its
// dots, so it isn't drawn separately. Countdown steps aren't shown at all.
function buildTimeline(steps) {
  const items = [];
  const prevMoveAt = (i) => {
    for (let j = i - 1; j >= 0; j--) if (steps[j].type === "move") return steps[j];
    return null;
  };
  const nextMoveAt = (i) => {
    for (let j = i + 1; j < steps.length; j++) if (steps[j].type === "move") return steps[j];
    return null;
  };

  steps.forEach((s, i) => {
    if (s.type === "move") {
      const last = items[items.length - 1];
      if (last?.kind === "exercise" && last.exIndex === s.index) {
        last.moveSteps.push(i);
      } else {
        items.push({
          kind: "exercise",
          exIndex: s.index,
          exercise: s.exercise,
          moveSteps: [i],
        });
      }
    } else if (s.type === "rest") {
      const prev = prevMoveAt(i);
      const next = nextMoveAt(i);
      const isBetweenSets = prev && next && prev.index === next.index;
      if (!isBetweenSets) {
        items.push({ kind: "break", stepIndex: i, seconds: s.seconds });
      }
    }
  });
  return items;
}

// Every state keeps the same box size (no scale or outer ring), so the
// current dot never grows past the rail's edge and gets clipped.
function Dot({ state }) {
  const base = "w-2 h-2 md:w-2.5 md:h-2.5 rounded-full shrink-0";
  if (state === "done") return <span className={`${base} bg-accentInk/60`} />;
  if (state === "current") return <span className={`${base} bg-accentInk`} />;
  if (state === "upNext")
    return <span className={`${base} border-2 border-accentInk animate-pulse`} />;
  return <span className={`${base} border border-accentInk/40`} />;
}

// Fixed-width left column that the dots and lines are centred in, so the
// whole journey reads as one continuous vertical path.
function PathColumn({ children }) {
  return (
    <div className="w-2.5 md:w-3 shrink-0 flex flex-col items-center">
      {children}
    </div>
  );
}

// Short solid line between consecutive sets; darker once the set it leads
// to has been reached.
function Connector({ reached }) {
  return (
    <span
      className={`w-0.5 h-2.5 md:h-3.5 ${reached ? "bg-accentInk/60" : "bg-accentInk/25"}`}
    />
  );
}

export default function ProgressRail({ steps, index }) {
  const timeline = useMemo(() => buildTimeline(steps), [steps]);
  const containerRef = useRef(null);
  const activeRef = useRef(null);

  // During a countdown or rest, the move that's coming next gets highlighted
  // so it's easy to glance over and see what's up.
  const current = steps[index];
  let upNextIndex = -1;
  if (current?.type !== "move") {
    for (let i = index + 1; i < steps.length; i++) {
      if (steps[i].type === "move") {
        upNextIndex = i;
        break;
      }
    }
  }

  function dotState(stepIndex) {
    if (stepIndex < index) return "done";
    if (stepIndex === index) return "current";
    if (stepIndex === upNextIndex) return "upNext";
    return "upcoming";
  }

  // Keep the active item scrolled into the middle of the rail.
  useEffect(() => {
    const container = containerRef.current;
    const active = activeRef.current;
    if (!container || !active) return;
    container.scrollTo({
      top: active.offsetTop - container.clientHeight / 2 + active.clientHeight / 2,
      behavior: "smooth",
    });
  }, [index]);

  let activeAssigned = false;
  const refIfActive = (isActive) => {
    if (isActive && !activeAssigned) {
      activeAssigned = true;
      return activeRef;
    }
    return undefined;
  };

  return (
    // Sticky full-height column on the right edge. Equal top/bottom padding
    // (the top also clears the fixed theme toggle) keeps the rail's middle
    // level with the middle of the main timer content.
    <aside className="sticky top-0 h-screen w-16 md:w-28 lg:w-36 shrink-0 flex flex-col py-16 pr-3 md:pr-5">
      <div
        ref={containerRef}
        className="relative flex-1 flex flex-col overflow-y-auto no-scrollbar"
      >
        {/* my-auto centres a short list vertically; once the list is taller
            than the rail it collapses to 0 and the rail scrolls normally. */}
        <div className="my-auto">
          {timeline.map((item, i) => {
            const prev = timeline[i - 1];

            if (item.kind === "break") {
              const isCurrent = item.stepIndex === index;
              const isDone = item.stepIndex < index;
              return (
                <div
                  key={i}
                  ref={refIfActive(isCurrent)}
                  className={`flex items-center gap-1.5 md:gap-2 ${
                    isCurrent
                      ? "text-accentInk font-bold"
                      : isDone
                        ? "text-accentInk/30"
                        : "text-accentInk/50"
                  }`}
                >
                  <PathColumn>
                    <span className="h-6 md:h-8 border-l-2 border-dashed border-current" />
                  </PathColumn>
                  <span className="text-[9px] md:text-[11px] uppercase tracking-wide">
                    break
                  </span>
                </div>
              );
            }

            const states = item.moveSteps.map(dotState);
            const isActive = states.some((s) => s === "current" || s === "upNext");
            const isDone = states.every((s) => s === "done");
            return (
              <div key={i}>
                {/* Two exercises back to back with no rest still get joined
                    by a short solid line so the path stays continuous. */}
                {prev?.kind === "exercise" && (
                  <PathColumn>
                    <Connector reached={item.moveSteps[0] <= index} />
                  </PathColumn>
                )}
                <div
                  ref={refIfActive(isActive)}
                  className="flex items-start gap-1.5 md:gap-2"
                >
                  <PathColumn>
                    {states.map((state, j) => (
                      <Fragment key={j}>
                        {j > 0 && <Connector reached={item.moveSteps[j] <= index} />}
                        <Dot state={state} />
                      </Fragment>
                    ))}
                  </PathColumn>
                  <p
                    className={`text-[10px] md:text-xs leading-tight break-words min-w-0 ${
                      isActive
                        ? "text-accentInk font-bold"
                        : isDone
                          ? "text-accentInk/35 font-medium"
                          : "text-accentInk/60 font-medium"
                    }`}
                  >
                    {item.exercise.name}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
