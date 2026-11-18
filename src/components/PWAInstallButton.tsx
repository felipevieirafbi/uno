import React, { useState } from 'react';
import { Download, Smartphone, Share, PlusSquare, MoreVertical, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  compact?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [guideTab, setGuideTab] = useState<'iphone' | 'android'>(isIOS ? 'iphone' : 'android');

  if (isInstalled) {
    return null;
  }

  const handleTrigger = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (accepted) return;
    }
    setGuideTab(isIOS ? 'iphone' : 'android');
    setShowGuideModal(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleTrigger}
        className={
          compact
            ? 'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-emerald-400/35 bg-[#0E4A2E] px-3.5 py-2 text-xs font-semibold text-emerald-50 transition hover:bg-[#135E3B] whitespace-nowrap shrink-0'
            : 'inline-flex min-h-[48px] items-center justify-center gap-2.5 rounded-2xl border border-amber-300/40 bg-[#124B30] px-4 py-2.5 text-sm font-semibold text-[#FFFDF9] shadow-md transition hover:bg-[#175C3B] whitespace-nowrap shrink-0'
        }
      >
        {isInstallable ? (
          <Download className="h-4 w-4 text-amber-300" />
        ) : (
          <Smartphone className="h-4 w-4 text-amber-300" />
        )}
        <span>{compact ? 'Instalar App' : 'Instalar no Android / iPhone'}</span>
      </button>

      {showGuideModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Como instalar no celular"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
        >
          <div className="w-full max-w-md rounded-3xl border border-amber-400/30 bg-[#0B3B24] p-6 text-[#FFFDF9] shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-display text-xl font-bold text-amber-300">
                  Instale o UnoZueira no Celular
                </h3>
                <p className="mt-1 text-xs text-emerald-100/80">
                  Abre em tela cheia igual aplicativo nativo, sem precisar de loja.
                </p>
              </div>
              <button
                type="button"
                aria-label="Fechar instruções de instalação"
                onClick={() => setShowGuideModal(false)}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-black/25 text-emerald-100 hover:bg-black/40"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Interactive Segmented Platform Tabs */}
            <div className="mt-4 grid grid-cols-2 gap-1 rounded-xl bg-[#072818] p-1">
              <button
                type="button"
                onClick={() => setGuideTab('android')}
                className={`min-h-[44px] rounded-lg px-3 py-2 text-xs font-semibold transition whitespace-nowrap ${
                  guideTab === 'android'
                    ? 'bg-amber-400 text-zinc-950 shadow-sm'
                    : 'text-emerald-100/80 hover:text-white'
                }`}
              >
                Android (Chrome)
              </button>
              <button
                type="button"
                onClick={() => setGuideTab('iphone')}
                className={`min-h-[44px] rounded-lg px-3 py-2 text-xs font-semibold transition whitespace-nowrap ${
                  guideTab === 'iphone'
                    ? 'bg-amber-400 text-zinc-950 shadow-sm'
                    : 'text-emerald-100/80 hover:text-white'
                }`}
              >
                iPhone / iPad (Safari)
              </button>
            </div>

            {guideTab === 'iphone' ? (
              <ol className="mt-5 space-y-3 text-sm text-emerald-50">
                <li className="flex items-center gap-3 rounded-2xl bg-[#072818] p-3.5">
                  <Share className="h-5 w-5 shrink-0 text-amber-300" />
                  <span>
                    1. No <strong>Safari</strong>, toque no ícone <strong>Compartilhar</strong> na barra inferior.
                  </span>
                </li>
                <li className="flex items-center gap-3 rounded-2xl bg-[#072818] p-3.5">
                  <PlusSquare className="h-5 w-5 shrink-0 text-amber-300" />
                  <span>
                    2. Role para baixo e toque em <strong>Adicionar à Tela de Início</strong>.
                  </span>
                </li>
              </ol>
            ) : (
              <ol className="mt-5 space-y-3 text-sm text-emerald-50">
                <li className="flex items-center gap-3 rounded-2xl bg-[#072818] p-3.5">
                  <MoreVertical className="h-5 w-5 shrink-0 text-amber-300" />
                  <span>
                    1. No <strong>Chrome</strong>, toque no menu de <strong>3 pontinhos</strong> no canto superior direito.
                  </span>
                </li>
                <li className="flex items-center gap-3 rounded-2xl bg-[#072818] p-3.5">
                  <Download className="h-5 w-5 shrink-0 text-amber-300" />
                  <span>
                    2. Toque em <strong>Instalar aplicativo</strong> ou <strong>Adicionar à tela inicial</strong>.
                  </span>
                </li>
              </ol>
            )}

            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="mt-5 min-h-[48px] w-full rounded-2xl bg-amber-400 px-4 py-3 text-sm font-bold text-zinc-950 transition hover:bg-amber-300"
            >
              Entendi, voltar pro jogo
            </button>
          </div>
        </div>
      )}
    </>
  );
};
