import statesAndLgas from '../data/nigeria-lgas.json';
export const NIGERIA_STATES = Object.keys(statesAndLgas).sort();
const key = value => String(value || '').toLowerCase().replace(/state|local government area|local government|area council|\blga\b/g,'').replace(/[^a-z0-9]/g,'');
export function normalizeCountry(value) {
  const country = String(value || '').trim();
  return /^(nigeria|ng|nga)$/i.test(country) || !country ? 'Nigeria' : country;
}
export function normalizeState(value, country = 'Nigeria') {
  if (normalizeCountry(country) !== 'Nigeria') return String(value || '').trim();
  const input = key(value);
  if (['fct','abuja','abujafct','federalcapitalterritory','federalcapitalterritoryabuja'].includes(input)) return 'FCT';
  if (input === 'nassarawa') return 'Nasarawa';
  return NIGERIA_STATES.find(state => key(state) === input) || '';
}
export function getLgas(state) { return statesAndLgas[normalizeState(state)] || []; }
export function normalizeLga(state, value) {
  let input = key(value);
  if (normalizeState(state) === 'FCT' && ['amac','municipal','abujamunicipal','municipalabujamunicipal'].includes(input)) input = key('Abuja Municipal');
  return getLgas(state).find(lga => key(lga) === input) || '';
}
export function isLocationComplete(location) {
  return !!(String(location.address||'').trim() && String(location.city||'').trim() && String(location.state||'').trim()
    && (normalizeCountry(location.country) !== 'Nigeria' || (normalizeState(location.state) && normalizeLga(location.state,location.lga))));
}
export function locationPatch(current, updates) {
  const next = {...current,...updates, country:normalizeCountry(updates.country ?? current.country)};
  if (updates.country !== undefined && updates.country !== current.country) {
    next.state = updates.state ?? ''; next.lga = updates.lga ?? '';
  }
  next.state = normalizeState(next.state,next.country);
  if (next.country === 'Nigeria') next.lga = normalizeLga(next.state,
    updates.lga ?? (next.state === normalizeState(current.state,current.country) ? current.lga : ''));
  return {...updates, state:next.state, lga:next.lga, country:next.country};
}
export function selectedPlacePatch(data, details, current) {
  const components = details?.address_components || [];
  const find = type => components.find(component => component.types?.includes(type))?.long_name || '';
  const country = normalizeCountry(find('country') || current.country);
  const state = normalizeState(find('administrative_area_level_1') || current.state,country);
  const lga = country === 'Nigeria' ? normalizeLga(state,find('administrative_area_level_2') || find('administrative_area_level_3')) : find('administrative_area_level_2');
  const patch = {address:data?.description || details?.formatted_address || current.address,
    city:find('locality') || find('sublocality') || current.city || '', state, country,
    lga:lga || (state === normalizeState(current.state,current.country) ? current.lga || '' : ''),
    postalCode:find('postal_code') || current.postalCode || ''};
  const latitude = details?.geometry?.location?.lat, longitude = details?.geometry?.location?.lng;
  if (Number.isFinite(latitude) && Number.isFinite(longitude)) Object.assign(patch,{latitude,longitude});
  return patch;
}
export function fullPropertyAddress(address, addressLine2) { return [address,addressLine2].map(value=>String(value||'').trim()).filter(Boolean).join(', '); }
