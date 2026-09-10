'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/private/tmp/dataforge-tools/node_modules/playwright');
const output = process.env.TEST_OUTPUT || path.resolve(__dirname, '../test-results/memory');
fs.mkdirSync(output, { recursive: true });
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const evidence = { passed: false, url: process.env.TEST_URL || 'http://127.0.0.1:8000/', checked_at: new Date().toISOString(), browser: browser.version(), checks: [], screenshots: [] };
  try {
    await page.goto(process.env.TEST_URL || 'http://127.0.0.1:8000/');
    await page.waitForFunction(() => state.result && !state.result.pending && typeof memoryLabController !== 'undefined' && memoryLabController && document.querySelector('.memory-graph__node'));
    const settle = async () => { await page.waitForFunction(() => document.querySelector('#memoryLab').getAttribute('aria-busy') === 'false' && /Measured memory ready/.test(document.querySelector('#memoryStatus').textContent)); };
    const select = async t => { await page.evaluate(t => selectToken(t), t); await settle(); };
    const ids = () => page.locator('.memory-graph__node').evaluateAll(nodes => nodes.map(n => n.getAttribute('data-memory-key')));
    const edgeIds = () => page.locator('.memory-graph__edge').evaluateAll(edges => edges.map(e => e.getAttribute('data-memory-key')));
    const baselineNodes = await ids();
    const baselineEdges = await edgeIds();
    assert(baselineNodes.length > 0);
    for (const token of [0,13,21,76]) {
      await select(token);
      assert.equal(await page.locator('#memoryToken').inputValue(), String(token));
      assert.deepEqual(await ids(), baselineNodes);
      assert.deepEqual(await edgeIds(), baselineEdges);
      assert(!/NaN|Infinity/.test(await page.locator('#memoryLab').innerText()));
    }
    evidence.checks.push('Global token synchronizes graph; node cohort stable over playback; finite metrics');
    await page.locator('#memoryModeDecay').click();
    await settle();
    assert.match(await page.locator('#memoryLab').innerText(), /counterfactual|modified|experiment/i);
    assert.deepEqual(await ids(), baselineNodes);
    assert.deepEqual(await edgeIds(), baselineEdges);
    assert.equal(await page.evaluate(() => memoryLabController.analysis.trace.decay), .96);
    await page.locator('#memoryToken').evaluate(el => { el.value = '30'; });
    await page.locator('#memoryToken').dispatchEvent('input');
    await settle();
    assert.equal(await page.evaluate(() => state.selectedToken),30);
    const decayCE = await page.evaluate(() => memoryLabController.analysis.output.crossEntropyBits[state.selectedToken]);
    assert.equal(await page.locator('#memoryCE').innerText(), decayCE.toFixed(3)+' bits');
    assert.match(await page.locator('#memoryVerdict').innerText(), /One token is not an overall quality result/);
    await page.locator('#memoryModeNative').click();
    await settle();
    assert.match(await page.locator('#memoryInterpretation').innerText(), /without.*erased/);
    evidence.checks.push('Damping mode visibly distinguished; graph slider synchronizes global token; CE matches actual modified output and conclusion limited to this token');
    await select(30);
    const mainOutput = () => page.evaluate(() => JSON.stringify({counts:state.result.activeCounts,xy:state.result.xySparse,ce:state.result.crossEntropyBits,ratio:document.querySelector('#roRatio').textContent}));
    const unchanged = await mainOutput();
    await page.locator('#memoryModeDecay').click();
    await settle();
    for (const retention of [.8,.96,1]) {
      await page.locator('#memoryDecay').evaluate((el,value) => {el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));},retention);
      await settle();
      assert.equal(await mainOutput(),unchanged);
      assert.equal(await page.evaluate(() => memoryLabController.analysis.trace.decay),retention);
      if(retention===1) assert.equal(await page.locator('#memoryCE').innerText(),await page.locator('#memoryNativeCE').innerText());
    }
    // Both clicks happen before the deferred variant computation begins.
    await page.evaluate(() => {document.querySelector('#memoryModeNative').click();document.querySelector('#memoryModeDecay').click();document.querySelector('#memoryDecay').value='.83';document.querySelector('#memoryDecay').dispatchEvent(new Event('input'));document.querySelector('#memoryModeNative').click();});
    await settle();
    await page.waitForTimeout(120);
    assert.equal(await page.evaluate(() => memoryLabController.mode),'native');
    assert.equal(await page.evaluate(() => memoryLabController.analysis.trace.decay),1);
    assert.equal(await page.locator('#memoryGraph').isVisible(),true);
    assert.equal(await mainOutput(),unchanged);
    evidence.checks.push('Decay .80/.96/1 leaves main instrument unchanged; lambda1 CE matches native; rapid pending mode changes settle to native');
    await select(30);
    await page.locator('#memoryPlay').click();
    await page.waitForFunction(() => state.selectedToken>30);
    await page.locator('#memoryPlay').click();
    const pausedToken=await page.evaluate(() => state.selectedToken);
    await page.waitForTimeout(420);
    assert.equal(await page.evaluate(() => state.selectedToken),pausedToken);
    await select(75);
    await page.locator('#memoryPlay').click();
    await page.waitForFunction(() => state.selectedToken===76 && document.querySelector('#memoryPlay').textContent==='Play memory');
    evidence.checks.push('Memory playback advances, pauses, and stops at sequence end');
    // Fault injection through the actual bridge: an unavailable model must hide
    // stale graph state, then recover when the same loaded model is restored.
    await page.evaluate(() => {window.memoryTestSavedModel=models[state.weights];models[state.weights]=null;memoryLabController.sync();});
    assert.equal(await page.locator('#memoryGraph').isVisible(),false);
    assert.equal(await page.locator('#memoryPlay').isDisabled(),true);
    assert.equal(await page.evaluate(() => memoryLabController.analysis),null);
    await page.evaluate(() => {models[state.weights]=window.memoryTestSavedModel;delete window.memoryTestSavedModel;memoryLabController.sync();});
    await settle();
    assert.equal(await page.locator('#memoryGraph').isVisible(),true);
    await select(30);
    evidence.checks.push('Missing-model fault clears and hides memory; restoring model recovers without stale graph');
    for (const kind of ['untrained','trained']) for (const layer of [0,3,2]) {
      await page.evaluate(({kind,layer}) => { setWeights(kind); setLayer(layer); }, {kind,layer});
      await page.waitForFunction(kind => state.weights===kind && state.result && !state.result.pending, kind);
      await settle();
      for (const head of ['3','0']) {
        await page.locator('#memoryHead').selectOption(head);
        await settle();
        const snapshot = await page.evaluate(() => ({layer: memoryLabController.analysis.trace.layer, head: memoryLabController.analysis.trace.head, weights: state.weights, ce: memoryLabController.analysis.output.crossEntropyBits[state.selectedToken]}));
        assert.equal(snapshot.layer, layer); assert.equal(snapshot.head, Number(head)); assert.equal(snapshot.weights, kind);
        assert.match(await page.locator('#memoryContext').innerText(), new RegExp(kind + ' weights.*layer ' + layer + '.*head ' + head));
        const text = await page.locator('#memoryLab').innerText();
        assert(!/NaN|Infinity|failed/i.test(text));
      }
    }
    evidence.checks.push('Weight, layer, and head transitions remain valid');
    const node = page.locator('.memory-graph__node').first();
    await node.focus();
    await page.keyboard.press('Enter');
    await settle();
    assert.equal(await node.getAttribute('aria-pressed'), 'true');
    const edge = page.locator('.memory-graph__edge').first();
    await edge.focus();
    await page.keyboard.press('Enter');
    await settle();
    assert.equal(await edge.getAttribute('aria-pressed'), 'true');
    assert.match(await page.locator('.memory-graph__detail').innerText(), /not proof|not.*erased/i);
    evidence.checks.push('Nodes and edges receive keyboard focus and Enter activation');
    for (const width of [1440,390,320]) for (const theme of ['light','dark']) {
      await page.setViewportSize({width,height:1000});
      await page.evaluate(theme => document.documentElement.setAttribute('data-theme',theme), theme);
      await page.locator('#memoryLab').scrollIntoViewIfNeeded();
      await settle();
      const overflow = await page.evaluate(() => ({width:innerWidth, scroll:document.documentElement.scrollWidth, elements:Array.from(document.querySelectorAll('body *')).filter(el => el.getBoundingClientRect().right > innerWidth+1 && getComputedStyle(el).position !== 'absolute').map(el=>({tag:el.tagName,id:el.id,class:el.className,right:el.getBoundingClientRect().right})).slice(0,20)}));
      assert(overflow.scroll <= width+1, JSON.stringify(overflow));
      const graphBounds = await page.locator('.memory-graph__canvas').evaluate(el => { const r=el.getBoundingClientRect(); return Array.from(el.querySelectorAll('.memory-graph__node')).every(n => {const b=n.getBoundingClientRect(); return b.left>=r.left-1 && b.right<=r.right+1;}); });
      assert(graphBounds, 'Both graph columns must fit canvas at '+width);
      const file = `memory-${width}-${theme}.png`;
      await page.screenshot({path:path.join(output,file),fullPage:false});
      evidence.screenshots.push(path.join(output,file));
    }
    evidence.checks.push('No horizontal page overflow at desktop, 390px, and 320px in both themes');
    assert.deepEqual(errors,[]);
    evidence.passed=true;
    fs.writeFileSync(path.resolve(__dirname,'../docs/memory-browser-verification.json'),JSON.stringify(evidence,null,2)+'\n');
    console.log(JSON.stringify(evidence,null,2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode=1; });
