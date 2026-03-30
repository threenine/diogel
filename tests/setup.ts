import { installCryptoMock } from './unit/mocks/crypto';
import { afterEach } from 'vitest';

// Install mocks before all tests
installCryptoMock();

// Clean up after each test
afterEach(() => {
  // Clear any test state
});
