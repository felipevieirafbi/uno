import React from 'react';
import {
  cardLabelPt,
  colorLabelPt,
  type ActiveColor,
  type CardColor,
  type UnoCard,
} from '../game/unoRules';
import type { CardBackSpec } from '../game/themes';

const SUIT_STYLES: Record<
  CardColor,
  { bg: string; darkBg: string; text: string; ring: string; symbol: string }
> = {
  red: {
    bg: 'bg-[#E11D48]',
    darkBg: 'bg-[#9F1239]',
    text: 'text-[#E11D48]',
    ring: 'ring-rose-300',
    symbol: '●',
  },
  blue: {
    bg: 'bg-[#0284C7]',
    darkBg: 'bg-[#1E3A8A]',
    text: 'text-[#0284C7]',
    ring: 'ring-sky-300',
    symbol: '◆',
  },
  yellow: {
    bg: 'bg-[#EAB308]',
    darkBg: 'bg-[#C2410C]',
    text: 'text-[#A16207]',
    ring: 'ring-amber-200',
    symbol: '▲',
  },
  green: {
    bg: 'bg-[#16A34A]',
    darkBg: 'bg-[#0F766E]',
    text: 'text-[#15803D]',
    ring: 'ring-emerald-300',
    symbol: '■',
  },
  wild: {
    bg: 'bg-[#18181B]',
    darkBg: 'bg-[#09090B]',
    text: 'text-[#18181B]',
    ring: 'ring-amber-400',
    symbol: '★',
  },
};

function renderCenterGlyph(card: UnoCard, darkSide = false) {
  if (card.value === 'skip') {
    if (darkSide) {
      return (
        <div className="flex flex-col items-center leading-none text-rose-700">
          <svg className="h-6 w-6 sm:h-7 sm:w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8">
            <circle cx="12" cy="12" r="8" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
          <span className="mt-0.5 font-mono-num text-[8px] font-bold">TODOS</span>
        </div>
      );
    }
    return (
      <svg className="h-7 w-7 sm:h-9 sm:w-9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8">
        <circle cx="12" cy="12" r="8.5" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    );
  }
  if (card.value === 'reverse') {
    return (
      <svg className="h-7 w-7 sm:h-9 sm:w-9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 3l4 4-4 4" />
        <path d="M3 11V9a2 2 0 012-2h16" />
        <path d="M7 21l-4-4 4-4" />
        <path d="M21 13v2a2 2 0 01-2 2H3" />
      </svg>
    );
  }
  if (card.value === 'draw2') {
    return (
      <span
        className={`font-display text-2xl sm:text-3xl font-bold tracking-tight ${
          darkSide ? 'text-rose-700' : ''
        }`}
      >
        {darkSide ? '+5' : '+2'}
      </span>
    );
  }
  if (card.value === 'flip') {
    return (
      <svg
        className="h-7 w-7 sm:h-9 sm:w-9 text-purple-900"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 3a9 9 0 1 0 9 9" />
        <path d="M12 3v18" />
        <path d="M16 4l4 1-1 4" />
      </svg>
    );
  }
  if (card.value === 'shield') {
    return (
      <svg
        className="h-7 w-7 sm:h-9 sm:w-9 text-cyan-700"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 3l7 3v6c0 4.5-3 7.8-7 9-4-1.2-7-4.5-7-9V6l7-3z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    );
  }
  if (card.value === 'xray') {
    return (
      <svg
        className="h-7 w-7 sm:h-9 sm:w-9 text-violet-700"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M2 12s3.8-6 10-6 10 6 10 6-3.8 6-10 6-10-6-10-6z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }
  if (card.value === 'wild') {
    return (
      <div className="grid h-8 w-8 sm:h-10 sm:w-10 grid-cols-2 overflow-hidden rounded-full border-2 border-zinc-900 shadow-inner">
        <span className="bg-[#E11D48]" />
        <span className="bg-[#0284C7]" />
        <span className="bg-[#EAB308]" />
        <span className="bg-[#16A34A]" />
      </div>
    );
  }
  if (card.value === 'wild4') {
    return (
      <div className="flex flex-col items-center leading-none">
        <span className="font-display text-xl sm:text-2xl font-bold text-zinc-900">+4</span>
        <div className="mt-0.5 flex gap-0.5">
          <span className="h-2 w-2 rounded-xs bg-[#E11D48]" />
          <span className="h-2 w-2 rounded-xs bg-[#0284C7]" />
          <span className="h-2 w-2 rounded-xs bg-[#EAB308]" />
          <span className="h-2 w-2 rounded-xs bg-[#16A34A]" />
        </div>
      </div>
    );
  }

  return (
    <span
      className={`font-display text-3xl sm:text-4xl font-bold leading-none ${
        card.value === '6' || card.value === '9' ? 'underline decoration-2 underline-offset-4' : ''
      }`}
    >
      {card.value}
    </span>
  );
}

function cornerSymbol(card: UnoCard, darkSide = false): string {
  switch (card.value) {
    case 'skip':
      return darkSide ? '⊘!' : '⊘';
    case 'reverse':
      return '⇄';
    case 'draw2':
      return darkSide ? '+5' : '+2';
    case 'flip':
      return '◐';
    case 'shield':
      return '🛡';
    case 'xray':
      return '👁';
    case 'wild':
      return '★';
    case 'wild4':
      return '+4';
    default:
      return card.value;
  }
}

interface UnoCardViewProps {
  card?: UnoCard;
  faceDown?: boolean;
  playable?: boolean;
  jumpInPlayable?: boolean;
  darkSide?: boolean;
  cardBack?: CardBackSpec;
  dimmed?: boolean;
  size?: 'sm' | 'md' | 'table' | 'lg';
  activeWildTint?: ActiveColor;
  onClick?: () => void;
  shortcutLabel?: string;
}

export const UnoCardView: React.FC<UnoCardViewProps> = ({
  card,
  faceDown = false,
  playable = false,
  jumpInPlayable = false,
  darkSide = false,
  cardBack,
  dimmed = false,
  size = 'md',
  activeWildTint,
  onClick,
  shortcutLabel,
}) => {
  const sizeClasses =
    size === 'sm'
      ? 'w-11 h-16 rounded-xl p-1'
      : size === 'table'
        ? 'w-[72px] h-[106px] sm:w-28 sm:h-40 rounded-2xl p-1.5'
        : size === 'lg'
          ? 'w-24 h-36 sm:w-28 sm:h-40 rounded-2xl p-1.5'
          : 'w-[68px] h-[102px] sm:w-20 sm:h-28 rounded-2xl p-1.5';

  if (faceDown || !card) {
    const Wrapper = onClick ? 'button' : 'div';
    const outerBg = cardBack?.outerBgClass || 'bg-[#18181B] border-amber-400/30';
    const ovalBg = cardBack?.ovalBgClass || 'bg-[#E11D48]';
    const labelCls = cardBack?.labelClass || 'text-amber-300';
    return (
      <Wrapper
        {...(onClick
          ? {
              type: 'button' as const,
              onClick,
              'aria-label': 'Comprar carta do monte',
            }
          : {})}
        className={`${sizeClasses} relative flex shrink-0 items-center justify-center bg-[#FFFDF9] shadow-lg transition-transform duration-150 ${
          onClick
            ? 'cursor-pointer hover:-translate-y-1.5 active:scale-95 focus-visible:ring-2 focus-visible:ring-amber-400'
            : ''
        }`}
      >
        <div className={`flex h-full w-full items-center justify-center rounded-xl border ${outerBg}`}>
          <div
            className={`flex h-4/5 w-4/5 -rotate-12 items-center justify-center rounded-full ${ovalBg} px-1 shadow-inner`}
          >
            <span className={`font-display text-xs sm:text-sm font-bold tracking-tight ${labelCls}`}>
              UZ!
            </span>
          </div>
        </div>
      </Wrapper>
    );
  }

  const style = SUIT_STYLES[card.color];
  const corner = cornerSymbol(card, darkSide);
  const colorName =
    card.color === 'wild'
      ? activeWildTint
        ? `Coringa (${colorLabelPt(activeWildTint)})`
        : 'Coringa'
      : colorLabelPt(card.color);
  const accessibleName = jumpInPlayable
    ? `Cortar na frente com ${cardLabelPt(card, darkSide)} ${colorName}`
    : `Jogar carta ${cardLabelPt(card, darkSide)} ${colorName}`;

  const cardSurfaceBg =
    card.value === 'shield'
      ? 'bg-[#0E7490]'
      : card.value === 'xray'
        ? 'bg-[#5B21B6]'
        : darkSide
          ? style.darkBg
          : style.bg;

  const innerContent = (
    <div
      className={`relative flex h-full w-full flex-col justify-between overflow-hidden rounded-xl ${cardSurfaceBg} px-1.5 py-1 text-[#FFFDF9]`}
    >
      {/* Top-left corner rank + accessible suit glyph */}
      <div className="flex items-center justify-between text-[11px] sm:text-xs font-bold leading-none">
        <span>{corner}</span>
        <span className="text-[9px] opacity-85" aria-hidden="true">
          {style.symbol}
        </span>
      </div>

      {/* Central tilted ivory oval */}
      <div
        className={`mx-auto my-auto flex h-12 w-10 sm:h-14 sm:w-12 rotate-12 items-center justify-center rounded-full bg-[#FFFDF9] shadow-sm ${style.text}`}
      >
        <div className="-rotate-12">{renderCenterGlyph(card, darkSide)}</div>
      </div>

      {/* Bottom-right inverted corner */}
      <div className="flex items-center justify-between text-[11px] sm:text-xs font-bold leading-none rotate-180">
        <span>{corner}</span>
        {shortcutLabel ? (
          <span className="rotate-180 font-mono-num text-[9px] text-white/80">
            [{shortcutLabel}]
          </span>
        ) : (
          <span className="text-[9px] opacity-85" aria-hidden="true">
            {style.symbol}
          </span>
        )}
      </div>
    </div>
  );

  const canClickNow = playable || jumpInPlayable;

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={!canClickNow}
        aria-label={accessibleName}
        className={`${sizeClasses} relative shrink-0 bg-[#FFFDF9] shadow-xl transition-transform duration-150 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-amber-300 ${
          jumpInPlayable
            ? '-translate-y-3 sm:-translate-y-4 cursor-pointer ring-3 ring-amber-300 hover:-translate-y-5 active:scale-95'
            : playable
              ? `-translate-y-2 sm:-translate-y-3 cursor-pointer ring-2 ${style.ring} hover:-translate-y-4 active:scale-95`
              : dimmed
                ? 'cursor-not-allowed opacity-55 translate-y-1'
                : 'cursor-default'
        }`}
      >
        {jumpInPlayable && (
          <span className="pointer-events-none absolute -top-2.5 left-1/2 z-20 -translate-x-1/2 rounded-md bg-amber-400 px-1.5 py-0.5 font-mono-num text-[9px] font-bold text-zinc-950 shadow-md whitespace-nowrap">
            CORTAR!
          </span>
        )}
        {innerContent}
      </button>
    );
  }

  return (
    <div className={`${sizeClasses} relative shrink-0 bg-[#FFFDF9] shadow-xl`}>
      {innerContent}
    </div>
  );
};
