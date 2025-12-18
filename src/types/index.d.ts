export interface DropdownItem<T = string | number> {
  label: string;
  value: T;
}

export type Account = {
  alias: string;
  pubkey: string;
  privKey: string;
  noub: string;
  nsec: string;
  relays: string[];
  websites: string[];
};

export type StoredKey = {
  id: string;
  alias: string;
  account: Account;
  createdAt: string;
}
