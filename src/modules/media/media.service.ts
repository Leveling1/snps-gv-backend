import { randomBytes, randomUUID } from 'node:crypto';

import { env } from '../../config/env.js';
import { HttpError } from '../../shared/http/http-error.js';
import { logger } from '../../shared/logger.js';
import { processMedia } from './media-processor.js';
import { createSafeDisplayName, isSafePublicFilename } from './media.schema.js';
import type { MediaRecord, MediaRepository, MediaStorage } from './media.types.js';

export interface UploadMediaInput {
  data: Buffer;
  originalFilename: string;
  preferredName?: string;
  externalReference?: string;
}

export interface PublicMedia {
  record: MediaRecord;
  data: Buffer;
}

export interface DeleteMediaInput {
  deletedReference?: string;
  reason?: string;
}

export class MediaService {
  public constructor(
    private readonly repository: MediaRepository,
    private readonly storage: MediaStorage,
  ) {}

  public async upload(input: UploadMediaInput): Promise<MediaRecord> {
    const media = await processMedia(input.data);
    const displayName = createSafeDisplayName(input.preferredName ?? input.originalFilename);
    const uniqueSuffix = randomBytes(8).toString('hex');
    const publicFilename = `${displayName}-${uniqueSuffix}.${media.extension}`;
    const id = randomUUID();

    await this.repository.createPending({
      id,
      publicFilename,
      displayName,
      storageKey: publicFilename,
      mimeType: media.mimeType,
      extension: media.extension,
      byteSize: media.byteSize,
      width: media.width,
      height: media.height,
      sha256: media.sha256,
      externalReference: input.externalReference ?? null,
      status: 'pending',
    });

    try {
      await this.storage.write(publicFilename, media.data);
      return await this.repository.markReady(id);
    } catch (error) {
      try {
        await this.repository.markFailed(id);
      } catch (markFailedError) {
        logger.error(
          { err: markFailedError, mediaId: id },
          "Échec du marquage d'un média incomplet",
        );
      }
      throw error;
    }
  }

  public async getPublicMedia(publicFilename: string): Promise<PublicMedia> {
    if (!isSafePublicFilename(publicFilename)) {
      throw new HttpError(404, 'Image introuvable', "Cette image n'existe pas.");
    }

    const record = await this.repository.findReadyByPublicFilename(publicFilename);
    if (!record) throw new HttpError(404, 'Image introuvable', "Cette image n'existe pas.");

    return { record, data: await this.storage.read(record.storageKey) };
  }

  public async getMediaById(id: string): Promise<PublicMedia> {
    const record = await this.repository.findReadyById(id);
    if (!record) throw new HttpError(404, 'Fichier introuvable', "Ce fichier n'existe pas.");
    return { record, data: await this.storage.read(record.storageKey) };
  }

  public async deleteMedia(id: string, input: DeleteMediaInput = {}): Promise<MediaRecord> {
    const record = await this.repository.findReadyById(id);
    if (!record) throw new HttpError(404, 'Image introuvable', "Cette image n'existe pas.");

    const deleted = await this.repository.markDeleted(id, {
      ...(input.deletedReference ? { deletedReference: input.deletedReference } : {}),
      ...(input.reason ? { deletionReason: input.reason } : {}),
    });

    try {
      await this.storage.remove(record.storageKey);
    } catch (error) {
      logger.warn(
        { err: error, mediaId: id },
        "Le média a été dépublié, mais le fichier n'a pas pu être retiré du volume",
      );
    }

    return deleted;
  }

  public buildPublicUrl(publicFilename: string): string {
    return `${env.MEDIA_PUBLIC_BASE_URL.replace(/\/$/, '')}/${encodeURIComponent(publicFilename)}`;
  }
}
