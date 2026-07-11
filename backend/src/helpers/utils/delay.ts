export const delay = (ms = 1000) =>
  new Promise((resolve) => setTimeout(resolve, ms));

type RunWithDelayIfFastOptions<T> = {
  callback: () => Promise<T> | T;
  threshold?: number;
  delayTime?: number;
};

export async function runWithDelayIfFast<T>({
  callback,
  threshold = 100,
  delayTime = 500,
}: RunWithDelayIfFastOptions<T>): Promise<T> {
  const start = Date.now();

  const result = await callback();

  const elapsed = Date.now() - start;

  if (elapsed < threshold) {
    await delay(delayTime);
  }

  return result;
}
