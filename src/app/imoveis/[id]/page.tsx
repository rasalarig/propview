import { notFound } from "next/navigation";
import { PropertyDetail } from "@/components/property-detail";
import { getOne, getAll } from "@/lib/db";

export const dynamic = "force-dynamic";

interface Property {
  id: number;
  title: string;
  description: string;
  price: number;
  area: number;
  type: string;
  address: string;
  city: string;
  state: string;
  neighborhood: string | null;
  status: string;
  characteristics: string;
  details: string;
  created_at: string;
  updated_at: string;
  latitude: number | null;
  longitude: number | null;
}

interface PropertyImage {
  id: number;
  property_id: number;
  filename: string;
  original_name: string;
  is_cover: number;
}

async function getProperty(id: string) {
  const property = await getOne(
    "SELECT * FROM properties WHERE id = $1",
    [Number(id)]
  ) as Property | null;
  if (!property) return null;

  const images = await getAll(
    "SELECT * FROM property_images WHERE property_id = $1 ORDER BY is_cover DESC",
    [Number(id)]
  ) as PropertyImage[];

  return { ...property, images };
}

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}) {
  const property = await getProperty(params.id);
  if (!property) return { title: "Imóvel não encontrado" };

  return {
    title: `${property.title} | PropView`,
    description: property.description.substring(0, 160),
  };
}

export default async function PropertyPage({
  params,
}: {
  params: { id: string };
}) {
  const property = await getProperty(params.id);

  if (!property) {
    notFound();
  }

  return <PropertyDetail property={JSON.parse(JSON.stringify(property))} />;
}
