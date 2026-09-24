"use client";

import { TicTacToeIcon } from "./tic-tac-toe-icon";
import { useApp } from "./app-provider";

export function TicTacToeNotice() {
  const { status, user, dismissTicTacToeNotice } = useApp();
  if (status !== "unlocked" || !user || user.ticTacToeNoticeSeen) return null;

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="tic-tac-toe-notice-title" className="fixed inset-0 z-50 flex items-center justify-center bg-bg/85 p-4 backdrop-blur-md">
      <div className="comic-panel w-full max-w-lg p-8 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-black bg-violet shadow-[3px_3px_0_#000]">
          <TicTacToeIcon className="h-9 w-9 text-white" />
        </span>
        <h2 id="tic-tac-toe-notice-title" className="mt-4 font-display text-3xl text-white [text-shadow:2px_2px_0_#000]">
          You can play Trivia Tic-Tac-Toe now!
        </h2>
        <p className="mt-3 text-base text-muted">
          Challenge a friend to 3x3 tic-tac-toe - answer Marvel trivia to claim a square. Win vibraniums for a
          victory, lose them for a loss. Head to the Tic-Tac-Toe page to join in.
        </p>
        <button
          type="button"
          onClick={dismissTicTacToeNotice}
          className="comic-btn mt-6 w-full rounded-lg bg-accent px-4 py-3 text-lg text-white sm:w-auto sm:px-8"
        >
          Got it!
        </button>
      </div>
    </div>
  );
}
