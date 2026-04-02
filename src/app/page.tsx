import { ReelsFeed } from "@/components/reels-feed";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <div className="bg-black">
      <ReelsFeed />
    </div>
  );
}
