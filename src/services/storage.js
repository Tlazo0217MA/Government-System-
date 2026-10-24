// Central data store. Initial data comes from the JSON files; changes are saved
// to localStorage so they survive page refreshes. localStorage is NOT a secure
// database: it is only prototype persistence.
import { useState, useEffect } from 'react';
import users from '../data/users.json';
import citizens from '../data/citizens.json';
import applications from '../data/applications.json';
import services from '../data/services.json';
import notifications from '../data/notifications.json';
import auditLogs from '../data/auditLogs.json';
import accessRequests from '../data/accessRequests.json';
import civilRecords from '../data/civilRecords.json';
import records from '../data/records.json';
import pensionRegister from '../data/pensionRegister.json';
import departments from '../data/departments.json';

const STORAGE_KEY = 'igss-v4';
const listeners = new Set();
let data = null;

function freshCopyOfSeed() {
  return JSON.parse(JSON.stringify({
    users, citizens, applications, services, notifications, audit: auditLogs, departments, accessRequests, civilRecords, records, pensionRegister,
  }));
}

// Returns the data object, loading it from localStorage the first time.
// Missing or damaged saved data falls back to the original JSON data.
export function db() {
  if (data) return data;
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved || !saved.users || !saved.citizens || !saved.applications || !saved.accessRequests || !saved.civilRecords || !saved.records || !saved.pensionRegister) throw new Error('bad data');
    data = saved;
  } catch {
    data = freshCopyOfSeed();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
  return data;
}

// Saves the data and tells every screen using useDb() to re-render.
export function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db()));
  listeners.forEach((listener) => listener());
}

export function resetDemo() {
  data = freshCopyOfSeed();
  save();
}

// React hook: components call this to read data and refresh when it changes.
export function useDb() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const refresh = () => setTick((n) => n + 1);
    listeners.add(refresh);
    return () => listeners.delete(refresh);
  }, []);
  return db();
}

export function makeId(prefix) {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// Next reference such as "BRN-00007": one more than the highest existing number with that prefix.
export function nextRef(items, prefix) {
  const numbers = items
    .filter((item) => item.ref && item.ref.startsWith(prefix + '-'))
    .map((item) => Number(item.ref.split('-')[1]));
  return `${prefix}-${String(Math.max(0, ...numbers) + 1).padStart(5, '0')}`;
}
