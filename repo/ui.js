/* =====================================================================
   ui.js - page furniture for the instrument.

   Everything in this file is chrome: navigation, keyboard access, outbound
   links, toasts, the privacy note, the scroll indicator. None of it
   computes, caches, or reports a measurement. Every keyboard shortcut
   dispatches the same event a mouse would, so the model code in app.js
   stays the single path through which a measurement can change.

   It runs after app.js and degrades quietly: if an element is absent the
   feature simply does not wire itself up.
   ===================================================================== */
(function () {
  "use strict";

  var $ = function (id) {
    return document.getElementById(id);
  };
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  var store = {
    get: function (key) {
      try {
        return localStorage.getItem(key);
      } catch (_) {
        return null; /* private mode, blocked storage: treat as unset */
      }
    },
    set: function (key, value) {
      try {
        localStorage.setItem(key, value);
      } catch (_) {
        /* nothing to do: the feature must still work for this visit */
      }
    },
  };

  /* ------------------------------------------------------------ toasts */
  var toastRegion = $("toastRegion");

  function toast(message, kind) {
    if (!toastRegion) return;
    var node = document.createElement("div");
    node.className = "toast" + (kind ? " toast--" + kind : "");
    var text = document.createElement("span");
    text.className = "toast__text";
    text.textContent = message;
    var close = document.createElement("button");
    close.type = "button";
    close.className = "toast__close";
    close.setAttribute("aria-label", "Dismiss this message");
    close.textContent = "×";
    node.append(text, close);
    toastRegion.append(node);

    var removed = false;
    var remove = function () {
      if (removed) return;
      removed = true;
      node.classList.add("is-leaving");
      window.setTimeout(function () {
        node.remove();
      }, reduceMotion.matches ? 0 : 220);
    };
    close.addEventListener("click", remove);
    window.setTimeout(remove, kind === "error" ? 7000 : 4200);
    return node;
  }

  /* expose one narrow hook so other scripts can report to the reader */
  window.bdhToast = toast;

  /* --------------------------------------------------- outbound links */
  /* A reader following a citation should not lose the instrument they were
   * reading. Every link that leaves the page opens in a new tab, and says
   * so for anyone who cannot see the arrow glyph. Static links already
   * carry the attributes; this covers links written into the page at
   * runtime, such as the offline comparison results. */
  function markOutbound(root) {
    var links = (root || document).querySelectorAll("a[href]");
    Array.prototype.forEach.call(links, function (link) {
      var href = link.getAttribute("href") || "";
      var leaves = /^https?:/i.test(href) || href.indexOf("docs/") === 0;
      if (!leaves || link.dataset.outbound === "1") return;
      link.dataset.outbound = "1";
      link.setAttribute("target", "_blank");
      link.setAttribute("rel", "noopener noreferrer");
      var note = document.createElement("span");
      note.className = "vh";
      note.textContent = " (opens in a new tab)";
      link.append(note);
    });
  }

  function wireOutboundLinks() {
    markOutbound(document);
    /* app.js writes the offline comparison table (and its links) into
     * #comparisonResults once an async fetch resolves, and that is the
     * only place a link is written in after load. Watching that node
     * instead of document.body keeps this observer quiet through token
     * playback and grid rebuilds, which mutate the body constantly but
     * never add a link. Fall back to document.body if that container is
     * ever missing, so new links written elsewhere still get caught. */
    var target = $("comparisonResults") || document.body;
    var observer = new MutationObserver(function (records) {
      records.forEach(function (record) {
        Array.prototype.forEach.call(record.addedNodes, function (node) {
          if (node.nodeType === 1) markOutbound(node);
        });
      });
    });
    observer.observe(target, { childList: true, subtree: true });
  }

  /* --------------------------------------------------- scroll indicator */
  function wireScrollProgress() {
    var bar = $("scrollProgressBar");
    var toTop = $("backToTop");
    if (!bar && !toTop) return;
    var ticking = false;

    /* scrollHeight only changes when the viewport resizes or the document's
     * content grows or shrinks (accordion open, grid built, comparison
     * table dropped in, playback readouts). Reading it on every scroll
     * frame forces a synchronous layout recompute right after the previous
     * frame's transform write, every frame, for a number that is almost
     * always unchanged. Cache it instead and only refresh on the events
     * that can actually move it. */
    var maxScroll = 0;
    var refreshMax = function () {
      maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    };
    refreshMax();

    var update = function () {
      ticking = false;
      var y = window.scrollY || document.documentElement.scrollTop || 0;
      if (bar) {
        var ratio = maxScroll > 0 ? Math.min(1, Math.max(0, y / maxScroll)) : 0;
        bar.style.transform = "scaleX(" + ratio.toFixed(4) + ")";
      }
      if (toTop) {
        var show = y > window.innerHeight * 0.9;
        if (show === toTop.hidden) {
          toTop.hidden = !show;
          toTop.classList.toggle("is-in", show);
        }
      }
    };

    window.addEventListener(
      "scroll",
      function () {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(update);
      },
      { passive: true },
    );
    window.addEventListener(
      "resize",
      function () {
        refreshMax();
        update();
      },
      { passive: true },
    );

    /* A ResizeObserver on the document element reports content-driven
     * height changes asynchronously, after layout has already settled, so
     * refreshing the cache from it never forces the reflow a per-frame
     * scrollHeight read would. Where it is unsupported the cache still
     * gets refreshed on load and on resize, which covers the common case. */
    if (window.ResizeObserver) {
      var heightObserver = new ResizeObserver(function () {
        refreshMax();
      });
      heightObserver.observe(document.documentElement);
    }

    update();

    if (toTop) {
      toTop.addEventListener("click", function () {
        window.scrollTo({
          top: 0,
          behavior: reduceMotion.matches ? "auto" : "smooth",
        });
        /* Focus has to travel with the scroll or the next Tab resumes from
         * the bottom of the page. It used to land on the skip link, which
         * made that link flash into view over the header. The claim bar is
         * the real top of the document, so send it there instead. */
        var top = $("claimBar");
        if (!top) return;
        top.setAttribute("tabindex", "-1");
        top.focus({ preventScroll: true });
      });
    }
  }

  /* ---------------------------------------------------- collapsing menu */
  function wireNavMenu() {
    var button = $("navMenuBtn");
    var panel = $("navUtil");
    if (!button || !panel) return;

    var setOpen = function (open) {
      button.setAttribute("aria-expanded", open ? "true" : "false");
      panel.classList.toggle("is-open", open);
    };

    button.addEventListener("click", function () {
      setOpen(button.getAttribute("aria-expanded") !== "true");
    });

    /* a section link has done its job once it has scrolled: close behind it */
    panel.addEventListener("click", function (event) {
      if (event.target.closest("a")) setOpen(false);
    });

    document.addEventListener("click", function (event) {
      if (panel.contains(event.target) || button.contains(event.target)) return;
      setOpen(false);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") setOpen(false);
    });
  }

  /* ---------------------------------------------------- privacy notice */
  function wirePrivacyNotice() {
    var note = $("privacyNote");
    var dismiss = $("privacyDismiss");
    if (!note || !dismiss) return;
    if (store.get("bdh-privacy-ack") === "1") return;

    /* held back until first paint has settled so it never competes with the
     * claim for a first-time reader's attention */
    window.setTimeout(function () {
      note.hidden = false;
      note.classList.add("is-in");
    }, 900);

    dismiss.addEventListener("click", function () {
      note.classList.remove("is-in");
      store.set("bdh-privacy-ack", "1");
      window.setTimeout(function () {
        note.hidden = true;
      }, reduceMotion.matches ? 0 : 200);
    });
  }

  /* ------------------------------------------------------ expandable Q&A */
  function wireFaq() {
    var list = $("faqList");
    var toggle = $("faqToggleAll");
    if (!list) return;
    var items = list.querySelectorAll("details");

    if (toggle) {
      toggle.addEventListener("click", function () {
        var expand = toggle.dataset.state !== "open";
        Array.prototype.forEach.call(items, function (item) {
          item.open = expand;
        });
        toggle.dataset.state = expand ? "open" : "closed";
        toggle.textContent = expand ? "Collapse all" : "Expand all";
      });
    }

    /* keep the control honest if the reader opens or closes items by hand */
    Array.prototype.forEach.call(items, function (item) {
      item.addEventListener("toggle", function () {
        if (!toggle) return;
        var open = 0;
        Array.prototype.forEach.call(items, function (other) {
          if (other.open) open++;
        });
        var all = open === items.length;
        toggle.dataset.state = all ? "open" : "closed";
        toggle.textContent = all ? "Collapse all" : "Expand all";
      });
    });
  }

  /* --------------------------------------------------- shortcuts dialog */
  var shortcuts = {
    open: function () {
      var dialog = $("shortcutsDialog");
      if (!dialog) return;
      dialog.hidden = false;
      dialog.classList.add("is-in");
      var close = dialog.querySelector(".shortcuts__close");
      if (close) close.focus();
    },
    close: function () {
      var dialog = $("shortcutsDialog");
      if (!dialog || dialog.hidden) return;
      dialog.classList.remove("is-in");
      dialog.hidden = true;
      var button = $("shortcutsBtn");
      if (button) button.focus();
    },
    toggle: function () {
      var dialog = $("shortcutsDialog");
      if (!dialog) return;
      dialog.hidden ? shortcuts.open() : shortcuts.close();
    },
  };

  function wireShortcutsDialog() {
    var button = $("shortcutsBtn");
    var dialog = $("shortcutsDialog");
    if (button) button.addEventListener("click", shortcuts.toggle);
    if (!dialog) return;
    dialog.addEventListener("click", function (event) {
      if (event.target.closest("[data-close-shortcuts]")) shortcuts.close();
    });
  }

  /* ------------------------------------------------------ key handling */
  function isTypingTarget(node) {
    if (!node) return false;
    var tag = node.tagName;
    return (
      tag === "INPUT" ||
      tag === "TEXTAREA" ||
      tag === "SELECT" ||
      node.isContentEditable === true
    );
  }

  /* a range input is a real control: let it keep its own arrow keys */
  function isRange(node) {
    return node && node.tagName === "INPUT" && node.type === "range";
  }

  function nudgeToken(delta) {
    var slider = $("tokenSlider");
    if (!slider || slider.disabled) return false;
    var next = Math.min(
      Number(slider.max),
      Math.max(Number(slider.min), Number(slider.value) + delta),
    );
    if (next === Number(slider.value)) return true;
    slider.value = String(next);
    slider.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  }

  function clickIfPresent(selector) {
    var node = document.querySelector(selector);
    if (!node || node.disabled) return false;
    node.click();
    return true;
  }

  function wireKeyboard() {
    document.addEventListener("keydown", function (event) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      if (event.key === "Escape") {
        shortcuts.close();
        return;
      }
      if (event.key === "?") {
        event.preventDefault();
        shortcuts.toggle();
        return;
      }

      var typing = isTypingTarget(event.target);
      if (typing && !isRange(event.target)) return;

      var handled = false;
      var step = event.shiftKey ? 10 : 1;

      switch (event.key) {
        case "ArrowLeft":
          if (!isRange(event.target)) handled = nudgeToken(-step);
          break;
        case "ArrowRight":
          if (!isRange(event.target)) handled = nudgeToken(step);
          break;
        case " ":
        case "Spacebar":
          if (!typing) handled = clickIfPresent("#playTokens");
          break;
        case "0":
        case "1":
        case "2":
        case "3":
          handled = clickIfPresent(
            '#layerSeg button[data-layer="' + event.key + '"]',
          );
          break;
        case "w":
        case "W": {
          var active = document.querySelector("#weightsSeg button.is-active");
          var next =
            active && active.dataset.weights === "trained"
              ? "untrained"
              : "trained";
          handled = clickIfPresent(
            '#weightsSeg button[data-weights="' + next + '"]',
          );
          break;
        }
        case "s":
        case "S": {
          var sandboxOn =
            document.getElementById("tabSandbox") &&
            document
              .getElementById("tabSandbox")
              .getAttribute("aria-selected") === "true";
          handled = clickIfPresent(sandboxOn ? "#tabInstrument" : "#tabSandbox");
          break;
        }
        case "m":
        case "M": {
          var lab = $("memoryLab");
          if (lab) {
            lab.scrollIntoView({
              behavior: reduceMotion.matches ? "auto" : "smooth",
              block: "start",
            });
            handled = true;
          }
          break;
        }
        case "t":
        case "T":
          handled = clickIfPresent("#themeToggle");
          break;
        case "g":
        case "G":
          window.scrollTo({
            top: 0,
            behavior: reduceMotion.matches ? "auto" : "smooth",
          });
          handled = true;
          break;
        default:
          break;
      }

      if (handled) event.preventDefault();
    });
  }

  /* --------------------------------------------------------------- boot */
  function start() {
    wireOutboundLinks();
    wireScrollProgress();
    wireNavMenu();
    wirePrivacyNotice();
    wireFaq();
    wireShortcutsDialog();
    wireKeyboard();
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", start);
  else start();
})();
