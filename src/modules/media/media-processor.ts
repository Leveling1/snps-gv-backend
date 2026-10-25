import { createHash } from 'node:crypto';

import * as cfb from 'cfb';
import { fileTypeFromBuffer } from 'file-type';
import sharp from 'sharp';

import { env } from '../../config/env.js';
import { HttpError } from '../../shared/http/http-error.js';
import type { MediaExtension, MediaMimeType, ProcessedMedia } from './media.types.js';

interface AllowedType {
  extension: MediaExtension;
  mimeType: MediaMimeType;
}

const allowedTypes = new Map<string, AllowedType>([
  ['image/jpeg', { extension: 'jpg', mimeType: 'image/jpeg' }],
  ['image/png', { extension: 'png', mimeType: 'image/png' }],
  ['application/pdf', { extension: 'pdf', mimeType: 'application/pdf' }],
  [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    {
      extension: 'docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    },
  ],
]);

const legacyWordType: AllowedType = { extension: 'doc', mimeType: 'application/msword' };

function invalidMedia(message: string): HttpError {
  return new HttpError(415, 'Fichier non pris en charge', message);
}

function hasLegacyWordStreams(input: Buffer): boolean {
  try {
    const document = cfb.parse(input, { type: 'buffer' });
    const streamPaths = new Set(
      document.FileIndex.filter((entry) => entry.type === 2).map((entry) =>
        entry.name.toLowerCase(),
      ),
    );
    return (
      streamPaths.has('worddocument') && (streamPaths.has('0table') || streamPaths.has('1table'))
    );
  } catch {
    return false;
  }
}

export async function processMedia(input: Buffer): Promise<ProcessedMedia> {
  const detectedType = await fileTypeFromBuffer(input);
  const allowedType = detectedType ? allowedTypes.get(detectedType.mime) : undefined;
  const resolvedType =
    detectedType?.mime === 'application/x-cfb' && hasLegacyWordStreams(input)
      ? legacyWordType
      : allowedType;

  if (!resolvedType) {
    throw invalidMedia('Le contenu réel doit être une image JPEG/PNG, un PDF ou un document Word.');
  }

  if (resolvedType.extension === 'jpg' || resolvedType.extension === 'png') {
    try {
      const source = sharp(input, {
        failOn: 'error',
        limitInputPixels: env.MEDIA_MAX_INPUT_PIXELS,
        sequentialRead: true,
      }).rotate();

      const output =
        resolvedType.extension === 'jpg'
          ? source.jpeg({ quality: 88, mozjpeg: true })
          : source.png({ compressionLevel: 9, adaptiveFiltering: true });
      const { data, info } = await output.toBuffer({ resolveWithObject: true });

      if (!info.width || !info.height) {
        throw invalidMedia("Les dimensions de l'image sont invalides.");
      }

      return {
        data,
        extension: resolvedType.extension,
        mimeType: resolvedType.mimeType,
        byteSize: data.length,
        width: info.width,
        height: info.height,
        sha256: createHash('sha256').update(data).digest('hex'),
      };
    } catch (error) {
      if (error instanceof HttpError) throw error;
      throw invalidMedia("L'image est corrompue, trop grande ou impossible à décoder.");
    }
  }

  return {
    data: input,
    extension: resolvedType.extension,
    mimeType: resolvedType.mimeType,
    byteSize: input.length,
    width: null,
    height: null,
    sha256: createHash('sha256').update(input).digest('hex'),
  };
}
