import { NextRequest, NextResponse } from "next/server";
import { RtcRole, RtcTokenBuilder } from "agora-access-token";

const APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID!;
const APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE!;
const EXPIRE_SECONDS = Number(process.env.AGORATOKENEXPIRESECONDS || 3600);

export async function POST(req: NextRequest) {
  try {
    const { channelName, uid } = await req.json();

    if (!channelName || !uid) {
      return NextResponse.json(
        { error: "channelName and uid are required" },
        { status: 400 }
      );
    }

    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpireTs = currentTimestamp + EXPIRE_SECONDS;

    const token = RtcTokenBuilder.buildTokenWithUid(
      APP_ID,
      APP_CERTIFICATE,
      channelName,
      Number(uid),
      RtcRole.PUBLISHER,
      privilegeExpireTs
    );

    return NextResponse.json({ token });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
