import { NextRequest, NextResponse } from 'next/server';
import { getOne, query } from '@/lib/db';
import { checkAlertsForProperty } from '@/lib/alerts';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      description,
      price,
      area,
      type,
      address,
      city,
      state = 'SP',
      neighborhood,
      characteristics,
      details,
      seller_id,
      imageUrls,
    } = body;

    if (!title || !description || !price || !area || !type || !address || !city || !seller_id) {
      return NextResponse.json(
        { error: 'Campos obrigatorios faltando' },
        { status: 400 }
      );
    }

    // Insert the property
    const property = await getOne(
      `INSERT INTO properties (title, description, price, area, type, address, city, state, neighborhood, characteristics, details, seller_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        title,
        description,
        price,
        area,
        type,
        address,
        city,
        state,
        neighborhood || null,
        characteristics ? JSON.stringify(characteristics) : null,
        details ? JSON.stringify(details) : null,
        seller_id,
      ]
    );

    // Insert image URLs into property_images
    if (imageUrls && Array.isArray(imageUrls) && imageUrls.length > 0) {
      for (const img of imageUrls) {
        if (img.url && img.url.trim()) {
          await query(
            `INSERT INTO property_images (property_id, filename, original_name, is_cover)
             VALUES ($1, $2, $3, $4)`,
            [
              property.id,
              img.url.trim(),
              img.url.trim().split('/').pop() || 'image',
              img.is_cover ? 1 : 0,
            ]
          );
        }
      }
    }

    // Check alerts for the new property
    try {
      await checkAlertsForProperty(Number(property.id));
    } catch (err) {
      console.error('Error checking alerts for new property:', err);
    }

    return NextResponse.json({ property }, { status: 201 });
  } catch (error) {
    console.error('Error creating property:', error);
    return NextResponse.json(
      { error: 'Falha ao cadastrar imovel' },
      { status: 500 }
    );
  }
}
