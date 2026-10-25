/** localStorage that never throws: private mode, blocked cookies or a full quota just mean "not persisted". */
export const storage = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Not persisting a preference is acceptable; crashing the lobby is not.
    }
  },
};
