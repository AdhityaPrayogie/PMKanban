import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { getSessionUser } from '@/lib/auth';

// No .svg: served from our origin, it can carry script
const ALLOWED_IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];

export async function POST(request: Request) {
  try {
    if (!(await getSessionUser())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Berkas gambar tidak ditemukan' }, { status: 400 });
    }

    const ext = '.' + (file.name.toLowerCase().split('.').pop() || '');
    // Extension decides the served Content-Type, so it must be whitelisted (MIME is client-controlled)
    if (!ALLOWED_IMAGE_EXTS.includes(ext)) {
      return NextResponse.json(
        { error: 'Hanya format gambar (PNG, JPG, WEBP, GIF) yang diperbolehkan di diskusi dan chat!' },
        { status: 400 }
      );
    }

    // Limit to 20 MB
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Ukuran gambar maksimal 20 MB' },
        { status: 400 }
      );
    }

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'chat');
    await fs.mkdir(uploadDir, { recursive: true });

    const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const uniqueFileName = `${Date.now()}-${randomUUID().slice(0, 8)}-${cleanName}`;
    const targetFilePath = path.join(uploadDir, uniqueFileName);

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let finalBuffer: Buffer = buffer;
    const originalSize = file.size;
    let wasCompressed = false;

    // Auto-compression via sharp
    const rawExt = (file.name.toLowerCase().split('.').pop() || '').toLowerCase();
    if (['jpg', 'jpeg', 'png', 'webp'].includes(rawExt)) {
      try {
        const metadata = await sharp(buffer).metadata();
        let pipeline = sharp(buffer);

        if ((metadata.width && metadata.width > 1600) || (metadata.height && metadata.height > 1600)) {
          pipeline = pipeline.resize({
            width: metadata.width && metadata.width > 1600 ? 1600 : undefined,
            height: metadata.height && metadata.height > 1600 ? 1600 : undefined,
            fit: 'inside',
            withoutEnlargement: true,
          });
        }

        if (['jpg', 'jpeg'].includes(rawExt)) {
          finalBuffer = await pipeline.jpeg({ quality: 80, mozjpeg: true }).toBuffer();
        } else if (rawExt === 'png') {
          finalBuffer = await pipeline.png({ quality: 80, compressionLevel: 8 }).toBuffer();
        } else if (rawExt === 'webp') {
          finalBuffer = await pipeline.webp({ quality: 80 }).toBuffer();
        }

        if (finalBuffer.length < originalSize) {
          wasCompressed = true;
        } else {
          finalBuffer = buffer;
        }
      } catch (err) {
        console.warn('Image compression fallback:', err);
        finalBuffer = buffer;
      }
    }

    await fs.writeFile(targetFilePath, finalBuffer);

    return NextResponse.json({
      success: true,
      url: `/uploads/chat/${uniqueFileName}`,
      fileName: file.name,
      originalSize,
      finalSize: finalBuffer.length,
      wasCompressed,
    });
  } catch (error: any) {
    console.error('Error uploading chat image:', error);
    return NextResponse.json(
      { error: error.message || 'Gagal mengunggah gambar' },
      { status: 500 }
    );
  }
}
