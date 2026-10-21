import '@testing-library/jest-dom/vitest';
import { beforeEach } from 'vitest';

// The opening animation plays once per session; unit tests render the app as a returning visitor.
beforeEach(() => {
  if (typeof window !== 'undefined') window.sessionStorage.setItem('signal-ai:intro-seen:v1', '1');
});
