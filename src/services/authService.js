import { db } from './storage.js';

// Needs that make a user log in by voice instead of typing a password.
const VOICE_LOGIN_NEEDS = ['visual', 'hands', 'mobility'];

export function findUserByUsername(username) {
  const wanted = (username || '').trim().toLowerCase();
  return db().users.find((u) => u.username.toLowerCase() === wanted) || null;
}

// The accessibility needs of any user: citizens keep them on the citizen
// record, officers keep them on their own account.
export function getNeedsForUser(user) {
  if (!user) return [];
  if (user.role === 'citizen') {
    return db().citizens.find((c) => c.id === user.citizenId)?.accessibility?.needs || [];
  }
  return user.accessibility?.needs || [];
}

// 'voice' or 'password'. Unknown usernames get 'password', so the login screen
// does not reveal whether an account exists or what needs it has.
export function getLoginMode(username) {
  const user = findUserByUsername(username);
  if (!user || user.disabled) return 'password';
  return getNeedsForUser(user).some((n) => VOICE_LOGIN_NEEDS.includes(n)) ? 'voice' : 'password';
}

// Rules shared by both login methods.
function checkAccount(user) {
  if (user.disabled) return 'This account has been disabled. Contact your administrator.';
  if (user.role === 'citizen') {
    const citizen = db().citizens.find((c) => c.id === user.citizenId);
    if (citizen?.status === 'Deceased') return 'This account is closed.';
    if (!citizen || citizen.verification !== 'Verified') {
      return 'Your registration is still pending verification by Home Affairs. You can log in once it is verified.';
    }
  }
  return '';
}

export function login(username, password) {
  const user = findUserByUsername(username);
  if (!user || user.password !== password) {
    return { error: 'Username or password is incorrect. Check your details and try again.' };
  }
  const problem = checkAccount(user);
  return problem ? { error: problem } : { user };
}

// Prototype voice login: any spoken phrase is accepted. This is NOT real voice
// authentication; a real system would verify the speaker's voice.
export function loginWithVoice(username, spokenPhrase) {
  const user = findUserByUsername(username);
  if (!user || !(spokenPhrase || '').trim()) {
    return { error: 'I could not log you in. Please try again.' };
  }
  const problem = checkAccount(user);
  return problem ? { error: problem } : { user };
}

export function getUser(userId) {
  return db().users.find((u) => u.id === userId) || null;
}
