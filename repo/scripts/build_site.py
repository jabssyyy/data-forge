#!/usr/bin/env python3
"""Assemble the public static artifact from an explicit file allowlist."""
import argparse
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def build(destination):
    destination = Path(destination).resolve()
    if destination == ROOT or ROOT in destination.parents and destination.name != '_site':
        raise ValueError('Use _site in the repository or a directory outside it')
    destination.mkdir(parents=True, exist_ok=True)
    required = [
        'index.html', 'style.css', 'app.js', 'bdh.js', 'favicon.svg',
        'ui.js', 'ui.css', 'og-preview.png',
        'memory.js', 'graph-view.js', 'graph-view.css', 'memory-lab.js', 'memory-lab.css',
        'docs/memory-explainer.md', 'docs/memory-verification.json',
        'docs/memory-browser-verification.json',
        'docs/requirements-audit.md',
        'weights_trained.json', 'weights_untrained.json', 'results.json',
        'README.md', 'LICENSE', 'docs/concept-summary.pdf', 'docs/blog.pdf',
        'docs/concept-summary.md', 'docs/blog.md', 'docs/sources.md',
        'docs/licenses.md', 'docs/upstream-bdh-LICENSE.txt', 'docs/ibm-plex-LICENSE.txt',
        'docs/baseline-evidence.json', 'docs/baseline-audit.md',
        'docs/reproduction-check.json', 'docs/pdf-verification.md',
        'docs/submission-checklist.md', 'docs/defense-notes.md',
        'docs/browser-verification.json', 'docs/browser-edge-check.json',
        'docs/public-preview-check.json', 'docs/public-pdf-verification.json',
        'docs/ui-verification.json', 'docs/webfont-LICENSES.txt',
        'docs/contrast-verification.json',
    ]
    optional = [
        'transformer.js', 'weights_transformer.json', 'weights_transformer_untrained.json',
        'results_transformer.json', 'results_transformer_untrained.json',
        'docs/transformer-results.md', 'docs/transformer-protocol.md',
    ]
    for relative in required + [p for p in optional if (ROOT / p).exists()]:
        source = ROOT / relative
        if not source.is_file() or source.is_symlink():
            raise ValueError(f'Missing or unsafe release file: {relative}')
        target = destination / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, target)
    (destination / '.nojekyll').write_text('')
    print(f'Static release assembled at {destination}')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--out', default=str(ROOT / '_site'))
    build(parser.parse_args().out)
