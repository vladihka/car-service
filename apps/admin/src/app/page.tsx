import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Car Service Admin Panel
        </h1>
        <p className="text-gray-600 mb-8">
          Manage your car service network
        </p>
        <Link
          href="/login"
          className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
        >
          Admin Login
        </Link>
      </div>
    </main>
  );
}
