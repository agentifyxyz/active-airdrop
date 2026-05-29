export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16 sm:px-10">
        <div className="rounded-3xl border border-slate-200 bg-white p-10 shadow-xl shadow-slate-200/60 sm:p-14">
          <p className="text-sm uppercase tracking-[0.35em] text-blue-600">Active Airdrop</p>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
            Claim your $ACTIVE tokens on Base.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            Connect your wallet, verify your Base transaction history, and claim eligible $ACTIVE rewards through the Active Airdrop experience.
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <a
              href="#claim"
              className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-base font-semibold text-white transition hover:bg-blue-700"
            >
              Start claim flow
            </a>
            <a
              href="https://nextjs.org/docs"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3 text-base font-semibold text-slate-900 transition hover:bg-slate-100"
            >
              Deployment info
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
