import { AdminLeadsList } from "@/components/admin-leads-list";
import { getAll, getOne } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Leads | PropView Admin",
  description: "Gerenciar leads de interesse",
};

interface Lead {
  id: number;
  property_id: number;
  property_title: string;
  property_city: string;
  name: string;
  phone: string;
  email: string | null;
  message: string | null;
  source: string;
  status: string;
  created_at: string;
}

async function getLeads() {
  const leads = await getAll(`
    SELECT l.*, p.title as property_title, p.city as property_city
    FROM leads l
    JOIN properties p ON l.property_id = p.id
    ORDER BY l.created_at DESC
  `) as Lead[];

  const totalRow = await getOne("SELECT COUNT(*) as count FROM leads") as { count: string };
  const novoRow = await getOne("SELECT COUNT(*) as count FROM leads WHERE status = 'novo'") as { count: string };
  const contatadoRow = await getOne("SELECT COUNT(*) as count FROM leads WHERE status = 'contatado'") as { count: string };
  const convertidoRow = await getOne("SELECT COUNT(*) as count FROM leads WHERE status = 'convertido'") as { count: string };

  const stats = {
    total: parseInt(totalRow.count, 10),
    novo: parseInt(novoRow.count, 10),
    contatado: parseInt(contatadoRow.count, 10),
    convertido: parseInt(convertidoRow.count, 10),
  };

  return { leads, stats };
}

export default async function AdminLeadsPage() {
  const { leads, stats } = await getLeads();

  return (
    <div className="pt-24 pb-16 px-4">
      <div className="container mx-auto max-w-5xl">
        <AdminLeadsList leads={JSON.parse(JSON.stringify(leads))} stats={stats} />
      </div>
    </div>
  );
}
