export interface DropdownItem<T = string | number> {
  label: string;
  value: T;
}

declare global {
  interface Window {
    chrome?: {
      runtime?: {
        openOptionsPage?: () => void;
        getURL?: (path: string) => string;
      };
    };
  }
}
