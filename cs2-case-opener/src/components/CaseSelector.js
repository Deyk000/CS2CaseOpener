export function renderCaseSelector(container, cases, onSelect) {
  container.innerHTML = Object.entries(cases)
    .map(
      ([caseName, data]) => `
        <article class="case-card" data-case="${caseName}">
          <img src="${data.image}" alt="${caseName}" />
          <div class="case-card-name">${caseName}</div>
        </article>
      `,
    )
    .join('');

  container.querySelectorAll('.case-card').forEach((card) => {
    card.addEventListener('click', () => onSelect(card));
  });
}
