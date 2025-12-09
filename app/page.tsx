"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function HomePage() {
  const router = useRouter();
  const [room, setRoom] = useState("");
  const [name, setName] = useState("");

  const handleJoin = () => {
    if (!room || !name) return;
    router.push(
      `/room/${encodeURIComponent(room)}?name=${encodeURIComponent(name)}`
    );
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 p-6 shadow-xl bg-slate-900/60">
        <h1 className="text-2xl font-semibold mb-4 text-center">
          Multi-Room Video Call
        </h1>
        <div className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Your Name</label>
            <input
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm outline-none focus:border-sky-500"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Yogesh"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Room ID</label>
            <input
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm outline-none focus:border-sky-500"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              placeholder="team-standup, maths-class, etc."
            />
          </div>
          <button
            onClick={handleJoin}
            className="w-full rounded-lg bg-sky-500 hover:bg-sky-600 py-2 text-sm font-medium mt-2"
          >
            Join Room
          </button>
        </div>
      </div>
    </main>
  );
}
