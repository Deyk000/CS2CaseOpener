// Renders the "Contains one of the following" grid shown before the case is opened.
// All possible drops are listed left→right by rarity (Mil-Spec → Special), each
// card displays the skin image + name + a colored rarity bar at the bottom.
//
// Case contents are frozen at load, so the rendered DOM is cached per case
// and reused on re-selection — avoids re-parsing the ~22-item HTML each click.

const RARITY_ORDER = ['milspec', 'restricted', 'classified', 'covert', 'extraordinary'];
const CACHE = new Map(); // caseId -> HTMLElement

function rarityRank(id) {
  const idx = RARITY_ORDER.indexOf(id);
  return idx === -1 ? RARITY_ORDER.length : idx;
}

export function renderCasePreview(container, caseData) {
  if (!container || !caseData) return;

  const cached = CACHE.get(caseData.id);
  if (cached) {
    container.replaceChildren(cached);
    return;
  }

  const items = [...(caseData.items ?? []), ...(caseData.specialPool ?? [])];
  items.sort((a, b) => rarityRank(a.rarity) - rarityRank(b.rarity));

  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
    <div class="preview-hero">
      <div class="preview-hero-art">
        <img src="${caseData.image}" alt="${caseData.name}" />
      </div>
      <div class="preview-hero-info">
        <div class="preview-hero-label">Unlock Container</div>
        <div class="preview-hero-name">${caseData.name}</div>
        <div class="preview-hero-sub">Contains one of the following:</div>
      </div>
    </div>
    <div class="preview-grid">
      ${items
        .map(
          (item) => `
            <article class="preview-card" data-rarity="${item.rarity}">
              <div class="preview-card-art">
                <img src="${item.image}" alt="${item.name}" loading="lazy" />
              </div>
              <div class="preview-card-weapon">${item.weapon ?? ''}</div>
              <div class="preview-card-finish">${item.finish ?? item.name}</div>
            </article>
          `,
        )
        .join('')}
    </div>
  `;

  // Cache the built fragment as a single DOM tree we can re-insert later.
  const fragment = document.createElement('div');
  fragment.className = 'case-preview-cached';
  while (wrapper.firstChild) fragment.appendChild(wrapper.firstChild);
  CACHE.set(caseData.id, fragment);
  container.replaceChildren(fragment);
}
