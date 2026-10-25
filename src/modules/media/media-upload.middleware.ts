import type { RequestHandler } from 'express';
import multer from 'multer';

import { env } from '../../config/env.js';
import { HttpError } from '../../shared/http/http-error.js';

const acceptedDeclaredMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const receiveSingleMedia = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.MEDIA_MAX_FILE_SIZE_BYTES,
    files: 1,
    fields: 2,
    parts: 4,
    fieldSize: 1_024,
  },
  fileFilter: (_request, file, callback) => {
    if (!acceptedDeclaredMimeTypes.has(file.mimetype)) {
      callback(
        new HttpError(
          415,
          'Type déclaré non pris en charge',
          'Le fichier doit être une image JPEG/PNG, un PDF ou un document Word.',
        ),
      );
      return;
    }
    callback(null, true);
  },
}).any();

export const mediaUploadMiddleware: RequestHandler = (request, response, next) => {
  receiveSingleMedia(request, response, (error: unknown) => {
    if (!error) {
      const files = Array.isArray(request.files) ? request.files : [];
      if (files.some((file) => file.fieldname !== 'photo' && file.fieldname !== 'file')) {
        next(
          new HttpError(400, 'Champ fichier invalide', 'Utilisez le champ « file » ou « photo ».'),
        );
        return;
      }
      if (files.length > 0) request.file = files[0];
      next();
      return;
    }

    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        next(
          new HttpError(
            413,
            'Fichier trop volumineux',
            `La taille maximale est de ${String(env.MEDIA_MAX_FILE_SIZE_BYTES)} octets.`,
          ),
        );
        return;
      }
      next(new HttpError(400, "Requête d'upload invalide", `Erreur multipart : ${error.code}.`));
      return;
    }

    next(error);
  });
};
