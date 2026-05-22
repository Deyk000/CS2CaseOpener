const STREAK_BONUS = [0, 0.5, 1, 1.5, 2, 3, 5]; // mirror of economy.js — used for the strip preview

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function msUntilMidnight() {
  const now = new Date();
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return next - now;
}

function formatCountdown(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function renderProgressPanel(container, progression, balance, handlers = {}) {
  const balanceEur = (Number(balance) || 0).toFixed(2);
  const nextReward = handlers.nextReward ?? null;
  const claimedToday = progression.lastDailyClaimDate === todayKey();
  const streakDay = Math.max(0, Math.min(7, progression.currentStreak ?? 0));
  const nextStreakIndex = Math.min(STREAK_BONUS.length - 1, streakDay); // what tomorrow pays
  const tomorrowBonus = STREAK_BONUS[nextStreakIndex];
  // Base daily reward = €2 (from economy.js)
  const tomorrowTotal = 2 + (tomorrowBonus ?? 0);

  container.innerHTML = `
    <section class="progress-panel">
      <div class="progress-head">
        <strong>Level ${progression.level}</strong>
        <span>${progression.xp} XP</span>
      </div>
      <div class="progress-bar"><div class="progress-bar-fill" style="width:${Math.min(100, (progression.xp % 500) / 5)}%"></div></div>
      ${nextReward ? `
        <div class="progress-next-reward">
          Next milestone: <strong>Level ${nextReward.level}</strong> → <span class="next-reward-coins">+€${nextReward.coins.toFixed(2)}</span>
        </div>
      ` : ''}

      <div class="daily-block">
        <div class="daily-strip" aria-label="Daily login streak">
          ${Array.from({ length: 7 }, (_, i) => {
            const day = i + 1;
            const isClaimed = day <= streakDay && claimedToday ? true : day < streakDay;
            const isToday = (day === streakDay && claimedToday) || (day === streakDay + 1 && !claimedToday && streakDay > 0) || (day === 1 && streakDay === 0 && !claimedToday);
            return `<div class="daily-dot${isClaimed ? ' claimed' : ''}${isToday ? ' today' : ''}" title="Day ${day}: +€${(2 + (STREAK_BONUS[Math.min(STREAK_BONUS.length - 1, day - 1)] ?? 0)).toFixed(2)}"></div>`;
          }).join('')}
        </div>
        <div class="daily-row">
          <button type="button" class="open-btn ghost" data-daily ${claimedToday ? 'disabled' : ''}>
            ${claimedToday ? 'Claimed' : 'Claim Daily Reward'}
          </button>
          <span class="daily-balance">€${balanceEur}</span>
        </div>
        <div class="daily-meta">
          ${claimedToday
            ? `<span data-countdown>Next claim in <strong>${formatCountdown(msUntilMidnight())}</strong></span>`
            : `<span>Tomorrow: <strong>+€${tomorrowTotal.toFixed(2)}</strong></span>`}
        </div>
      </div>

      <div class="missions-list">
        ${progression.missions.map((mission) => `
          <div class="mission-item${mission.completed ? ' completed' : ''}">
            <div>${mission.label}</div>
            <div>${mission.progress}/${mission.target}</div>
          </div>
        `).join('')}
      </div>
    </section>
  `;

  container.querySelector('[data-daily]')?.addEventListener('click', () => {
    if (claimedToday) return;
    handlers.onClaimDaily?.();
  });

  // Live-tick the countdown to midnight if visible.
  const cd = container.querySelector('[data-countdown] strong');
  if (cd) {
    if (container.__countdownTimer) clearInterval(container.__countdownTimer);
    container.__countdownTimer = setInterval(() => {
      const left = msUntilMidnight();
      if (left <= 0) {
        clearInterval(container.__countdownTimer);
        handlers.onMidnight?.();
        return;
      }
      cd.textContent = formatCountdown(left);
    }, 1000);
  }
}
