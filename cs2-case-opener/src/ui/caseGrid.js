export function renderCaseGrid(container, cases, activeCaseId, onSelect) {
  container.innerHTML = cases
    .map((caseData) => {
      const price = Number(caseData.keyPrice) || 0;
      return `
        <button class="case-card${caseData.id === activeCaseId ? ' active' : ''}" type="button" data-case-id="${caseData.id}" aria-label="Select ${caseData.name}">
          <span class="case-card-art">
            <img src="${caseData.image}" alt="${caseData.name}" loading="lazy" />
          </span>
          <span class="case-card-name">${caseData.name}</span>
          <span class="case-card-meta">
            <span class="case-card-skin-count">${caseData.items.length} skins</span>
            <span class="case-card-price">€${price.toFixed(2)}</span>
          </span>
        </button>
      `;
    })
    .join('');

  container.querySelectorAll('[data-case-id]').forEach((button) => {
    button.addEventListener('click', () => onSelect(button.dataset.caseId));
  });
}
