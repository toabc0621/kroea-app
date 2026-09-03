import './globals.css'

export const metadata = {
  title: '韓国旅行プランナー',
  description: '6人グループ用旅行管理アプリ',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja" className="w-full h-full">
      <body className="w-full h-full m-0 p-0 bg-gray-50 text-gray-900">
        <main className="w-full min-h-dvh">
          {children}
        </main>
      </body>
    </html>
  )
}