export interface DropdownItem<T = string | number> {
  label: string;
  value: T;
}

export type Account = {
  pubkey: string;
  priKey: string;
  npub: string;
  nsec: string;
  relays: string[];
  websites: string[];
};

export type StoredKey = {
  id: string;
  alias: string;
  account: Account;
  createdAt: string;
};
