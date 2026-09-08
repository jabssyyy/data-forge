/* Measured memory graph: no synthetic edges, semantic labels, or force randomness. */
(() => {
  "use strict";
  const NS = "http://www.w3.org/2000/svg";
  const fmt = (n) =>
    Number.isFinite(n)
      ? Math.abs(n) < 0.001 && n !== 0
        ? n.toExponential(2)
        : n.toFixed(3)
      : "—";
  const svgEl = (tag, attrs) => {
    const el = document.createElementNS(NS, tag);
    Object.entries(attrs || {}).forEach(([k, v]) => el.setAttribute(k, v));
    return el;
  };
  function mount(container, options = {}) {
    let data = null,
      selected = null;
    container.classList.add("memory-graph");
    container.innerHTML = `<div class="memory-graph__main"><div class="memory-graph__top"><span class="memory-graph__eyebrow">A WINDOW INTO THE MEMORY STATE</span><span class="memory-graph__step"></span></div><div class="memory-graph__canvas"></div><div class="memory-graph__legend"><span><i class="memory-graph__swatch"></i>Positive value</span><span><i class="memory-graph__swatch is-negative"></i>Negative value</span><span>Thicker = larger magnitude</span><span>Cue → gate memory</span><span><i class="memory-graph__activity-dot"></i>Active gate now</span></div><p class="memory-graph__caption">Fixed positions let you track the same coordinates over time. Select a node or connection to inspect its measured value.</p></div><aside class="memory-graph__inspector" aria-label="Memory connection details"><p class="memory-graph__eyebrow">READ THE GRAPH</p><h3 class="memory-graph__detail-title">Follow a connection.</h3><div class="memory-graph__detail" aria-live="polite"></div></aside><details class="memory-graph__table-wrap"><summary>Inspect the displayed connections as numbers</summary><div class="memory-graph__table-scroll"><table><caption>Measured values for the visible memory connections</caption><thead><tr><th scope="col">Connection</th><th scope="col">Value</th><th scope="col">Previous</th><th scope="col">Magnitude change</th></tr></thead><tbody></tbody></table></div></details>`;
    const canvas = container.querySelector(".memory-graph__canvas");
    const svg = svgEl("svg", {
      viewBox: "0 0 760 450",
      role: "group",
      "aria-label":
        "Measured memory connections. Use Tab to select a node or connection.",
    });
    canvas.append(svg);
    const detail = container.querySelector(".memory-graph__detail");
    const title = container.querySelector(".memory-graph__detail-title");
    function p(text, className) {
      const el = document.createElement("p");
      el.textContent = text;
      if (className) el.className = className;
      return el;
    }
    function explain() {
      detail.replaceChildren();
      if (!data) return;
      const edge =
        selected && selected.type === "edge"
          ? data.edges.find((e) => String(e.id) === selected.id)
          : null;
      const node =
        selected && selected.type === "node"
          ? data.nodes.find((n) => String(n.id) === selected.id)
          : null;
      if (edge) {
        const labels = new Map(data.nodes.map((n) => [String(n.id), n.label]));
        title.textContent = `${labels.get(String(edge.source)) || edge.source} → ${labels.get(String(edge.target)) || edge.target}`;
        detail.append(p(fmt(edge.value), "memory-graph__big-value"));
        const delta = Math.abs(edge.value) - Math.abs(edge.previousValue || 0);
        detail.append(
          p(
            Math.abs(delta) < 1e-9
              ? "Magnitude is unchanged this step."
              : `${delta > 0 ? "Strengthened" : "Weakened"} by ${fmt(Math.abs(delta))} in magnitude this step.`,
            "memory-graph__change",
          ),
        );
        detail.append(
          p(
            `Previous state: ${fmt(edge.previousValue)}. The sign describes a coordinate contribution; it does not mean good or bad.`,
          ),
        );
        if (Number.isFinite(edge.nextValue))
          detail.append(
            p(
              `Memory for the next token: ${fmt(edge.nextValue)}. This diagram shows memory before the selected token writes.`,
            ),
          );
        if (Number.isFinite(edge.currentRead))
          detail.append(
            p(
              `Contribution to the current read: ${fmt(edge.currentRead)}. A large stored value can still be quiet when its cue is not active.`,
            ),
          );
        if (edge.history && edge.history.length > 1) {
          const history = edge.history;
          const max = Math.max(...history.map(Math.abs), 1e-12);
          const spark = svgEl("svg", {
            viewBox: "0 0 240 80",
            role: "img",
            "aria-label": "Signed value history for this connection",
          });
          spark.classList.add("memory-graph__spark");
          spark.append(
            svgEl("line", {
              x1: 0,
              y1: 40,
              x2: 240,
              y2: 40,
              stroke: "var(--rule-2)",
            }),
          );
          spark.append(
            svgEl("polyline", {
              points: history
                .map(
                  (v, i) =>
                    `${(i * 240) / (history.length - 1)},${40 - (v / max) * 34}`,
                )
                .join(" "),
              fill: "none",
              stroke: "var(--accent)",
              "stroke-width": 2,
            }),
          );
          spark.append(
            svgEl("circle", {
              cx:
                (Math.max(0, Math.min(history.length - 1, data.step)) * 240) /
                (history.length - 1),
              cy:
                40 -
                (history[Math.max(0, Math.min(history.length - 1, data.step))] /
                  max) *
                  34,
              r: 4,
              fill: "var(--surface)",
              stroke: "var(--accent)",
              "stroke-width": 2,
            }),
          );
          detail.append(
            spark,
            p(
              "Connection value across the recorded steps. The centre line is zero.",
              "memory-graph__small",
            ),
          );
        }
        detail.append(
          p(
            "A smaller value can result from cancellation. It is evidence about this connection, not proof that a fact or a neuron was erased.",
          ),
        );
      } else if (node) {
        title.textContent = node.label;
        const linked = data.edges.filter(
          (e) =>
            String(e.source) === String(node.id) ||
            String(e.target) === String(node.id),
        );
        detail.append(
          p(
            `${linked.length} connections in the selected sample`,
            "memory-graph__change",
          ),
        );
        if (Number.isFinite(node.activity))
          detail.append(p(`Current coordinate value: ${fmt(node.activity)}.`));
        detail.append(
          p(
            node.description ||
              "This is a model coordinate, not a labelled concept or a word. Its position stays fixed while measured connections change.",
          ),
        );
        detail.append(
          p(
            "Dim does not mean deleted. A coordinate can be quiet now and participate again on a later token.",
          ),
        );
      } else {
        title.textContent = data.isCounterfactual
          ? "A hypothetical decay test."
          : "Follow a connection.";
        if (data.isCounterfactual)
          detail.append(
            p(
              `Experimental retention λ = ${data.decay}. This changes the model’s memory update; it is not the original checkpoint behavior.`,
              "memory-graph__change",
            ),
          );
        detail.append(
          p(
            "Start with one line. Move through the sequence and watch its magnitude change. The same endpoints stay in place.",
          ),
        );
        detail.append(
          p(
            "Thicker means a larger absolute value. Colour gives the sign. Neither tells you whether the prediction improved.",
          ),
        );
        detail.append(
          p(
            data.explanation ||
              "This is a measured slice of the memory state. Hidden coordinates still contribute to the model; the picture is not the entire network.",
          ),
        );
      }
    }
    function choose(type, id) {
      selected = { type, id: String(id) };
      draw();
      if (options.onSelect) options.onSelect(selected);
    }
    function interactive(el, type, item, label) {
      el.setAttribute("tabindex", "0");
      el.setAttribute("role", "button");
      el.setAttribute("aria-label", label);
      el.setAttribute(
        "aria-pressed",
        String(selected?.type === type && selected.id === String(item.id)),
      );
      el.addEventListener("click", () => choose(type, item.id));
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          choose(type, item.id);
        }
      });
    }
    function draw() {
      if (!data) return;
      const width = Math.max(220, Math.min(760, canvas.clientWidth || 760));
      svg.setAttribute("viewBox", `0 0 ${width} 450`);
      const leftX = width * 0.24,
        rightX = width * 0.76;
      const focused = document.activeElement?.getAttribute("data-memory-key");
      svg.replaceChildren();
      container.querySelector(".memory-graph__step").textContent =
        `TOKEN ${Number(data.step)}${data.totalSteps ? " / " + data.totalSteps : ""}${data.token ? " · " + data.token : ""}`;
      const left = data.nodes.filter((n) => n.kind !== "write");
      const right = data.nodes.filter((n) => n.kind === "write");
      const positions = new Map();
      [left, right].forEach((nodes, side) =>
        nodes.forEach((node, i) =>
          positions.set(String(node.id), {
            x: side ? rightX : leftX,
            y: 72 + ((i + 0.5) * 320) / Math.max(nodes.length, 1),
          }),
        ),
      );
      for (const [x, label] of [
        [
          leftX,
          width < 450
            ? "CUE COORDINATES"
            : data.leftLabel || "ROTATED CUE COORDINATES",
        ],
        [
          rightX,
          width < 450 ? "GATE NEURONS" : data.rightLabel || "GATE NEURONS",
        ],
      ]) {
        const t = svgEl("text", {
          x,
          y: 30,
          "text-anchor": "middle",
          class: "memory-graph__column",
        });
        t.textContent = label;
        svg.append(t);
      }
      const scale =
        data.scale ||
        Math.max(...data.edges.map((e) => Math.abs(e.value)), 1e-12);
      const visible = [...data.edges]
        .sort(
          (a, b) =>
            (b.peakValue ?? Math.abs(b.value)) -
              (a.peakValue ?? Math.abs(a.value)) ||
            String(a.id).localeCompare(String(b.id)),
        )
        .slice(0, data.maxEdges || 40);
      if (
        selected?.type === "edge" &&
        !visible.some((e) => String(e.id) === selected.id)
      ) {
        const chosen = data.edges.find((e) => String(e.id) === selected.id);
        if (chosen) visible.push(chosen);
      }
      container.querySelector(".memory-graph__caption").textContent =
        `${visible.length} of ${data.edges.length} sampled connections shown, chosen by peak magnitude. Positions and the width scale stay fixed across steps. The table includes the full sample.`;
      visible.forEach((edge) => {
        const a = positions.get(String(edge.source)),
          b = positions.get(String(edge.target));
        if (!a || !b) return;
        const magnitude = Math.min(Math.abs(edge.value) / scale, 1);
        const active =
          selected?.type === "edge" && selected.id === String(edge.id);
        const related =
          !selected ||
          active ||
          (selected.type === "node" &&
            [String(edge.source), String(edge.target)].includes(selected.id));
        const g = svgEl("g", {
          "data-id": edge.id,
          "data-memory-key": "edge-" + edge.id,
          class: "memory-graph__edge" + (active ? " is-selected" : ""),
        });
        const path = `M ${a.x} ${a.y} C ${width * 0.43} ${a.y}, ${width * 0.57} ${b.y}, ${b.x} ${b.y}`;
        g.append(
          svgEl("path", {
            d: path,
            fill: "none",
            stroke: edge.value < 0 ? "var(--s-ce)" : "var(--accent)",
            "stroke-width": 0.6 + 7 * magnitude,
            opacity:
              magnitude === 0 ? 0 : related ? 0.16 + 0.74 * magnitude : 0.04,
          }),
        );
        g.append(
          svgEl("path", {
            d: path,
            fill: "none",
            stroke: "transparent",
            "stroke-width": 16,
          }),
        );
        interactive(
          g,
          "edge",
          edge,
          `${edge.source} to ${edge.target}, value ${fmt(edge.value)}`,
        );
        svg.append(g);
      });
      data.nodes.forEach((node) => {
        const at = positions.get(String(node.id));
        if (!at) return;
        const g = svgEl("g", {
          transform: `translate(${at.x},${at.y})`,
          "data-id": node.id,
          "data-memory-key": "node-" + node.id,
          class:
            "memory-graph__node" +
            (node.kind === "write" && node.activity > 0 ? " is-active" : ""),
        });
        const radius = Math.max(left.length, right.length) > 9 ? 10 : 16;
        g.append(
          svgEl("circle", { r: radius + 6, class: "memory-graph__node-halo" }),
        );
        g.append(
          svgEl("circle", { r: radius, class: "memory-graph__node-core" }),
        );
        const t = svgEl("text", {
          x:
            node.kind === "write"
              ? width < 450
                ? 22
                : 36
              : -(width < 450 ? 22 : 36),
          y: 5,
          "text-anchor": node.kind === "write" ? "start" : "end",
        });
        t.textContent = node.label;
        g.append(t);
        interactive(
          g,
          "node",
          node,
          `${node.label}. Select to inspect coordinate.`,
        );
        svg.append(g);
      });
      const tbody = container.querySelector("tbody");
      tbody.replaceChildren();
      data.edges.forEach((edge) => {
        const tr = document.createElement("tr");
        [
          `${edge.source} → ${edge.target}`,
          fmt(edge.value),
          fmt(edge.previousValue),
          fmt(Math.abs(edge.value) - Math.abs(edge.previousValue || 0)),
        ].forEach((value) => {
          const td = document.createElement("td");
          td.textContent = value;
          tr.append(td);
        });
        tbody.append(tr);
      });
      explain();
      if (focused)
        Array.from(svg.querySelectorAll("[data-memory-key]"))
          .find((e) => e.getAttribute("data-memory-key") === focused)
          ?.focus();
    }
    let lastWidth = canvas.clientWidth;
    const observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            const width = canvas.clientWidth;
            if (width !== lastWidth) {
              lastWidth = width;
              draw();
            }
          })
        : null;
    observer?.observe(canvas);
    return {
      update(next) {
        data = { nodes: [], edges: [], ...next };
        draw();
      },
      select(type, id) {
        choose(type, id);
      },
      destroy() {
        observer?.disconnect();
        container.replaceChildren();
        container.classList.remove("memory-graph");
      },
    };
  }
  window.MemoryGraphView = { mount };
})();
