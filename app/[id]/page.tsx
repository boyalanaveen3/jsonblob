import { getBlobsAction, getBlobAction } from "@/actions/blobs";
import BlobDashboard from "../BlobDashboard";
import { cookies } from "next/headers";

export const runtime = "edge";
export const revalidate = 0;

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  const initialBlobs = await getBlobsAction();
  const selectedBlob = await getBlobAction(id);
  const cookieStore = await cookies();
  const initialUserName = cookieStore.get("userName")?.value || null;

  return (
    <BlobDashboard
      initialBlobs={initialBlobs}
      initialSelectedBlob={selectedBlob}
      initialUserName={initialUserName}
      defaultView="workspace"
    />
  );
}
