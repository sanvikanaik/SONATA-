import { getSession } from "@/lib/auth";
import { handle, json } from "@/lib/http";

export const dynamic = "force-dynamic";
export const GET = handle(async () => json({ user: await getSession() }));
