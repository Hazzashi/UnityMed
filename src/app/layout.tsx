import type { Metadata } from 'next'
import { Quicksand } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import './globals.css'

// Quicksand — Google Fonts, SIL OFL license (free for commercial use)
// Geometric rounded sans-serif, clean and modern at all weights
const quicksand = Quicksand({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-quicksand',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'UnityMed — Plataforma de Produtividade Acadêmica',
  description: 'Centralize todas as ferramentas do seu estudo: timer Pomodoro, planejamento, agenda, cadernos e glossário.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${quicksand.variable} font-sans`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange={false}
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
