export interface DropdownItem<T = string | number> {
  label: string;
  value: T;
}

export type Account = {
  privkey: string;
};

export interface NostrProfile {
  name?: string;
  display_name?: string;
  about?: string;
  picture?: string;
  banner?: string;
  website?: string;
  nip05?: string;
  lud16?: string;
}

export interface NostrRelay {
  url: string;
  read: boolean;
  write: boolean;
}

export type StoredKey = {
  id: string;
  alias: string;
  account: Account;
  createdAt: string;
};
