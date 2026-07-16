import AuthPageClient from "./AuthPageClient";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export default function Page() {
  return <AuthPageClient />;
}
