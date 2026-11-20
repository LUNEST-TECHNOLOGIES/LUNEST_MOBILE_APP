import { queryClient } from './queryClient';
import storageService from '../services/storageService';
import { getUserData } from '../services/userDataService';

const KEY = '@lunest_saved_screens_v1:';
const MAX_AGE = 7 * 24 * 60 * 60 * 1000;
const ALLOWED = new Set(['exploreListings','listing','hostListings','bookmarks','recently-viewed','myListingsCount','myBookingsCount','hostDashboardSnapshot','userProfile']);
const PROFILE_FIELDS = ['_id','id','userID','fullName','emailAddress','avatar','userType','hostApplicationStatus','verified','kycStatus','emailVerified','phoneNumber','phoneVerified','active'];
let epoch = 0;
let owner = null, initialized = false, unsubscribe = null, timer = null;
let operation = Promise.resolve();
const identity = user => String(user?.id || user?._id || 'public');
function dataFor(query) {
  if (query.queryKey[0] !== 'userProfile') return query.state.data;
  return Object.fromEntries(PROFILE_FIELDS.filter(key => query.state.data?.[key] !== undefined).map(key => [key,query.state.data[key]]));
}
function scheduleSave() {
  clearTimeout(timer);
  const account = owner;
  timer = setTimeout(() => {
    if (owner !== account) return;
    const queries = queryClient.getQueryCache().getAll()
      .filter(query => ALLOWED.has(query.queryKey[0]) && query.state.data !== undefined && Date.now()-query.state.dataUpdatedAt < MAX_AGE)
      .sort((a,b) => b.state.dataUpdatedAt-a.state.dataUpdatedAt).slice(0,40)
      .map(query => ({key:query.queryKey, data:dataFor(query), updatedAt:query.state.dataUpdatedAt}));
    const snapshot = {owner:account,savedAt:Date.now(),queries};
    // Avoid filling device storage with an unbounded browsing history.
    if (JSON.stringify(snapshot).length < 3_000_000) storageService.setItem(KEY+account,snapshot).catch(() => {});
  }, 500);
}
export function restoreOfflineQueries() {
  operation = operation.catch(() => {}).then(async () => {
    const version = epoch;
    const account = identity(await getUserData());
    if (version !== epoch) return;
    if (initialized && account === owner) return;
    clearTimeout(timer); unsubscribe?.();
    if (initialized) { await queryClient.cancelQueries(); queryClient.clear(); }
    owner = account; initialized = true;
    const saved = await storageService.getItem(KEY+account);
    if (version !== epoch) return;
    if (saved?.owner === account && Date.now()-saved.savedAt < MAX_AGE && Array.isArray(saved.queries)) {
      for (const query of saved.queries) {
        if (Array.isArray(query.key) && ALLOWED.has(query.key[0])) queryClient.setQueryData(query.key,query.data,{updatedAt:query.updatedAt});
      }
    }
    unsubscribe = queryClient.getQueryCache().subscribe(scheduleSave);
  });
  return operation;
}
export async function clearOfflineQueries() {
  epoch++;
  clearTimeout(timer); unsubscribe?.(); unsubscribe = null;
  const previous = owner || identity(await getUserData());
  owner = null; initialized = false;
  await queryClient.cancelQueries();
  queryClient.clear();
  await storageService.removeItem(KEY+previous);
}
