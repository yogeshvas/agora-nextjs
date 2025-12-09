"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams, useParams, useRouter } from "next/navigation";
import AgoraRTC, {
  IAgoraRTCClient,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
  IRemoteVideoTrack,
  IRemoteAudioTrack,
  IRemoteUser,
} from "agora-rtc-sdk-ng";

const APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID!;

type RemoteUserWithTracks = IRemoteUser & {
  videoTrack?: IRemoteVideoTrack | null;
  audioTrack?: IRemoteAudioTrack | null;
};

export default function RoomPage() {
  const params = useParams<{ roomId: string }>();
  const roomId = params.roomId;
  const searchParams = useSearchParams();
  const router = useRouter();

  const name = searchParams.get("name") || "Guest";

  const [client] = useState<IAgoraRTCClient>(() =>
    AgoraRTC.createClient({ mode: "rtc", codec: "vp8" })
  );

  const [joined, setJoined] = useState(false);
  const [localVideoTrack, setLocalVideoTrack] =
    useState<ICameraVideoTrack | null>(null);
  const [localAudioTrack, setLocalAudioTrack] =
    useState<IMicrophoneAudioTrack | null>(null);
  const [remoteUsers, setRemoteUsers] = useState<RemoteUserWithTracks[]>([]);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);

  const localVideoRef = useRef<HTMLDivElement | null>(null);

  // Create & join channel
  useEffect(() => {
    let isCanceled = false;

    const joinRoom = async () => {
      try {
        const uid = Math.floor(Math.random() * 100000);

        // Get token from our API
        const res = await fetch("/api/agora-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ channelName: roomId, uid }),
        });

        const data = await res.json();
        if (!res.ok) {
          console.error("Token fetch error", data);
          return;
        }

        const token = data.token as string;

        // Set up event listeners
        client.on("user-published", async (user, mediaType) => {
          await client.subscribe(user, mediaType);

          setRemoteUsers((prev) => {
            const existing = prev.find((u) => u.uid === user.uid);
            const updatedUser: RemoteUserWithTracks = {
              ...user,
              videoTrack: user.videoTrack,
              audioTrack: user.audioTrack,
            };
            if (existing) {
              return prev.map((u) => (u.uid === user.uid ? updatedUser : u));
            }
            return [...prev, updatedUser];
          });

          if (mediaType === "audio" && user.audioTrack) {
            user.audioTrack.play();
          }
        });

        client.on("user-unpublished", (user, mediaType) => {
          if (mediaType === "video") {
            setRemoteUsers((prev) =>
              prev.map((u) =>
                u.uid === user.uid ? { ...u, videoTrack: null } : u
              )
            );
          }
          if (mediaType === "audio") {
            setRemoteUsers((prev) =>
              prev.map((u) =>
                u.uid === user.uid ? { ...u, audioTrack: null } : u
              )
            );
          }
        });

        client.on("user-left", (user) => {
          setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid));
        });

        // Join channel
        await client.join(APP_ID, roomId, token || null, uid);

        // Create local tracks
        const [micTrack, camTrack] =
          await AgoraRTC.createMicrophoneAndCameraTracks();

        if (isCanceled) {
          micTrack.close();
          camTrack.close();
          await client.leave();
          return;
        }

        setLocalAudioTrack(micTrack);
        setLocalVideoTrack(camTrack);

        // Play local video
        if (localVideoRef.current) {
          camTrack.play(localVideoRef.current);
        }

        await client.publish([micTrack, camTrack]);
        setJoined(true);
      } catch (error) {
        console.error("Failed to join channel", error);
      }
    };

    joinRoom();

    return () => {
      isCanceled = true;
      (async () => {
        try {
          localAudioTrack?.close();
          localVideoTrack?.close();
          if (client.connectionState !== "DISCONNECTED") {
            await client.leave();
          }
        } catch (err) {
          console.error("Error cleaning up Agora client", err);
        }
      })();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // Mic toggle
  const toggleMic = async () => {
    if (!localAudioTrack) return;
    if (isMicOn) {
      await localAudioTrack.setEnabled(false);
      setIsMicOn(false);
    } else {
      await localAudioTrack.setEnabled(true);
      setIsMicOn(true);
    }
  };

  // Cam toggle
  const toggleCam = async () => {
    if (!localVideoTrack) return;
    if (isCamOn) {
      await localVideoTrack.setEnabled(false);
      setIsCamOn(false);
    } else {
      await localVideoTrack.setEnabled(true);
      setIsCamOn(true);
    }
  };

  const handleLeave = async () => {
    try {
      localAudioTrack?.close();
      localVideoTrack?.close();
      if (client.connectionState !== "DISCONNECTED") {
        await client.leave();
      }
    } catch (err) {
      console.error("Error leaving channel", err);
    } finally {
      router.push("/");
    }
  };

  return (
    <main className="min-h-screen flex flex-col bg-slate-950 text-white">
      <header className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-900/70">
        <div>
          <h2 className="text-lg font-semibold">Room: {roomId}</h2>
          <p className="text-xs text-slate-400">You are: {name}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={toggleMic}
            className="px-3 py-1 rounded-full text-xs font-medium border border-slate-700 hover:bg-slate-800"
          >
            {isMicOn ? "Mute" : "Unmute"}
          </button>
          <button
            onClick={toggleCam}
            className="px-3 py-1 rounded-full text-xs font-medium border border-slate-700 hover:bg-slate-800"
          >
            {isCamOn ? "Camera Off" : "Camera On"}
          </button>
          <button
            onClick={handleLeave}
            className="px-3 py-1 rounded-full text-xs font-medium bg-red-500 hover:bg-red-600"
          >
            Leave
          </button>
        </div>
      </header>

      <section className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2 p-2 md:p-4">
        {/* Local video */}
        <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-900/60">
          <div
            ref={localVideoRef}
            className="w-full h-full min-h-[220px] bg-black"
          />
          <span className="absolute left-2 bottom-2 text-xs bg-slate-900/80 px-2 py-1 rounded-full">
            You ({name})
          </span>
        </div>

        {/* Remote videos grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {remoteUsers.length === 0 && (
            <div className="flex items-center justify-center rounded-xl border border-slate-800 bg-slate-900/60 text-xs text-slate-400">
              Waiting for others to join...
            </div>
          )}

          {remoteUsers.map((user) => (
            <RemoteUserVideo key={user.uid as number} user={user} />
          ))}
        </div>
      </section>
    </main>
  );
}

function RemoteUserVideo({ user }: { user: RemoteUserWithTracks }) {
  const videoRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (user.videoTrack && videoRef.current) {
      user.videoTrack.play(videoRef.current);
    }
    return () => {
      user.videoTrack?.stop();
    };
  }, [user.videoTrack]);

  return (
    <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-900/60 min-h-[180px]">
      <div ref={videoRef} className="w-full h-full bg-black" />
      <span className="absolute left-2 bottom-2 text-xs bg-slate-900/80 px-2 py-1 rounded-full">
        User {String(user.uid)}
      </span>
    </div>
  );
}
