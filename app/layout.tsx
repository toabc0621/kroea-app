import './globals.css'
import Link from 'next/link'

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
        {/* 上部のメニューバー */}
        <header className="bg-white border-b shadow-sm sticky top-0 z-50">
          <nav className="max-w-4xl mx-auto px-4 py-3 flex gap-6 text-sm font-medium">
            <Link href="/" className="hover:text-blue-600">旅程タイムライン</Link>
            <Link href="/todos" className="hover:text-blue-600">TODOリスト</Link>
            <Link href="/expenses" className="hover:text-blue-600">費用・立替</Link>
            <Link href="/map" className="hover:text-blue-600">NAVER Map</Link>
          </nav>
        </header>

        {/* 各ページのコンテンツ表示エリア */}
        <main className="max-w-4xl mx-auto py-6 px-4">
          {children}
        </main>
      </body>
    </html>
  )
}