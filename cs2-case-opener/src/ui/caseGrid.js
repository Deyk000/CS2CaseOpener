export function renderCaseGrid(container, cases, activeCaseId, onSelect) {
  container.textContent = '';
  const fragment = document.createDocumentFragment();

  for (const caseData of cases) {
    const price = Number(caseData.keyPrice) || 0;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = `case-card${caseData.id === activeCaseId ? ' active' : ''}`;
    button.dataset.caseId = caseData.id;
    button.setAttribute('aria-label', `Select ${caseData.name}`);

    const art = document.createElement('span');
    art.className = 'case-card-art';

    const img = document.createElement('img');
    img.src = caseData.image ?? '';
    img.alt = caseData.name ?? 'Case image';
    img.loading = 'lazy';
    art.appendChild(img);

    const name = document.createElement('span');
    name.className = 'case-card-name';
    name.textContent = caseData.name ?? 'Unknown case';

    const meta = document.createElement('span');
    meta.className = 'case-card-meta';

    const skinCount = document.createElement('span');
    skinCount.className = 'case-card-skin-count';
    skinCount.textContent = `${caseData.items?.length ?? 0} skins`;

    const priceLabel = document.createElement('span');
    priceLabel.className = 'case-card-price';
    priceLabel.textContent = `€${price.toFixed(2)}`;

    meta.append(skinCount, priceLabel);
    button.append(art, name, meta);
    fragment.appendChild(button);
  }

  container.appendChild(fragment);

  container.onclick = (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const button = target.closest('[data-case-id]');
    if (!button) return;
    onSelect(button.dataset.caseId);
  };
}
