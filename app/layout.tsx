import './globals.css'

export const metadata = {
  title: '韓国旅行プランナー',
  description: '6人グループ用旅行管理アプリ',
}

// 画面いっぱいに表示し、黒い縁（セーフエリアの余白）を防ぐ設定
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
    <html lang="ja" className="h-full">
      <body className="bg-gray-50 text-gray-900 min-h-full">
        <main className="max-w-4xl mx-auto py-6 px-4">
          {children}
        </main>
      </body>
    </html>
  )
}