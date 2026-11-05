import { NextResponse } from 'next/server';
import { execute, query } from '@/lib/db';
import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { TaskAttachment, AttachmentCategory } from '@/types';
import { getSessionUser } from '@/lib/auth';

// Supported extension mapping (IMG, DOC, PDF, MD, EXCEL, ZIP)
function getAttachmentCategory(fileName: string): AttachmentCategory | null {
  const parts = fileName.toLowerCase().split('.');
  if (parts.length < 2) return null;
  const ext = parts.pop() || '';

  if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) {
    return 'image';
  }
  if (['doc', 'docx'].includes(ext)) {
    return 'doc';
  }
  if (['pdf'].includes(ext)) {
    return 'pdf';
  }
  if (['md', 'markdown'].includes(ext)) {
    return 'md';
  }
  if (['xls', 'xlsx', 'csv'].includes(ext)) {
    return 'excel';
  }
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
    return 'zip';
  }

  return null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = sessionUser.id;
    const { id: taskId } = await params;
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Berkas tidak ditemukan' }, { status: 400 });
    }

    const category = getAttachmentCategory(file.name);
    if (!category) {
      return NextResponse.json(
        {
          error:
            'Format berkas tidak didukung! Hanya diperbolehkan upload Gambar (IMG), Dokumen (DOC/DOCX), PDF (.pdf), Markdown (.md), Excel (XLS/XLSX/CSV), dan Arsip ZIP (ZIP/RAR/7Z).',
        },
        { status: 400 }
      );
    }

    // Limit maximum size to 50 MB
    const MAX_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'Ukuran berkas melebihi batas maksimal 50 MB' },
        { status: 400 }
      );
    }

    // Prepare upload directory in public/uploads/attachments
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'attachments');
    await fs.mkdir(uploadDir, { recursive: true });

    // Generate safe unique filename
    const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const uniqueFileName = `${Date.now()}-${randomUUID().slice(0, 8)}-${cleanName}`;
    const targetFilePath = path.join(uploadDir, uniqueFileName);

    // Read file buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let finalBuffer: Buffer = buffer;
    const originalSize = file.size;
    let wasCompressed = false;

    // Automatic compression for raster images via sharp
    if (category === 'image') {
      const ext = (file.name.toLowerCase().split('.').pop() || '').toLowerCase();
      if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
        try {
          const metadata = await sharp(buffer).metadata();
          let pipeline = sharp(buffer);

          // Resize if width or height exceeds 2048px (prevents huge memory footprint)
          if ((metadata.width && metadata.width > 2048) || (metadata.height && metadata.height > 2048)) {
            pipeline = pipeline.resize({
              width: metadata.width && metadata.width > 2048 ? 2048 : undefined,
              height: metadata.height && metadata.height > 2048 ? 2048 : undefined,
              fit: 'inside',
              withoutEnlargement: true,
            });
          }

          if (['jpg', 'jpeg'].includes(ext)) {
            finalBuffer = await pipeline.jpeg({ quality: 82, mozjpeg: true }).toBuffer();
          } else if (ext === 'png') {
            finalBuffer = await pipeline.png({ quality: 82, compressionLevel: 8 }).toBuffer();
          } else if (ext === 'webp') {
            finalBuffer = await pipeline.webp({ quality: 82 }).toBuffer();
          }

          if (finalBuffer.length < originalSize) {
            wasCompressed = true;
          } else {
            finalBuffer = buffer;
          }
        } catch (compressErr) {
          console.warn('Image compression fallback to original buffer:', compressErr);
          finalBuffer = buffer;
        }
      }
    }

    const finalSize = finalBuffer.length;
    await fs.writeFile(targetFilePath, finalBuffer);

    const fileUrl = `/uploads/attachments/${uniqueFileName}`;
    const attachmentId = randomUUID();

    // Insert record into database
    await execute(
      `INSERT INTO task_attachments (id, task_id, file_name, file_url, file_size, file_type, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [attachmentId, taskId, file.name, fileUrl, finalSize, category, userId]
    );

    // Fetch uploader info
    const uploader = { id: sessionUser.id, name: sessionUser.name, email: sessionUser.email, avatar_url: sessionUser.avatar_url };

    const attachment: TaskAttachment = {
      id: attachmentId,
      task_id: taskId,
      file_name: file.name,
      file_url: fileUrl,
      file_size: finalSize,
      file_type: category,
      uploaded_by: userId,
      uploader,
      created_at: new Date().toISOString(),
    };

    // Log attachment activity
    {
      try {
        const taskRows = await query<any[]>('SELECT project_id FROM tasks WHERE id = ?', [taskId]);
        const projectId = taskRows[0]?.project_id;
        await execute(
          `INSERT INTO task_activities (id, task_id, project_id, user_id, action, details, created_at)
           VALUES (?, ?, ?, ?, 'upload_attachment', ?, NOW())`,
          [
            randomUUID(),
            taskId,
            projectId,
            userId,
            JSON.stringify({
              summary: `Mengunggah berkas lampiran "${file.name}"`,
              changes: [{ field: 'Lampiran Berkas', new: file.name }],
            }),
          ]
        );
      } catch (err) {
        console.error('Error logging attachment activity:', err);
      }
    }

    return NextResponse.json({
      success: true,
      attachment,
      compression: {
        wasCompressed,
        originalSize,
        finalSize,
        savedPercent: wasCompressed
          ? Math.round(((originalSize - finalSize) / originalSize) * 100)
          : 0,
      },
    });
  } catch (error: any) {
    console.error('Error uploading task attachment:', error);
    return NextResponse.json(
      { error: error.message || 'Gagal mengunggah berkas' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id: taskId } = await params;
    const { searchParams } = new URL(request.url);
    const attachmentId = searchParams.get('attachmentId');

    if (!attachmentId) {
      return NextResponse.json({ error: 'attachmentId diperlukan' }, { status: 400 });
    }

    const rows = await query<any[]>(
      'SELECT file_name, file_url FROM task_attachments WHERE id = ? AND task_id = ?',
      [attachmentId, taskId]
    );

    if (rows && rows.length > 0) {
      const fileUrl = rows[0].file_url;
      const fileName = rows[0].file_name;
      try {
        const filePath = path.join(process.cwd(), 'public', fileUrl.replace(/^\//, ''));
        await fs.unlink(filePath);
      } catch {
        // file could be missing, ignore deletion error
      }

      await execute('DELETE FROM task_attachments WHERE id = ?', [attachmentId]);

      {
        try {
          const taskRows = await query<any[]>('SELECT project_id FROM tasks WHERE id = ?', [taskId]);
          const projectId = taskRows[0]?.project_id;
          await execute(
            `INSERT INTO task_activities (id, task_id, project_id, user_id, action, details, created_at)
             VALUES (?, ?, ?, ?, 'delete_attachment', ?, NOW())`,
            [
              randomUUID(),
              taskId,
              projectId,
              sessionUser.id,
              JSON.stringify({
                summary: `Menghapus berkas lampiran "${fileName}"`,
                changes: [{ field: 'Lampiran Berkas', old: fileName, new: 'Dihapus' }],
              }),
            ]
          );
        } catch (err) {
          console.error('Error logging delete attachment activity:', err);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting attachment:', error);
    return NextResponse.json(
      { error: error.message || 'Gagal menghapus berkas' },
      { status: 500 }
    );
  }
}
