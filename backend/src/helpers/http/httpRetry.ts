export async function retry<TReturnValue, TResponse = any>(
  fn: () => Promise<TReturnValue>,
  maxRetry = 5,
): Promise<TReturnValue> {
  let attempt = 0;

  while (true) {
    try {
      return await fn();
    } catch (error: any) {
      attempt++;
      console.error('http retry response error: ', error.response?.data);
      const status = error?.response?.status;

      const shouldRetry = !status || [429, 500, 502, 503, 504].includes(status);

      if (!shouldRetry || attempt > maxRetry) {
        throw error;
      }

      const delay = 500 * 2 ** (attempt - 1);

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
