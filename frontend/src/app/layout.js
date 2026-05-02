import './globals.css';
import Providers from './providers';

export const metadata = {
  title: 'NGI Asset Tracker',
  description: 'National Group India — IT Asset & Domain Tracker',
  applicationName: 'NGI Asset Tracker',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
