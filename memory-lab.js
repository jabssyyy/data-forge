/* An interactive, measured projection of BDH's sequence memory. */
(() => {
  "use strict";
  const number = (value) =>
    Number.isFinite(value)
      ? Math.abs(value) >= 1000
        ? value.toExponential(2)
        : value.toFixed(3)
      : "·";
  function mount(container, bridge) {
    const find = (id) => container.querySelector("#" + id);
    const graph = window.MemoryGraphView.mount(find("memoryGraph"));
    let mode = "native",
      retention = 0.96,
      head = 0,
      timer = 0,
      request = 0,
      scheduled = 0;
    let native = null,
      variant = null,
      activeKey = "",
      wantedKey = "",
      latest = null;
    const cache = new Map();

    /* Redrawing the graph is by far the most expensive thing that happens on a
     * token step, and while the reader is up at the instrument the graph is
     * hundreds of pixels off screen. Track whether it is actually in view and
     * skip the redraw when it is not, remembering that a repaint is owed so
     * the graph is correct the moment it scrolls back. Without support for
     * IntersectionObserver the flag stays true and nothing is skipped. */
    let graphVisible = true;
    let repaintOwed = false;
    if (typeof IntersectionObserver === "function") {
      graphVisible = false;
      new IntersectionObserver(
        (entries) => {
          for (const entry of entries) graphVisible = entry.isIntersecting;
          if (graphVisible && repaintOwed) {
            repaintOwed = false;
            paint();
          }
        },
        { rootMargin: "200px" },
      ).observe(container);
    }
    function stop() {
      clearInterval(timer);
      timer = 0;
      find("memoryPlay").textContent = "Play memory";
    }
    function enable(ready) {
      [
        "memoryToken",
        "memoryPlay",
        "memoryStart",
        "memoryRepeat",
        "memoryLate",
      ].forEach((id) => (find(id).disabled = !ready));
      find("memoryGraph").hidden = !ready;
      container.setAttribute("aria-busy", String(!ready));
    }
    function clear() {
      request++;
      clearTimeout(scheduled);
      scheduled = 0;
      wantedKey = "";
      activeKey = "";
      native = variant = null;
      stop();
      enable(false);
      find("memoryStatus").textContent =
        "Waiting for the selected model and input…";
      [
        "memoryNorm",
        "memoryActive",
        "memoryCE",
        "memoryNativeCE",
        "memoryChanges",
        "memoryRetention",
      ].forEach((id) => (find(id).textContent = "·"));
      find("memoryInterpretation").textContent =
        "The interpretation will update with the measured memory state.";
      find("memoryVerdict").textContent =
        "Waiting for the selected model and input.";
      find("memoryContext").textContent = "Waiting for a measured state.";
    }
    function remember(key, value) {
      if (cache.size >= 6) cache.delete(cache.keys().next().value);
      cache.set(key, value);
      return value;
    }
    function paint() {
      if (!native || !latest) return;
      const analysis = mode === "decay" ? variant : native;
      if (!analysis) return;
      const t = Math.min(latest.token, analysis.trace.T - 1);
      const frame = window.BDHMemory.frame(
        analysis,
        t,
        Math.max(native.scale, variant?.scale || 0),
      );
      // The visible connections are selected once from the native trace. The
      // counterfactual cannot silently replace them with its strongest edges.
      frame.edges.forEach(
        (edge, i) => (edge.peakValue = native.pairs[i].peakValue),
      );
      /* The readouts below are cheap and stay live either way; only the
       * drawing is deferred, and only while nobody can see it. */
      if (graphVisible) graph.update(frame);
      else repaintOwed = true;
      Object.assign(container.dataset, {
        step: String(t),
        head: String(head),
        layer: String(latest.layer),
        decay: String(analysis.trace.decay),
        weights: latest.weights,
      });
      find("memoryRetention").textContent =
        (100 * Math.pow(analysis.trace.decay, 20)).toFixed(1) + "%";
      find("memoryToken").max = analysis.trace.T - 1;
      find("memoryToken").value = t;
      find("memoryToken").setAttribute(
        "aria-valuetext",
        `Token ${t}, letter ${frame.token}. Memory before this token writes.`,
      );
      find("memoryTokenOut").textContent = `${t} · ${frame.token}`;
      find("memoryContext").textContent =
        `${latest.weights} weights · layer ${latest.layer} · head ${head} · token indices start at 0`;
      find("memoryNorm").textContent = number(frame.stats.stateNorm);
      find("memoryActive").textContent = `${frame.stats.activeCount} / 1,024`;
      find("memoryChanges").textContent =
        `${frame.stats.stronger} ↑ / ${frame.stats.weaker} ↓`;
      const ce = frame.stats.nextTokenCE;
      const baselineCE =
        t < native.trace.T - 1 ? native.output.crossEntropyBits[t] : null;
      find("memoryCE").textContent =
        ce === null ? "No next token" : number(ce) + " bits";
      find("memoryNativeCE").textContent =
        baselineCE === null ? "No next token" : number(baselineCE) + " bits";
      find("memoryCELabel").textContent =
        mode === "decay"
          ? "With experimental decay"
          : "Selected native prediction";
      const empty = t === 0;
      const sentence = empty
        ? "At token 0, memory is empty: there are no earlier tokens to read. The selected token writes only after this read. Step forward to see those writes become available."
        : mode === "native"
          ? `${frame.stats.stronger} sampled connections grew in magnitude and ${frame.stats.weaker} shrank since the preceding state. This checkpoint retains earlier writes without an explicit decay multiplier. A connection can still weaken through signed cancellation, and a gate can be quiet without its stored history being erased.`
          : `Each update retains ${(retention * 100).toFixed(0)}% of the previous state before adding a fresh write. This is an experimental change to every attention head and layer, not the native checkpoint. Repeated input may replenish some connections while other contributions fade; new writes can also cancel or reverse them.`;
      find("memoryInterpretation").textContent = sentence;
      let verdict;
      if (ce === null)
        verdict =
          "There is no observed next token at the end of this sequence, so no next-token error can be scored here.";
      else if (mode === "native")
        verdict = `The observed next letter is “${String.fromCharCode(97 + analysis.output.tokens[t + 1])}”. Its next-token error is ${number(ce)} bits. Lower error means more probability on that observed letter. A thicker graph or fewer active gates alone does not establish better prediction.`;
      else {
        const difference = ce - baselineCE;
        verdict = `For the observed next letter “${String.fromCharCode(97 + analysis.output.tokens[t + 1])}”, experimental decay ${Math.abs(difference) < 1e-6 ? "leaves the measured error effectively unchanged" : difference < 0 ? "lowers error by " + number(-difference) + " bits" : "raises error by " + number(difference) + " bits"}. ${Math.abs(difference) < 1e-6 ? "Neither setting wins at this step." : difference < 0 ? "That helps this prediction." : "That hurts this prediction."} One token is not an overall quality result; scrub through other positions before drawing a conclusion.`;
      }
      find("memoryVerdict").textContent = verdict;
      find("memoryModeNote").textContent =
        mode === "native"
          ? "NATIVE CHECKPOINT · λ = 1 · NO EXPLICIT DECAY"
          : `EXPERIMENTAL VARIANT · λ = ${retention.toFixed(2)} · ALL HEADS & LAYERS`;
      find("memoryStatus").textContent =
        `Measured memory ready. ${analysis.selection.sources.length} cue coordinates × ${analysis.selection.targets.length} gate neurons from one head. Reconstruction error ${(analysis.normalizedError * 100).toExponential(1)}% of peak attention.`;
      enable(true);
    }
    function sync() {
      const snapshot = bridge.get();
      latest = snapshot;
      if (!snapshot.ready) {
        clear();
        return;
      }
      const heads = snapshot.model.w.nh;
      if (find("memoryHead").options.length !== heads) {
        find("memoryHead").replaceChildren(
          ...Array.from({ length: heads }, (_, i) => {
            const option = document.createElement("option");
            option.value = i;
            option.textContent = "Head " + i;
            return option;
          }),
        );
        head = Math.min(head, heads - 1);
        find("memoryHead").value = head;
      }
      find("memoryRepeat").textContent = snapshot.instrument
        ? "First repeat"
        : "Middle of text";
      const key =
        snapshot.weights +
        "|" +
        snapshot.layer +
        "|" +
        head +
        "|" +
        snapshot.tokens.join(",");
      const variantKey = key + "|" + retention;
      const target =
        key + "|" + mode + (mode === "decay" ? "|" + retention : "");
      if (activeKey === target) {
        request++;
        clearTimeout(scheduled);
        scheduled = 0;
        wantedKey = target;
        paint();
        return;
      }
      if (wantedKey === target && scheduled) return;
      wantedKey = target;
      const version = ++request;
      clearTimeout(scheduled);
      enable(false);
      find("memoryStatus").textContent =
        mode === "decay"
          ? "Computing the full model with experimental memory decay…"
          : "Reconstructing measured memory from the live model…";
      [
        "memoryNorm",
        "memoryActive",
        "memoryCE",
        "memoryNativeCE",
        "memoryChanges",
        "memoryRetention",
      ].forEach((id) => (find(id).textContent = "·"));
      find("memoryVerdict").textContent =
        "Waiting for the selected experiment’s prediction error.";
      find("memoryContext").textContent =
        `${snapshot.weights} weights · layer ${snapshot.layer} · head ${head} · computing`;
      find("memoryModeNote").textContent =
        mode === "native"
          ? "NATIVE CHECKPOINT · λ = 1 · NO EXPLICIT DECAY"
          : `EXPERIMENTAL VARIANT · λ = ${retention.toFixed(2)} · ALL HEADS & LAYERS`;
      find("memoryInterpretation").textContent =
        "Computing the selected state. The diagram will appear when its values have been verified.";
      scheduled = setTimeout(() => {
        scheduled = 0;
        try {
          const baseline =
            cache.get(key) ||
            remember(
              key,
              window.BDHMemory.analyze(snapshot.model, snapshot.tokens, {
                layer: snapshot.layer,
                head,
              }),
            );
          const alternate =
            mode === "decay"
              ? cache.get(variantKey) ||
                remember(
                  variantKey,
                  window.BDHMemory.analyze(snapshot.model, snapshot.tokens, {
                    layer: snapshot.layer,
                    head,
                    decay: retention,
                    selection: baseline.selection,
                  }),
                )
              : cache.get(variantKey) || null;
          if (version !== request) return;
          native = baseline;
          variant = alternate;
          activeKey = target;
          paint();
        } catch (error) {
          if (version !== request) return;
          activeKey = "";
          wantedKey = "";
          enable(false);
          stop();
          container.setAttribute("aria-busy", "false");
          find("memoryStatus").textContent =
            "Memory view unavailable: " + error.message;
        }
      }, 50);
    }
    function setMode(next) {
      stop();
      mode = next;
      find("memoryModeNative").setAttribute(
        "aria-pressed",
        String(mode === "native"),
      );
      find("memoryModeDecay").setAttribute(
        "aria-pressed",
        String(mode === "decay"),
      );
      find("memoryDecayControls").hidden = mode !== "decay";
      container.dataset.memoryMode = mode;
      sync();
    }
    find("memoryModeNative").addEventListener("click", () => setMode("native"));
    find("memoryModeDecay").addEventListener("click", () => setMode("decay"));
    find("memoryDecay").addEventListener("input", () => {
      stop();
      retention = Number(find("memoryDecay").value);
      find("memoryDecayOut").textContent = retention.toFixed(2);
      find("memoryHalfLife").textContent =
        retention === 1
          ? "No explicit fading at λ = 1."
          : `An old write retains half its magnitude after about ${Math.log(0.5) / Math.log(retention) < 10 ? (Math.log(0.5) / Math.log(retention)).toFixed(1) : Math.round(Math.log(0.5) / Math.log(retention))} further updates, before accounting for new writes.`;
      sync();
    });
    find("memoryHead").addEventListener("change", () => {
      stop();
      head = Number(find("memoryHead").value);
      sync();
    });
    find("memoryToken").addEventListener("input", () => {
      stop();
      bridge.select(Number(find("memoryToken").value));
    });
    find("memoryPlay").addEventListener("click", () => {
      if (timer) {
        stop();
        return;
      }
      bridge.stopPlayback();
      if (latest.token >= latest.tokens.length - 1) bridge.select(0);
      find("memoryPlay").textContent = "Pause memory";
      timer = setInterval(() => {
        const current = bridge.get();
        if (!current.ready || current.token >= current.tokens.length - 1) {
          stop();
          return;
        }
        bridge.select(current.token + 1);
      }, 350);
    });
    [
      ["memoryStart", () => 0],
      [
        "memoryRepeat",
        () =>
          latest.instrument
            ? Math.min(21, latest.tokens.length - 1)
            : Math.floor(latest.tokens.length / 2),
      ],
      ["memoryLate", () => Math.max(0, latest.tokens.length - 2)],
    ].forEach(([id, index]) =>
      find(id).addEventListener("click", () => {
        stop();
        bridge.select(index());
      }),
    );
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stop();
    });
    return {
      sync,
      clear,
      stop,
      getSnapshot() {
        return native && latest
          ? {
              step: latest.token,
              head,
              layer: latest.layer,
              weights: latest.weights,
              decay: mode === "decay" ? retention : 1,
              ready: activeKey === wantedKey,
              selection: native.selection,
            }
          : { ready: false };
      },
      get mode() {
        return mode;
      },
      get analysis() {
        return mode === "decay" ? variant : native;
      },
    };
  }
  window.MemoryLab = { mount };
})();
