export function withTimeout(promise, ms = 8000, message = 'Request timed out') {
  let timer
  const guard = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms)
  })
  return Promise.race([promise, guard]).finally(() => clearTimeout(timer))
}
