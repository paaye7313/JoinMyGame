import type { CardDef } from "../cards";
import HandCard from "./HandCard";

type Outcome = "win" | "lose" | "draw";

interface PlayZoneProps {
  selfCard: CardDef | null;
  selfLabel: string;
  selfOutcome?: Outcome;
  opponentCard: CardDef | null;
  opponentLabel: string;
  opponentOutcome?: Outcome;
  revealed: boolean;
}

const MYSTERY_CARD: CardDef = { id: "rock", label: "", icon: "", category: "basic" };

function EmptySlot() {
  return (
    <div className="flex h-36 w-24 items-center justify-center rounded-2xl border-2 border-dashed border-border text-2xl text-text/40 sm:h-44 sm:w-32">
      ?
    </div>
  );
}

function PlayZone({
  selfCard,
  selfLabel,
  selfOutcome,
  opponentCard,
  opponentLabel,
  opponentOutcome,
  revealed,
}: PlayZoneProps) {
  const opponentWaiting = selfCard !== null && !revealed;

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <div className="flex flex-col items-center gap-2">
        {revealed && opponentCard ? (
          <HandCard card={opponentCard} flipped outcome={opponentOutcome} />
        ) : opponentWaiting ? (
          <HandCard card={MYSTERY_CARD} flipped={false} className="animate-pulse" />
        ) : (
          <EmptySlot />
        )}
        <span className="text-sm text-text">{opponentLabel}</span>
      </div>

      <div className="text-sm font-semibold tracking-widest text-primary">VS</div>

      <div className="flex flex-col items-center gap-2">
        {selfCard ? (
          <HandCard card={selfCard} flipped={revealed} outcome={revealed ? selfOutcome : undefined} />
        ) : (
          <EmptySlot />
        )}
        <span className="text-sm text-text">{selfLabel}</span>
      </div>
    </div>
  );
}

export default PlayZone;
