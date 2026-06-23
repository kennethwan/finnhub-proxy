import { createGlobalStyle } from 'styled-components';

export const GlobalStyle = createGlobalStyle`
  * { box-sizing: border-box; padding: 0; margin: 0; }
  html, body { max-width: 100vw; overflow-x: hidden; }
  html { color-scheme: ${({ theme }) => theme.mode}; }
  body {
    color: ${({ theme }) => theme.colors.text};
    background: ${({ theme }) => theme.colors.bg};
    font-family: 'JetBrains Mono', ui-monospace, -apple-system, 'PingFang HK', 'Noto Sans HK', sans-serif;
    -webkit-font-smoothing: antialiased;
    transition: background 0.2s ease, color 0.2s ease;
  }
  a { color: inherit; text-decoration: none; }
  ::selection { background: ${({ theme }) => theme.colors.accentSoft}; }
`;
