// Helpers that let voice commands work like a mouse: they look at what is
// actually on the screen, find the control the user named, and operate it.

// ---------- Text clean-up ----------

// Lower-case, remove punctuation and "(required)" markers, and join digits
// that were heard as separate words ("9 9 1 2" becomes "9912").
export function normalize(text) {
  return (text || '')
    .toLowerCase()
    .replace(/\((required|optional)\)/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .replace(/(\d)\s+(?=\d)/g, '$1')
    .trim();
}

const DIGIT_WORDS = {
  zero: '0', oh: '0', one: '1', two: '2', three: '3', four: '4',
  five: '5', six: '6', seven: '7', eight: '8', nine: '9',
};

// "nine nine one two" -> "9912". Used for ID and phone fields.
export function spokenDigits(text) {
  return normalize(text)
    .split(' ')
    .map((word) => DIGIT_WORDS[word] ?? word)
    .join('')
    .replace(/\D/g, '');
}

export function spokenEmail(text) {
  return (text || '').toLowerCase().replace(/\s+at\s+/g, '@').replace(/\s+dot\s+/g, '.').replace(/\s+/g, '');
}

// "12 December 1999" -> "1999-12-12" (the format a date input needs). Returns '' if not understood.
export function spokenDate(text) {
  const cleaned = (text || '').replace(/(\d+)(st|nd|rd|th)/gi, '$1').replace(/\bof\b/gi, '');
  const parsed = new Date(cleaned);
  if (Number.isNaN(parsed.getTime())) return '';
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${parsed.getFullYear()}-${month}-${day}`;
}

// ---------- Finding controls on the page ----------

const SELECTOR = 'a[href], button, input:not([type="hidden"]), select, textarea, summary';

function isVisible(element) {
  return element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden';
}

// The text a person would use to name this control.
function labelFor(element) {
  if (element.matches('input, select, textarea')) {
    if (element.type === 'checkbox' || element.type === 'radio') {
      return element.closest('label')?.textContent || '';
    }
    const label = element.id && document.querySelector(`label[for="${CSS.escape(element.id)}"]`);
    return label?.textContent || element.getAttribute('aria-label') || '';
  }
  return element.getAttribute('aria-label') || element.textContent || '';
}

function kindOf(element) {
  if (element.tagName === 'SELECT') return 'select';
  if (element.tagName === 'TEXTAREA') return 'text';
  if (element.tagName === 'INPUT') {
    if (element.type === 'checkbox' || element.type === 'radio') return 'checkbox';
    if (element.type === 'file') return 'file';
    if (element.type === 'password') return 'password';
    return 'text';
  }
  return 'button';
}

// Every visible control. While a dialog is open, only the dialog counts,
// exactly as a mouse user could only click inside it.
export function collectControls() {
  const root = document.querySelector('.dialog') || document.body;
  return [...root.querySelectorAll(SELECTOR)]
    .filter((element) => isVisible(element))
    .map((element) => {
      const label = normalize(labelFor(element));
      const row = element.closest('tr');
      const aliases = [label];
      // In tables, "view" can be narrowed by saying the row, e.g. "view Thabo".
      if (row && label) aliases.push(normalize(`${labelFor(element)} ${row.textContent}`));
      const rawLabel = labelFor(element).replace(/\((required|optional)\)/g, '').trim();
      const description = row ? `${rawLabel}, ${row.textContent.replace(/\s+/g, ' ').trim().slice(0, 50)}` : rawLabel;
      return { element, kind: kindOf(element), label, aliases, rawLabel, description };
    })
    .filter((control) => control.label);
}

function scoreAlias(phrase, alias, isRowAlias) {
  let score = 0;
  if (alias === phrase) score = 4;
  else if (alias.startsWith(phrase + ' ') || alias.endsWith(' ' + phrase)) score = 3;
  else if (phrase.length >= 3 && alias.includes(phrase)) score = 2;
  else if (alias.length >= 4 && phrase.includes(alias)) score = 1;
  return isRowAlias && score > 1 ? score - 1 : score;
}

// Returns the best-matching controls (several when the spoken name is ambiguous).
export function findControls(spoken, controls) {
  const phrase = normalize(spoken);
  if (!phrase) return [];
  const scored = controls
    .map((control) => ({
      control,
      score: Math.max(...control.aliases.map((alias, i) => scoreAlias(phrase, alias, i > 0))),
    }))
    .filter((item) => item.score > 0);
  const best = Math.max(0, ...scored.map((item) => item.score));
  return scored.filter((item) => item.score === best).map((item) => item.control);
}

// Controls that can be filled in, in page order (used by "next field").
export function fillableControls() {
  return collectControls().filter((c) => c.kind === 'text' || c.kind === 'select');
}

// ---------- Operating controls ----------

// Puts a value into a React-controlled input and tells React about it.
export function setControlValue(element, value) {
  const prototype = element.tagName === 'SELECT' ? HTMLSelectElement.prototype
    : element.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype
    : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, 'value').set.call(element, value);
  element.dispatchEvent(new Event(element.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
}

export function selectOptionByText(select, spoken) {
  const phrase = normalize(spoken);
  const options = [...select.options].filter((o) => o.value !== '');
  const match = options.find((o) => normalize(o.textContent) === phrase)
    || options.find((o) => normalize(o.textContent).includes(phrase) && phrase.length >= 2);
  if (!match) return null;
  setControlValue(select, match.value);
  return match.textContent;
}

export function optionNames(select) {
  return [...select.options].filter((o) => o.value !== '').map((o) => o.textContent);
}

// Text of the open dialog or the main page, for "read this page".
export function pageText(limit = 700) {
  const root = document.querySelector('.dialog') || document.querySelector('main') || document.body;
  return root.innerText.replace(/\s+/g, ' ').trim().slice(0, limit);
}

export function pageTitle() {
  return document.querySelector('.dialog h2')?.textContent || document.querySelector('main h1')?.textContent || '';
}
