import configService from './configService';
import { isDeviceOffline } from './connectionService';
export async function requestPlaces(type, parameters = {}, signal) {
  if (isDeviceOffline()) throw new Error('Address search is unavailable offline. You can enter the address manually.');
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort',abort);
  if (signal?.aborted) controller.abort();
  const timer = setTimeout(abort, 8000);
  try {
    const base = configService.getBaseURLSync().replace(/\/$/,'');
    const query = new URLSearchParams({type});
    for (const [key,value] of Object.entries(parameters)) if (value) query.set(key,String(value));
    const response = await fetch(`${base}${base.endsWith('/v1')?'':'/v1'}/listings/proxy-places?${query}`,{signal:controller.signal});
    const data = await response.json();
    if (!response.ok || !['OK','ZERO_RESULTS'].includes(data.status)) throw new Error('Address search is temporarily unavailable. You can enter the address manually.');
    return data;
  } finally {clearTimeout(timer);signal?.removeEventListener('abort',abort);}
}
