import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  public state: ErrorBoundaryState = {
    hasError: false,
    message: '',
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    let friendly = error.message || 'Ocorreu um erro inesperado.';
    try {
      const parsed = JSON.parse(error.message) as { error?: string; path?: string };
      if (parsed && parsed.error) {
        if (parsed.error.includes('Quota exceeded')) {
          friendly =
            'Limite diário gratuito do banco atingido. A cota será renovada amanhã, mas você ainda pode jogar localmente contra a IA!';
        } else {
          friendly = `Erro de sincronização (${parsed.path || 'mesa'}): ${parsed.error}`;
        }
      }
    } catch {
      // Plain error message
    }
    return { hasError: true, message: friendly };
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 flex items-center justify-center bg-[#072818] p-6 text-[#FFFDF9]">
          <div className="w-full max-w-md rounded-3xl border border-amber-400/30 bg-[#0B3B24] p-6 shadow-2xl">
            <h2 className="font-['Fredoka'] text-2xl font-bold text-amber-300">
              Ops, algo travou na mesa!
            </h2>
            <p className="mt-2 text-sm text-emerald-100/90">{this.state.message}</p>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, message: '' });
                window.location.reload();
              }}
              className="mt-5 min-h-[48px] w-full rounded-2xl bg-amber-400 px-5 py-3 text-sm font-bold text-zinc-950 transition hover:bg-amber-300"
            >
              Recarregar Aplicativo
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
