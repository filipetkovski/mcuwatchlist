"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/components/app-provider";
import type { GameCell, GameQuestion, GameStatus } from "@/lib/types";

interface GamePlayer {
  id: string;
  username: string;
}

interface Game {
  id: string;
  playerX: GamePlayer;
  playerO: GamePlayer;
  board: GameCell[];
  status: GameStatus;
  turn: string | null;
  winner: string | null;
  result: "win" | "draw" | null;
  question: GameQuestion | null;
  deadline: string | null;
}

const POLL_MS = 2000;

export default function TicTacToeGamePage() {
  const params = useParams<{ id: string }>();
  const gameId = params.id;
  const { user } = useApp();
  const [game, setGame] = useState<Game | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const lastQuestionId = useRef<string | null>(null);

  useEffect(() => {
    let stop = false;
    const load = async () => {
      const res = await fetch(`/api/games/${gameId}`);
      const body = (await res.json().catch(() => ({}))) as { game?: Game; error?: string };
      if (stop) return;
      if (!res.ok || !body.game) { setError(body.error ?? "Couldn't load this game."); return; }
      setGame(body.game);
      setError(null);
    };
    void load();
    const id = window.setInterval(() => void load(), POLL_MS);
    return () => { stop = true; window.clearInterval(id); };
  }, [gameId]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const currentId = game?.question?.id ?? null;
    if (currentId !== lastQuestionId.current) {
      lastQuestionId.current = currentId;
      setSelectedAnswer(null);
      setSelectedCell(null);
    }
  }, [game?.question?.id]);

  if (error) {
    return <p role="alert" className="rounded-lg border-2 border-black bg-warn px-3 py-2 text-sm font-medium text-black">{error}</p>;
  }
  if (!game || !user) return <p className="text-muted">Loading…</p>;

  const isPlayerX = user.id === game.playerX.id;
  const opponent = isPlayerX ? game.playerO : game.playerX;
  const mySymbol = isPlayerX ? "X" : "O";
  const myTurn = game.status === "active" && game.turn === user.id;
  const secondsLeft = game.deadline ? Math.max(0, Math.ceil((new Date(game.deadline).getTime() - now) / 1000)) : null;

  const respond = async (accept: boolean) => {
    setBusy(true);
    const res = await fetch(`/api/games/${gameId}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accept }),
    });
    const body = (await res.json().catch(() => ({}))) as { game?: Game; error?: string };
    if (!res.ok) setError(body.error ?? "Couldn't respond to invite.");
    else if (body.game) setGame(body.game);
    setBusy(false);
  };

  const submitTurn = async () => {
    if (selectedAnswer === null || selectedCell === null) return;
    setBusy(true);
    setFeedback(null);
    const res = await fetch(`/api/games/${gameId}/turn`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answerIndex: selectedAnswer, cellIndex: selectedCell }),
    });
    const body = (await res.json().catch(() => ({}))) as { game?: Game; error?: string; correct?: boolean };
    if (!res.ok) { setError(body.error ?? "Couldn't submit your turn."); setBusy(false); return; }
    if (body.game) setGame(body.game);
    if (body.correct === false) setFeedback(`Wrong answer - it's ${opponent.username}'s turn now.`);
    setSelectedAnswer(null);
    setSelectedCell(null);
    setBusy(false);
  };

  return (
    <div className="mx-auto max-w-md space-y-6">
      <header className="space-y-1">
        <Link href="/tic-tac-toe" className="text-sm font-medium text-muted hover:text-ink">
          ← Back to lobby
        </Link>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          You ({mySymbol}) vs {opponent.username}
        </h1>
      </header>

      {game.status === "pending" && (
        <div className="comic-panel space-y-3 p-4">
          {isPlayerX ? (
            <p className="text-muted">Waiting for {opponent.username} to accept your invite…</p>
          ) : (
            <>
              <p>{opponent.username} challenged you to trivia tic-tac-toe!</p>
              <div className="flex gap-2">
                <button type="button" disabled={busy} onClick={() => void respond(true)} className="comic-btn rounded-lg bg-accent px-4 py-2 text-white disabled:opacity-60">
                  Accept
                </button>
                <button type="button" disabled={busy} onClick={() => void respond(false)} className="comic-btn rounded-lg bg-surface-2 px-4 py-2 text-muted hover:text-ink disabled:opacity-60">
                  Decline
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {game.status === "declined" && <p className="text-muted">This invite was declined.</p>}

      {(game.status === "active" || game.status === "finished") && (
        <>
          <Board board={game.board} onPick={myTurn ? setSelectedCell : undefined} selectedCell={selectedCell} />

          {game.status === "active" && (
            <p className="text-center text-sm text-muted">
              {myTurn ? "Your turn" : `${opponent.username}'s turn`}
              {secondsLeft !== null && <span className="ml-2 font-mono font-bold tabular-nums">{secondsLeft}s</span>}
            </p>
          )}

          {feedback && <p className="rounded-lg border-2 border-black bg-warn px-3 py-2 text-center text-sm font-medium text-black">{feedback}</p>}

          {myTurn && game.question && (
            <div className="comic-panel space-y-3 p-4">
              <p className="font-semibold">{game.question.question}</p>
              <div className="grid gap-2">
                {game.question.options.map((option, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelectedAnswer(i)}
                    className={`rounded-lg border-2 border-black px-3 py-2 text-left text-sm font-medium transition-colors ${
                      selectedAnswer === i ? "bg-accent text-white" : "bg-surface-2 hover:border-accent"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted">
                {selectedCell === null ? "Pick an answer, then pick an empty square above." : "Pick an answer if you haven't, then submit."}
              </p>
              <button
                type="button"
                disabled={busy || selectedAnswer === null || selectedCell === null}
                onClick={() => void submitTurn()}
                className="comic-btn w-full rounded-lg bg-violet px-4 py-2.5 text-white disabled:opacity-40"
              >
                Submit
              </button>
            </div>
          )}

          {game.status === "finished" && (
            <div className="comic-panel space-y-1 p-4 text-center">
              {game.result === "draw" ? (
                <>
                  <p className="font-display text-2xl">It&apos;s a draw!</p>
                  <p className="text-muted">-10 vibraniums each.</p>
                </>
              ) : game.winner === user.id ? (
                <>
                  <p className="font-display text-2xl text-emerald-600">You won!</p>
                  <p className="text-muted">+100 vibraniums.</p>
                </>
              ) : (
                <>
                  <p className="font-display text-2xl text-red-600">You lost.</p>
                  <p className="text-muted">-50 vibraniums.</p>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Board({
  board,
  onPick,
  selectedCell,
}: {
  board: GameCell[];
  onPick?: (index: number) => void;
  selectedCell: number | null;
}) {
  return (
    <div className="comic-panel grid grid-cols-3 gap-1 p-1">
      {board.map((cell, i) => (
        <button
          key={i}
          type="button"
          disabled={!onPick || cell !== null}
          onClick={() => onPick?.(i)}
          className={`flex aspect-square items-center justify-center rounded-lg border-2 border-black font-display text-4xl font-bold transition-colors ${
            cell ? "bg-surface-2" : selectedCell === i ? "bg-accent/30" : onPick ? "bg-surface-2 hover:bg-accent/10" : "bg-surface-2"
          } ${cell === "X" ? "text-accent" : cell === "O" ? "text-violet" : "text-ink"}`}
        >
          {cell}
        </button>
      ))}
    </div>
  );
}
