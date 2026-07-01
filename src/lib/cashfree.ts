import { Cashfree, CFEnvironment } from "cashfree-pg";

export function createCashfreeInstance(appId: string | null, secretKey: string | null) {
  if (!appId || !secretKey) {
    throw new Error('Cashfree credentials not configured');
  }

  // We set env to SANDBOX for test keys and PRODUCTION for live keys.
  const isProd = !appId.startsWith('TEST');
  const env = isProd ? CFEnvironment.PRODUCTION : CFEnvironment.SANDBOX;
  
  return new Cashfree(env, appId, secretKey);
}
