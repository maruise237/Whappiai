"use client"

export default function AIModelsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Modèles IA</h1>
          <p className="text-muted-foreground text-sm">
            Configurez vos providers et modèles OpenAI / DeepSeek / etc.
          </p>
        </div>
      </div>
      <div className="flex flex-col items-center gap-4 rounded-lg border border-red-200 bg-red-50 p-8 text-center">
        <div className="rounded-full bg-red-100 p-3">
          <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-red-800">
          {error.message || "Une erreur est survenue"}
        </p>
        <p className="text-xs text-red-600">
          {error.digest ? `Erreur #${error.digest}` : ""}
        </p>
        <button
          onClick={reset}
          className="mt-2 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
          </svg>
          Réessayer
        </button>
      </div>
    </div>
  )
}
