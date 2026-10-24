// Voice navigation for EVERY user. It works like a mouse and keyboard:
// whatever control is on the screen can be used by saying its name.
// Uses the browser's Speech Recognition (listening) and Speech Synthesis (speaking).
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaMicrophone, FaMicrophoneSlash } from 'react-icons/fa';
import { useApp } from '../context/AppContext.jsx';
import {
  normalize, spokenDigits, spokenEmail, spokenDate, collectControls, findControls, fillableControls,
  setControlValue, selectOptionByText, optionNames, pageText, pageTitle,
} from './domControls.js';
import { translateSesotho, NUMBER_WORDS } from './phrases.js';

const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const VoiceContext = createContext(null);
export const useVoice = () => useContext(VoiceContext);

const STATUS_TEXT = {
  unsupported: 'not supported in this browser',
  starting: 'starting',
  listening: 'listening',
  speaking: 'speaking',
  paused: 'paused',
  blocked: 'microphone blocked',
};

const titleCase = (text) => text.replace(/\.$/, '').replace(/\b\p{L}/gu, (c) => c.toUpperCase());

export function VoiceProvider({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { language } = useApp();

  const [status, setStatus] = useState(Recognition ? 'starting' : 'unsupported');
  const [message, setMessage] = useState('');
  const [heard, setHeard] = useState('');

  // Refs hold the "live" state that callbacks need to read at any moment.
  const api = useRef({});
  const recognitionRef = useRef(null);
  const activeRef = useRef(false);           // should we be listening?
  const speakingRef = useRef(false);
  const spokeOnceRef = useRef(false);        // has the browser allowed us to speak yet?
  const lastSpokenRef = useRef('');
  const dictationRef = useRef(null);         // the field currently being filled by voice
  const choicesRef = useRef(null);           // numbered options after an ambiguous name
  const captureRef = useRef(null);           // used by the login screen
  const languageRef = useRef('en-US');
  const helpedRef = useRef(false);

  // ---------- Speaking ----------
  function speak(text) {
    setMessage(text);
    lastSpokenRef.current = text;
    if (!window.speechSynthesis) return;

    speakingRef.current = true;
    setStatus('speaking');
    try { recognitionRef.current?.abort(); } catch { /* already stopped */ }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.onstart = () => { spokeOnceRef.current = true; };
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      speakingRef.current = false;
      if (activeRef.current) { setStatus('starting'); setTimeout(startRecognition, 200); }
    };
    utterance.onend = finish;
    utterance.onerror = finish;
    setTimeout(finish, Math.max(4000, text.length * 110)); // safety net if the browser never reports the end
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  // ---------- Listening ----------
  function startRecognition() {
    if (!Recognition || !activeRef.current || speakingRef.current || recognitionRef.current) return;
    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = languageRef.current;

    recognition.onstart = () => setStatus('listening');
    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          const text = event.results[i][0].transcript.trim();
          if (text) api.current.handle(text);
        }
      }
    };
    recognition.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        activeRef.current = false;
        setStatus('blocked');
        setMessage('The microphone is blocked. Allow it in your browser settings, then press Start voice.');
      } else if (event.error === 'language-not-supported') {
        languageRef.current = 'en-US';
        setMessage('This browser cannot recognise Sesotho. Using English instead.');
      }
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      if (activeRef.current && !speakingRef.current) setTimeout(startRecognition, 300);
    };
    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch {
      recognitionRef.current = null;
    }
  }

  function pause() {
    activeRef.current = false;
    window.speechSynthesis?.cancel();
    try { recognitionRef.current?.abort(); } catch { /* already stopped */ }
    setStatus('paused');
    setMessage('Voice paused. Press Start voice to continue.');
  }

  function resume() {
    activeRef.current = true;
    setStatus('starting');
    startRecognition();
    speak('Voice is on.');
  }

  // ---------- Reading feedback after an action ----------
  // If the action produced an error message, say it out loud.
  function announceProblems() {
    setTimeout(() => {
      const alert = document.querySelector('.dialog .err, [role="alert"].err');
      if (alert) speak(alert.textContent.trim());
    }, 350);
  }

  // ---------- Operating one control ----------
  function performControl(control, mode = '') {
    const { element, kind, rawLabel } = control;

    if (kind === 'button') {
      element.click();
      speak(`${rawLabel}.`);
      announceProblems();
    } else if (kind === 'checkbox') {
      const wanted = mode === 'on' ? true : mode === 'off' ? false : !element.checked;
      if (element.checked !== wanted) element.click();
      setTimeout(() => speak(`${rawLabel} is now ${element.checked ? 'ticked' : 'not ticked'}.`), 150);
    } else if (kind === 'select') {
      element.focus();
      dictationRef.current = element;
      speak(`${rawLabel}. Say one of: ${optionNames(element).join(', ')}.`);
    } else if (kind === 'text') {
      element.focus();
      dictationRef.current = element;
      speak(element.type === 'date' ? `${rawLabel}. Say the date, for example 12 December 1999.` : `${rawLabel}. Say the value.`);
    } else if (kind === 'password') {
      element.focus();
      speak('For safety, passwords cannot be spoken. Please type it.');
    } else if (kind === 'file') {
      speak('Choosing a file cannot be done by voice in a browser. Use the sample document button if there is one, or ask someone to help.');
    }
  }

  // Types a spoken value into a field. Returns { ok, text } where text is what to say next.
  function fillControl(element, spoken) {
    const label = normalize(
      element.id ? document.querySelector(`label[for="${CSS.escape(element.id)}"]`)?.textContent : ''
    );

    if (element.tagName === 'SELECT') {
      const chosen = selectOptionByText(element, spoken);
      return chosen
        ? { ok: true, text: `${label} set to ${chosen}.` }
        : { ok: false, text: `I did not find that option. Say one of: ${optionNames(element).join(', ')}.` };
    }
    if (element.type === 'date') {
      const date = spokenDate(spoken);
      if (!date) return { ok: false, text: 'I did not understand the date. Say it like 12 December 1999.' };
      setControlValue(element, date);
      return { ok: true, text: `${label} set to ${spoken}.` };
    }

    let value;
    if (element.type === 'email') value = spokenEmail(spoken);
    else if (element.type === 'tel' || label.includes('national id') || /^[\d\s]+$/.test(spoken.trim())) value = spokenDigits(spoken);
    else if (element.tagName === 'TEXTAREA') value = spoken.trim();
    else value = titleCase(spoken.trim());

    if (!value) return { ok: false, text: 'I did not catch that. Please say it again.' };
    setControlValue(element, value);
    const readBack = /^\d+$/.test(value) ? value.split('').join(' ') : value; // digits are read one by one
    return { ok: true, text: `${label} set to ${readBack}.` };
  }

  function focusNextField(direction) {
    const fields = fillableControls();
    const current = dictationRef.current || document.activeElement;
    const index = fields.findIndex((f) => f.element === current);
    const next = fields[index === -1 ? 0 : index + direction];
    if (!next) {
      dictationRef.current = null;
      speak('That was the last field. Say review, or the name of the button you want.');
      return;
    }
    performControl(next);
  }

  // ---------- What was said while filling a field ----------
  function handleDictation(spoken, text) {
    const element = dictationRef.current;
    if (!document.contains(element)) { dictationRef.current = null; return false; }

    if (/^(cancel|stop|stop dictation)$/.test(text)) { dictationRef.current = null; speak('Okay.'); return true; }
    if (/^(next|next field|skip)$/.test(text)) { focusNextField(1); return true; }
    if (/^(previous field|previous)$/.test(text)) { focusNextField(-1); return true; }
    if (/^(clear|clear field)$/.test(text)) { setControlValue(element, ''); speak('Cleared. Say the new value.'); return true; }

    const result = fillControl(element, spoken);
    if (result.ok) dictationRef.current = null;
    speak(result.ok ? `${result.text} Say next field, or name another field.` : result.text);
    return true;
  }

  // ---------- Built-in commands ----------
  function handleGlobalCommand(text, spoken) {
    if (/^(stop listening|pause voice|pause|mute|stop voice)$/.test(text)) { pause(); return true; }
    if (/^(go back|back|previous page)$/.test(text)) { navigate(-1); speak('Going back.'); return true; }
    if (/^scroll down$/.test(text)) { window.scrollBy({ top: window.innerHeight * 0.8, behavior: 'smooth' }); return true; }
    if (/^scroll up$/.test(text)) { window.scrollBy({ top: -window.innerHeight * 0.8, behavior: 'smooth' }); return true; }
    if (/^(read (this )?(page|screen)|read aloud|read it)$/.test(text)) { speak(pageText()); return true; }
    if (/^(next|next field|skip)$/.test(text)) { focusNextField(1); return true; }

    if (/^(what can i say|help me|list commands|list options|options|commands)$/.test(text)) {
      const names = [...new Set(collectControls().filter((c) => c.kind !== 'file').map((c) => c.rawLabel))].slice(0, 8);
      speak(`You can say: ${names.join(', ')}. Or say read this page, go back, scroll down, or stop listening.`);
      return true;
    }

    // "search for Thabo": fills the search box and presses Search.
    const search = text.match(/^search for (.+)$/);
    if (search) {
      const box = document.querySelector('form[role="search"] input');
      if (!box) { speak('There is no search box on this page.'); return true; }
      setControlValue(box, /^[\d\s]+$/.test(search[1]) ? spokenDigits(search[1]) : titleCase(search[1]));
      document.querySelector('form[role="search"] button')?.click();
      speak(`Searching for ${search[1]}.`);
      return true;
    }

    // "enter Thabo in first name"
    const enter = spoken.match(/^(?:type|enter|write|put|fill|set)\s+(.+?)\s+(?:in|into|to|on)\s+(.+)$/i);
    if (enter) {
      const field = findControls(enter[2], fillableControls())[0];
      if (!field) { speak(`I could not find a field called ${enter[2]}.`); return true; }
      const result = fillControl(field.element, enter[1]);
      speak(result.text);
      return true;
    }

    // "select Female": pick an option from any drop-down on the page.
    const choose = text.match(/^(?:select|choose|pick) (.+)$/);
    if (choose) {
      for (const field of fillableControls().filter((c) => c.kind === 'select')) {
        const chosen = selectOptionByText(field.element, choose[1]);
        if (chosen) { speak(`${field.rawLabel} set to ${chosen}.`); return true; }
      }
    }
    return false;
  }

  // ---------- Matching a spoken name to a control (the "mouse click") ----------
  function operateByName(text) {
    let phrase = text;
    let mode = '';
    const tick = phrase.match(/^(tick|check|untick|uncheck|turn on|turn off) (.+)$/);
    if (tick) { mode = /^(tick|check|turn on)$/.test(tick[1]) ? 'on' : 'off'; phrase = tick[2]; }
    phrase = phrase.replace(/^((click|press|tap|open|go to|goto|choose|select|activate|show|take me to|navigate to|the) )+/, '');

    const matches = findControls(phrase, collectControls());
    if (matches.length === 0) {
      speak(`I could not find "${phrase}" on this page. Say what can I say to hear the options.`);
    } else if (matches.length === 1) {
      performControl(matches[0], mode);
    } else {
      const options = matches.slice(0, 5);
      choicesRef.current = options;
      speak(`I found ${options.length}. ${options.map((c, i) => `${i + 1}: ${c.description}`).join('. ')}. Say the number.`);
    }
  }

  // ---------- Every spoken sentence arrives here ----------
  function handle(spoken) {
    setHeard(spoken);

    // The login screen can ask for the very next thing the user says.
    if (captureRef.current) {
      const result = captureRef.current(spoken);
      if (result !== 'again') captureRef.current = null;
      return;
    }

    const text = normalize(translateSesotho(spoken));

    if (choicesRef.current) {
      const options = choicesRef.current;
      choicesRef.current = null;
      if (/^(cancel|never mind|stop)$/.test(text)) { speak('Cancelled.'); return; }
      const number = NUMBER_WORDS[text] ?? Number(text.replace(/^number /, ''));
      if (number && options[number - 1]) { performControl(options[number - 1]); return; }
      // Anything else is treated as a new command.
    }

    if (dictationRef.current && handleDictation(spoken, text)) return;

    // Confirmation windows: "confirm" / "cancel", like clicking their buttons.
    const dialog = document.querySelector('.dialog');
    if (dialog && /^(confirm|yes|ok|okay|proceed|save|submit|continue)$/.test(text)) {
      dialog.querySelector('.row .btn:not(.ghost)')?.click();
      speak('Confirmed.');
      announceProblems();
      return;
    }
    if (dialog && /^(cancel|no|close)$/.test(text)) {
      dialog.querySelector('.row .btn.ghost')?.click();
      speak('Cancelled.');
      return;
    }

    if (handleGlobalCommand(text, spoken)) return;
    operateByName(text);
  }

  // Keep the latest versions of the functions available to the long-lived callbacks.
  api.current = { handle, speak };

  // ---------- Start-up ----------
  useEffect(() => {
    if (!Recognition) {
      setMessage('Voice navigation needs Chrome or Edge. You can still use the mouse and keyboard.');
      return undefined;
    }
    activeRef.current = true;
    startRecognition();

    // Browsers only allow speech after the user does something once.
    const firstGesture = () => {
      if (!spokeOnceRef.current && activeRef.current) {
        speak(lastSpokenRef.current || 'Voice navigation is on. Say what you want to do, or say what can I say.');
      }
      startRecognition();
      window.removeEventListener('pointerdown', firstGesture);
      window.removeEventListener('keydown', firstGesture);
    };
    window.addEventListener('pointerdown', firstGesture);
    window.addEventListener('keydown', firstGesture);
    return () => {
      activeRef.current = false;
      window.removeEventListener('pointerdown', firstGesture);
      window.removeEventListener('keydown', firstGesture);
      try { recognitionRef.current?.abort(); } catch { /* already stopped */ }
    };
  }, []);

  // Sesotho recognition when the Sesotho language is chosen.
  useEffect(() => {
    languageRef.current = language === 'st' ? 'st-ZA' : 'en-US';
    try { recognitionRef.current?.abort(); } catch { /* already stopped */ }
  }, [language]);

  // Announce each new page, so a person who cannot see the screen knows where they are.
  useEffect(() => {
    if (location.pathname === '/login' || !activeRef.current) return undefined;
    dictationRef.current = null;
    choicesRef.current = null;
    const timer = setTimeout(() => {
      const hint = helpedRef.current ? '' : ' Say what can I say, for help.';
      helpedRef.current = true;
      speak(`${pageTitle()}.${hint}`);
    }, 700);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  // Small, stable API for screens (the login page uses it).
  const stableApi = useMemo(() => ({
    speak: (text) => api.current.speak(text),
    awaitSpeech: (callback) => { captureRef.current = callback; },
    cancelAwait: () => { captureRef.current = null; },
  }), []);

  const isOn = status === 'listening' || status === 'speaking' || status === 'starting';

  return (
    <VoiceContext.Provider value={stableApi}>
      {children}
      <div className="voice-dock" role="region" aria-label="Voice navigation">
        <span className={`voice-dot voice-${status}`} aria-hidden="true" />
        <strong>Voice: {STATUS_TEXT[status]}</strong>
        <span className="voice-message" role="status">{message}</span>
        {heard && <small>Heard: "{heard}"</small>}
        {Recognition && (
          <button className="btn ghost sm" onClick={isOn ? pause : resume}>
            {isOn ? <FaMicrophoneSlash aria-hidden="true" /> : <FaMicrophone aria-hidden="true" />}
            {isOn ? ' Stop voice' : ' Start voice'}
          </button>
        )}
      </div>
    </VoiceContext.Provider>
  );
}
