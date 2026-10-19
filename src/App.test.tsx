import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('./lib/data', async (orig) => {
  const mod = await orig<typeof import('./lib/data')>();
  return { ...mod, createDataSource: () => mod.createDataSource('mock', new Date()) };
});

import { App } from './App';
import { I18nProvider } from './lib/i18n';

describe('App (phase 1 skeleton)', () => {
  it('renders mock fixtures for today and yesterday with a mock banner', async () => {
    render(
      <I18nProvider initial="en">
        <App />
      </I18nProvider>,
    );
    expect(await screen.findByText('Today')).toBeInTheDocument();
    expect(screen.getByText('Yesterday')).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent('MOCK DATA');
    expect((await screen.findAllByText(/\[MOCK\]/)).length).toBeGreaterThan(0);
  });
});
