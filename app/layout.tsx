import './globals.css'

export const metadata = {
  title: '韓国旅行プランナー',
  description: '6人グループ用旅行管理アプリ',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className="bg-gray-50 text-gray-900 min-h-screen">
        {/* 各ページのコンテンツ表示エリア */}
        <main className="max-w-4xl mx-auto py-6 px-4">
          {children}
        </main>
      </body>
    </html>
  )
}