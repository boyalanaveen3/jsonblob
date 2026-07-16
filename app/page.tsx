import { getBlobsAction } from "@/actions/blobs";
import BlobDashboard from "./BlobDashboard";
import { cookies } from "next/headers";

export const runtime = "edge";

// Prevent static generation caching so it reads fresh database records on load
export const revalidate = 0;

export default async function Page() {
  const initialBlobs = await getBlobsAction();
  const cookieStore = await cookies();
  const initialUserName = cookieStore.get("userName")?.value || null;

  return <BlobDashboard initialBlobs={initialBlobs} initialUserName={initialUserName} />;
}
