export interface DropdownItem<T = string | number> {
  label: string;
  value: T;
}

export type StoredKeys = {
  alias: string;
  pubkey: string;
  privKey: string; // nsec...
  savedAt: string;
};
