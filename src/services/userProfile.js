/**
 * User Profile Service
 * Reads/writes per-user profile rows (`user_profiles.students` holds the
 * newline-separated names of the students sharing this account).
 *
 * Facade over the persistence adapter (src/services/persistence/).
 */

import { adapter } from './persistence';

export const getUserProfile = (...args) => adapter.profile.getUserProfile(...args);
export const saveUserProfile = (...args) => adapter.profile.saveUserProfile(...args);

/**
 * True when the profile is missing or has no students recorded yet.
 */
export const profileNeedsStudentGroup = (profile) => {
  if (!profile) return true;
  const s = profile.students;
  return !s || !s.trim();
};
