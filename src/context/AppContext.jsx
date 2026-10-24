import { createContext, useContext } from 'react';

// Holds the logged-in user, language and accessibility adaptations.
export const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

// Sesotho labels. These are DRAFT translations and need review by a fluent speaker.
export const SESOTHO = {
  Dashboard: 'Letlapa',
  'My Profile': 'Phrofaele ea ka',
  Services: 'Litšebeletso',
  'My Applications': 'Likopo tsa ka',
  Notifications: 'Litsebiso',
  Help: 'Thuso',
  'Log out': 'Tsoa',
  'Citizen Management': 'Taolo ea Baahi',
  'Add Citizen': 'Kenya Moahi',
  Applications: 'Likopo',
  'Activity Log': 'Pokello ea Liketso',
  'Citizen Search': 'Batla Moahi',
  Back: 'Morao',
};
