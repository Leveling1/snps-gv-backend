export const mediaPaths = {
  '/api/v1/media': {
    post: {
      tags: ['Media'],
      summary: 'Téléverse une image, un PDF ou un document Word',
      description:
        "Endpoint service-à-service. Supabase doit vérifier l'utilisateur et son rôle avant l'appel.",
      operationId: 'uploadMedia',
      security: [{ IntegrationApiKey: [] }],
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              anyOf: [{ required: ['file'] }, { required: ['photo'] }],
              properties: {
                file: {
                  type: 'string',
                  format: 'binary',
                  description: 'Fichier image, PDF, DOC ou DOCX. Champ recommandé.',
                },
                photo: {
                  type: 'string',
                  format: 'binary',
                  description: 'Alias historique de file, conservé pour compatibilité.',
                },
                name: {
                  type: 'string',
                  maxLength: 120,
                  description: 'Nom lisible facultatif. Le serveur le normalise et le rend unique.',
                },
                externalReference: {
                  type: 'string',
                  maxLength: 128,
                  description: 'Référence opaque facultative fournie par Supabase pour audit.',
                },
              },
            },
            encoding: {
              file: {
                contentType:
                  'image/jpeg, image/png, application/pdf, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              },
              photo: {
                contentType:
                  'image/jpeg, image/png, application/pdf, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              },
            },
            examples: {
              uploadJpeg: {
                summary: 'Upload JPEG via form-data',
                value: {
                  photo: '<fichier-binaire-jpeg>',
                  name: 'Photo du culte',
                  externalReference: 'supabase-user-or-operation-id',
                },
              },
              uploadPng: {
                summary: 'Upload PNG via form-data',
                value: {
                  photo: '<fichier-binaire-png>',
                  name: 'Logo APC',
                },
              },
              uploadPdf: {
                summary: 'Upload PDF via form-data',
                value: { file: '<fichier-binaire-pdf>', name: 'Document paroissial' },
              },
              uploadWord: {
                summary: 'Upload Word DOCX via form-data',
                value: { file: '<fichier-binaire-docx>', name: 'Compte rendu' },
              },
            },
          },
        },
      },
      responses: {
        '201': {
          description: 'Fichier vérifié et conservé. Les images sont réencodées.',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/MediaCreated' },
              examples: {
                uploadedImage: {
                  summary: 'Réponse JSON retournée à Supabase',
                  value: {
                    id: '2dbdbe5b-df3b-4a91-84c8-9d1d1158b11d',
                    filename: 'photo-du-culte-a1b2c3d4e5f60708.jpg',
                    url: 'https://api.example.com/media/photo-du-culte-a1b2c3d4e5f60708.jpg',
                    mimeType: 'image/jpeg',
                    size: 241903,
                    width: 1600,
                    height: 900,
                    createdAt: '2026-08-23T12:00:00.000Z',
                  },
                },
              },
            },
          },
        },
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '413': { $ref: '#/components/responses/PayloadTooLarge' },
        '415': { $ref: '#/components/responses/UnsupportedMediaType' },
        '429': { $ref: '#/components/responses/TooManyRequests' },
      },
    },
  },
  '/api/v1/media/{id}': {
    delete: {
      tags: ['Media'],
      summary: 'Supprime un média sur décision de Supabase',
      description:
        "Endpoint service-à-service. Supabase doit vérifier l'utilisateur et son rôle avant l'appel.",
      operationId: 'deleteMedia',
      security: [{ IntegrationApiKey: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
        },
      ],
      requestBody: {
        required: false,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/MediaDeleteRequest' },
            examples: {
              deletedBySupabase: {
                summary: 'Audit fourni par Supabase',
                value: {
                  deletedReference: 'supabase-user-or-operation-id',
                  reason: 'removed_by_admin',
                },
              },
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Média dépublié et fichier retiré du stockage si possible.',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/MediaDeleted' },
              examples: {
                deletedImage: {
                  value: {
                    id: '2dbdbe5b-df3b-4a91-84c8-9d1d1158b11d',
                    filename: 'photo-du-culte-a1b2c3d4e5f60708.jpg',
                    status: 'deleted',
                    deletedAt: '2026-08-23T12:10:00.000Z',
                  },
                },
              },
            },
          },
        },
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
  },
  '/api/v1/media/{id}/content': {
    get: {
      tags: ['Media'],
      summary: 'Retourne un média à Supabase après authentification service-à-service',
      operationId: 'getPrivateMediaContent',
      security: [{ IntegrationApiKey: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
        },
      ],
      responses: {
        '200': {
          description: 'Contenu binaire privé; Cache-Control: private, no-store.',
          content: {
            'image/jpeg': { schema: { type: 'string', format: 'binary' } },
            'image/png': { schema: { type: 'string', format: 'binary' } },
            'application/pdf': { schema: { type: 'string', format: 'binary' } },
            'application/msword': { schema: { type: 'string', format: 'binary' } },
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
              schema: { type: 'string', format: 'binary' },
            },
          },
        },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
  },
  '/media/{filename}': {
    get: {
      tags: ['Media'],
      summary: 'Retourne un fichier public en lecture seule',
      operationId: 'getPublicMedia',
      parameters: [
        {
          name: 'filename',
          in: 'path',
          required: true,
          schema: { type: 'string', pattern: '^[a-z0-9][a-z0-9-]*\\.(jpg|png|pdf|doc|docx)$' },
        },
      ],
      responses: {
        '200': {
          description:
            'Images servies en ligne ; PDF et documents Word téléchargés en pièce jointe.',
          headers: {
            ETag: { schema: { type: 'string' } },
            'Cache-Control': { schema: { type: 'string' } },
          },
          content: {
            'image/jpeg': { schema: { type: 'string', format: 'binary' } },
            'image/png': { schema: { type: 'string', format: 'binary' } },
            'application/pdf': { schema: { type: 'string', format: 'binary' } },
            'application/msword': { schema: { type: 'string', format: 'binary' } },
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
              schema: { type: 'string', format: 'binary' },
            },
          },
        },
        '304': { description: 'Le contenu en cache est encore valide.' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
  },
} as const;
