/* Credits stay inside the workspace; metadata is shared with the preset library. */
(function () {
  'use strict';
  let dialog, returnFocus;
  function link(text, href) {
    const a = document.createElement('a'); a.textContent = text; a.href = href;
    a.target = '_blank'; a.rel = 'noopener'; return a;
  }
  function render(container) {
    container.replaceChildren();
    const intro = document.createElement('p'); intro.className = 'credit-intro';
    intro.textContent = 'With thanks to the artists, researchers, and open-source contributors behind these patterns. All 20 library CPs are supplied by Amanda Ghassaei’s OrigamiSimulator; individual designers are credited where identified by the source.';
    container.append(intro);
    (window.ORIGAMI_PRESETS || []).forEach(p => {
      const row = document.createElement('section'); row.className = 'credit-row'; row.id = 'credit-' + p.id;
      const title = document.createElement('strong'); title.textContent = p.name;
      const detail = document.createElement('div'), text = document.createElement('p'); text.textContent = p.credit;
      detail.append(text, link('Original CP ↗', p.source)); row.append(title, detail); container.append(row);
    });
    const heading = document.createElement('h4'); heading.className = 'credit-section-title'; heading.textContent = 'Simulation & research';
    const solver = document.createElement('p'); solver.append(link('OrigamiSimulator — Amanda Ghassaei ↗', 'https://github.com/amandaghassaei/OrigamiSimulator'), document.createTextNode('. Research by Amanda Ghassaei, Erik Demaine, and Neil Gershenfeld. Upstream also acknowledges Sasaki Kosuke and other contributors. Original licenses and library notices are retained.'));
    const notices = document.createElement('p'); notices.append(link('Full third-party notices ↗', 'THIRD_PARTY_NOTICES.md'));
    const references = document.createElement('p'); references.textContent = 'Jun Mitani’s local research reference artworks are credited to Jun Mitani and excluded from the published preset library. The project’s MIT license covers project code; it does not grant additional rights to third-party artwork.';
    container.append(heading, solver, notices, references);
  }
  function showGalleryCredits(show) {
    const panel = document.getElementById('pgCredits');
    if (!panel) return;
    panel.hidden = !show; document.getElementById('pgGrid').hidden = show;
    document.getElementById('pgSubtitle').hidden = show;
    document.getElementById('pgTitle').textContent = show ? 'Credits & Sources' : 'Preset Crease Patterns';
    const button = document.getElementById('pgCreditsButton');
    button.textContent = show ? '← Back to presets' : 'Credits'; button.setAttribute('aria-expanded', String(show));
    if (show && !panel.children.length) render(panel);
  }
  function open(id) {
    const panel = document.getElementById('pgCredits');
    if (panel) {
      document.getElementById('presetsModal').classList.add('show'); showGalleryCredits(true);
      if (id) document.getElementById('credit-' + id)?.scrollIntoView({block:'nearest'});
      return;
    }
    if (!dialog) {
      dialog = document.createElement('dialog'); dialog.className = 'credit-dialog'; dialog.setAttribute('aria-labelledby', 'creditDialogTitle');
      const header = document.createElement('h3'); header.id = 'creditDialogTitle'; header.textContent = 'Credits & Sources';
      const content = document.createElement('div'); content.className = 'credit-content'; render(content);
      const close = document.createElement('button'); close.className = 'credit-button credit-close'; close.textContent = 'Close'; close.onclick = () => dialog.close();
      dialog.append(header, content, close); document.body.append(dialog);
      dialog.addEventListener('close', () => returnFocus?.focus());
    }
    returnFocus = document.activeElement; dialog.showModal();
    if (id) document.getElementById('credit-' + id)?.scrollIntoView({block:'nearest'});
  }
  window.OrigamiCredits = { open, resetGallery: () => showGalleryCredits(false), toggleGallery: () => showGalleryCredits(document.getElementById('pgCredits').hidden) };
}());
