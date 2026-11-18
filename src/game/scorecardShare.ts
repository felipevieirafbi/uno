import type { PlayerSeat, RoundAward } from './unoRules';

export interface ScorecardOptions {
  roundNumber: number;
  winnerName: string;
  stakesMultiplier: number;
  seats: PlayerSeat[];
  awards: RoundAward[];
  targetScore?: number;
  isChampionshipOver?: boolean;
}

export async function generateScorecardPngBlob(opts: ScorecardOptions): Promise<Blob | null> {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 960;
  canvas.height = 1200;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Emerald Casino Felt Backdrop
  const grad = ctx.createRadialGradient(480, 480, 60, 480, 600, 760);
  grad.addColorStop(0, opts.isChampionshipOver ? '#186840' : '#145E3A');
  grad.addColorStop(0.55, '#0B3B24');
  grad.addColorStop(1, '#051C11');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Outer Gold Border
  ctx.strokeStyle = '#FACC15';
  ctx.lineWidth = opts.isChampionshipOver ? 10 : 8;
  ctx.strokeRect(32, 32, canvas.width - 64, canvas.height - 64);

  // Header Lockup
  ctx.fillStyle = '#FACC15';
  ctx.font = 'bold 54px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('UNOZUEIRA', 480, 125);

  ctx.fillStyle = '#D1FAE5';
  ctx.font = '600 24px sans-serif';
  const metaSuffix = opts.targetScore && opts.targetScore > 0 ? ` · META ${opts.targetScore} PTS` : '';
  ctx.fillText(
    `RODADA ${opts.roundNumber} · MESA ${opts.stakesMultiplier}x${metaSuffix}`,
    480,
    170
  );

  // Winner Highlight Banner
  ctx.fillStyle = opts.isChampionshipOver ? '#1B5E38' : '#114A2E';
  ctx.fillRect(80, 205, 800, 120);
  ctx.strokeStyle = '#FDE047';
  ctx.lineWidth = opts.isChampionshipOver ? 4 : 3;
  ctx.strokeRect(80, 205, 800, 120);

  ctx.fillStyle = '#FDE047';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText(
    opts.isChampionshipOver ? 'GRANDE CAMPEÃO DO TORNEIO!' : 'GRANDE VENCEDOR DA RODADA',
    480,
    248
  );
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 42px sans-serif';
  ctx.fillText(opts.winnerName.slice(0, 32), 480, 302);

  // Funny Podium Titles ("Pódio da Zueira")
  let y = 378;
  ctx.fillStyle = '#FACC15';
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('PÓDIO DA ZUEIRA', 80, y);
  y += 22;

  for (const aw of opts.awards.slice(0, 3)) {
    ctx.fillStyle = '#072818';
    ctx.fillRect(80, y, 800, 74);
    ctx.strokeStyle = 'rgba(255,255,255,0.16)';
    ctx.lineWidth = 2;
    ctx.strokeRect(80, y, 800, 74);

    ctx.fillStyle = '#FDE047';
    ctx.font = 'bold 23px sans-serif';
    ctx.fillText(`${aw.title}: ${aw.playerName}`, 106, y + 32);

    ctx.fillStyle = '#A7F3D0';
    ctx.font = '500 19px sans-serif';
    ctx.fillText(aw.detail, 106, y + 58);
    y += 88;
  }

  // Leaderboard Section
  y += 26;
  ctx.fillStyle = '#FACC15';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText('PLACAR ACUMULADO', 80, y);
  y += 22;

  const ranked = [...opts.seats].sort((a, b) => b.score - a.score);
  ranked.slice(0, 6).forEach((seat, idx) => {
    ctx.fillStyle = idx === 0 ? '#124D30' : '#072818';
    ctx.fillRect(80, y, 800, 58);

    ctx.fillStyle = '#FACC15';
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`#${idx + 1}`, 104, y + 37);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 23px sans-serif';
    ctx.fillText(
      `${seat.name.slice(0, 22)}${seat.eliminated ? ' (Explodiu 25+)' : ''}`,
      162,
      y + 37
    );

    ctx.fillStyle = '#FDE047';
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${seat.score} pts · ${seat.hand.length} cartas`, 856, y + 37);
    y += 66;
  });

  // Footer Signature
  ctx.textAlign = 'center';
  ctx.fillStyle = '#6EE7B7';
  ctx.font = '600 20px sans-serif';
  ctx.fillText('Jogue UnoZueira no celular com os amigos!', 480, 1138);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png');
  });
}

export async function shareOrDownloadScorecard(opts: ScorecardOptions): Promise<'shared' | 'downloaded' | 'failed'> {
  const blob = await generateScorecardPngBlob(opts);
  if (!blob) return 'failed';
  const fileName = `unozueira-rodada-${opts.roundNumber}.png`;

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      const file = new File([blob], fileName, { type: 'image/png' });
      if (!navigator.canShare || navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `UnoZueira · Rodada ${opts.roundNumber}`,
          text: `${opts.winnerName} venceu a Rodada ${opts.roundNumber} no UnoZueira!`,
          files: [file],
        });
        return 'shared';
      }
    } catch {
      // Fallback to direct download below
    }
  }

  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 3000);
    return 'downloaded';
  } catch {
    return 'failed';
  }
}
