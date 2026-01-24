export interface DropdownItem<T = string | number> {
  label: string;
  value: T;
}

export type Account = {
  privkey: string;
};

export type StoredKey = {
  id: string;
  alias: string;
  account: Account;
  createdAt: string;
};
