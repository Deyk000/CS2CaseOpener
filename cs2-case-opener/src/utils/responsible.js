let sessionCount = 0;

export function recordOpen() {
  sessionCount += 1;
  return sessionCount;
}

export function getSessionCount() {
  return sessionCount;
}
