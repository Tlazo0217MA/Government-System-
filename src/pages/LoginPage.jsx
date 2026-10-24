import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaLock, FaMicrophone } from 'react-icons/fa';
import Field from '../components/Field.jsx';
import { useApp } from '../context/AppContext.jsx';
import { useVoice } from '../voice/VoiceProvider.jsx';
import { login, loginWithVoice, getLoginMode, findUserByUsername } from '../services/authService.js';

// Login has three steps:
//   username -> (password | voice)
// People whose recorded needs include visual, hands or mobility are taken to the
// voice step. The screen never says why, so it does not announce a disability.
export default function LoginPage() {
  const { signIn } = useApp();
  const navigate = useNavigate();
  const voice = useVoice();

  const [step, setStep] = useState('username');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  function finish(user) {
    signIn(user);
    navigate('/');
  }

  function continueWith(name) {
    setError('');
    setStep(getLoginMode(name) === 'voice' ? 'voice' : 'password');
  }

  // Each step can also be completed by speaking.
  useEffect(() => {
    if (step === 'username') {
      voice.speak('Welcome. Please say your ID number or username. You can also type it.');
      voice.awaitSpeech((heard) => {
        const spoken = heard.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!findUserByUsername(spoken)) {
          voice.speak('I could not find that account. Please say your ID number again.');
          return 'again'; // keep listening for another try
        }
        setUsername(spoken);
        continueWith(spoken);
        return undefined;
      });
    }

    if (step === 'voice') {
      voice.speak('Hello. Please say a short phrase as your voice password.');
      voice.awaitSpeech((heard) => {
        // Prototype: any spoken phrase is accepted. Not real voice authentication.
        const result = loginWithVoice(username, heard);
        if (result.error) {
          voice.speak(result.error);
          setError(result.error);
          setStep('username');
          return undefined;
        }
        voice.speak('Thank you. Logging you in.');
        finish(result.user);
        return undefined;
      });
    }
    return () => voice.cancelAwait();
  }, [step]);

  function handleUsername(event) {
    event.preventDefault();
    if (!username.trim()) {
      setError('Enter your username or National ID.');
      return;
    }
    continueWith(username);
  }

  function handlePassword(event) {
    event.preventDefault();
    const result = login(username, password);
    if (result.error) {
      setError(result.error);
      return;
    }
    finish(result.user);
  }

  return (
    <main className="login">
      <h1>Integrated Government Services</h1>
      <p>Lesotho citizen services prototype. Fictional demo data only.</p>

      {step === 'username' && (
        <form onSubmit={handleUsername} className="card">
          <Field id="username" label="Username or National ID" required error={error}>
            <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
          </Field>
          <button className="btn">Continue</button>
        </form>
      )}

      {step === 'password' && (
        <form onSubmit={handlePassword} className="card">
          <p>Logging in as <strong>{username}</strong></p>
          <Field id="password" label="Password" required error={error}>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </Field>
          <div className="row">
            <button type="button" className="btn ghost" onClick={() => { setError(''); setStep('username'); }}>Back</button>
            <button className="btn"><FaLock aria-hidden="true" /> Log in</button>
          </div>
        </form>
      )}

      {step === 'voice' && (
        <section className="card" aria-live="polite">
          <h2><FaMicrophone aria-hidden="true" /> Voice login</h2>
          <p>Say a short phrase as your voice password. The system is listening.</p>
          <div className="row">
            <button className="btn ghost" onClick={() => setStep('username')}>Use a different ID</button>
            <button className="btn ghost" onClick={() => setStep('password')}>Type my password instead</button>
          </div>
        </section>
      )}

      <p><small>
        Citizens receive their login from Home Affairs and can log in once verified. Officers receive theirs
        from the administrator. Simulated login: not secure authentication. Voice login accepts any spoken phrase.
      </small></p>
    </main>
  );
}
