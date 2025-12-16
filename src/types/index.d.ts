export interface DropdownItem<T = string | number> {
  label: string;
  value: T;
}

export type StoredKey = {
  alias: string;
  pubkey: string;
  privKey: string; // nsec...
  savedAt: string;
};
