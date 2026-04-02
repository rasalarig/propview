import { CampaignsPage } from "@/components/campaigns-page";

export const metadata = {
  title: "Campanhas | PropView",
};

export const dynamic = "force-dynamic";

export default function Campanhas() {
  return (
    <div className="container mx-auto px-4 py-8 pt-24 pb-24">
      <CampaignsPage />
    </div>
  );
}
