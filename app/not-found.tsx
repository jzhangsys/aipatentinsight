import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-24">
      <p className="text-sm font-medium text-neutral-500">404</p>
      <h1 className="mt-3 text-4xl font-bold">找不到這個頁面</h1>
      <p className="mt-6 max-w-2xl text-lg leading-8 text-neutral-600">
        你要找的內容可能已移動、尚未建立，或網址輸入有誤。
      </p>
      <div className="mt-8">
        <Link
          href="/"
          className="text-sm font-medium text-neutral-900 underline underline-offset-4"
        >
          返回首頁
        </Link>
      </div>
    </main>
  );
}
