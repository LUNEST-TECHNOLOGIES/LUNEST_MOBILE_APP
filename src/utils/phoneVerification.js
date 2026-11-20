export function normalizeVerificationPhone(value, country = { dial: '234' }) {
  const raw = String(value || '').trim();
  if (!/^[+\d\s().-]+$/.test(raw)) return null;
  let digits = raw.replace(/\D/g, '');
  const dial = String(country.dial || '').replace(/\D/g, '');
  const international = raw.startsWith('+') || raw.startsWith('00');
  if (raw.startsWith('00')) digits = digits.slice(2);
  if (international) {
    const trunkDial = ['234','353','971','254','233','44','49','33','27'].find(prefix => digits.startsWith(prefix + '0'));
    if (trunkDial) digits = trunkDial + digits.slice(trunkDial.length + 1);
  }
  if (!international) {
    if (!dial) return null;
    const expected = dial === '234' || dial === '1' || dial === '44' ? 10 : null;
    if (digits.startsWith(dial) && expected && digits.length === dial.length + expected) digits = digits.slice(dial.length);
    if (dial !== '1' && dial !== '39') digits = digits.replace(/^0/, '');
    if (expected && digits.length !== expected) return null;
    digits = dial + digits;
  }
  if (!/^[1-9]\d{7,14}$/.test(digits)) return null;
  if (digits.startsWith('234') && !/^234[789]\d{9}$/.test(digits)) return null;
  return '+' + digits;
}
export const cleanVerificationCode = value => String(value || '').replace(/\D/g, '').slice(0, 6);
export const isCompleteVerificationCode = value => /^\d{6}$/.test(String(value || ''));
export function parseVerificationPhone(value, countries) {
  const raw = String(value || '').trim();
  const digits = raw.replace(/\D/g, '');
  const explicit = raw.startsWith('+') || raw.startsWith('00') || (digits.startsWith('234') && digits.length === 13);
  const internationalDigits = raw.startsWith('00') ? digits.slice(2) : digits;
  const country = explicit ? [...countries].filter(item => item.dial).sort((a,b) => b.dial.length-a.dial.length).find(item => internationalDigits.startsWith(item.dial)) : null;
  return country ? { country, number: internationalDigits.slice(country.dial.length) } : { country: explicit ? countries[countries.length-1] : countries[0], number: raw };
}
