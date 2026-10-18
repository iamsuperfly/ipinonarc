export const CIRCLE_APP_ID = "503a5268-fde6-54e8-a797-dc4326d050f6";

export function circleKey(env: Record<string, string | undefined>) {
  return env.CIRCLE_API_KEY || env.TEST_API_KEY || "";
}

export function circleHost(key: string) {
  return key.startsWith("LIVE_API_KEY") ? "https://api.circle.com" : "https://api.circle.com";
}

export function socialTokenBody(deviceId: string, idempotencyKey: string) {
  return { deviceId, idempotencyKey };
}

export function circleReady(apiKey?: string, appId?: string) {
  return Boolean(apiKey && appId);
}

export function circleFailure(status: number) {
  if (status === 401) return "Circle did not accept the key. Check the test key on this deploy.";
  if (status === 400) return "Circle did not accept this browser. Try again.";
  return "Couldn't reach Circle. Try again.";
}
