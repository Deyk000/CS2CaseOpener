export function renderCaseSelector(container, cases, onSelect) {
  container.innerHTML = Object.entries(cases)
    .map(
      ([caseName, data]) => {
        const initials = caseName
          .split(/\s+/)
          .map((word) => word[0])
          .join('')
          .replace(/[^A-Z0-9]/gi, '')
          .slice(0, 3)
          .toUpperCase();

        return `
        <article class="case-card" data-case="${caseName}">
          <div class="case-card-art">
            <span class="case-card-fallback" hidden>${initials}</span>
            <img src="${data.image}" alt="${caseName}" />
          </div>
          <div class="case-card-name">${caseName}</div>
        </article>
      `;
      },
    )
    .join('');

  container.querySelectorAll('.case-card img').forEach((image) => {
    image.addEventListener('error', () => {
      image.hidden = true;
      const fallback = image.parentElement?.querySelector('.case-card-fallback');

      if (fallback) {
        fallback.hidden = false;
      }
    });
  });

  container.querySelectorAll('.case-card').forEach((card) => {
    card.addEventListener('click', () => onSelect(card));
  });
}
