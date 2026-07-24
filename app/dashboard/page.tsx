import { getBlobsAction } from "@/actions/blobs";
import BlobDashboard from "../BlobDashboard";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const runtime = "edge";
export const revalidate = 0;

export default async function Page() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("userId")?.value;

  if (!userId) {
    redirect("/login");
  }

  const initialBlobs = await getBlobsAction();
  const initialUserName = cookieStore.get("userName")?.value || null;

  return <BlobDashboard initialBlobs={initialBlobs} initialUserName={initialUserName} defaultView="dashboard" />;
}
