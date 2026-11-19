// Bound the wait in the UI without clearing or replacing a user's stored session.
export function withStartupTimeout(promise, timeoutMs = 12000) {
  let timer;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('Startup is taking longer than expected')), timeoutMs);
  });
  return Promise.race([promise, deadline]).finally(() => clearTimeout(timer));
}
