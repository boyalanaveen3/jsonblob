import { getBlobsAction } from "@/actions/blobs";
import BlobDashboard from "./BlobDashboard";

export const runtime = "edge";

// Prevent static generation caching so it reads fresh database records on load
export const revalidate = 0;

export default async function Page() {
  const initialBlobs = await getBlobsAction();
  return <BlobDashboard initialBlobs={initialBlobs} />;
}
