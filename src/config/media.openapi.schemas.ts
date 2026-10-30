const problemContent = {
  'application/problem+json': {
    schema: { $ref: '#/components/schemas/Problem' },
    examples: {
      problem: {
        value: {
          type: 'about:blank',
          title: 'Requête invalide',
          status: 400,
          detail: 'Le détail dépend du contrôle échoué.',
          requestId: '2dbdbe5b-df3b-4a91-84c8-9d1d1158b11d',
        },
      },
    },
  },
} as const;

export const mediaSchemas = {
  MediaCreated: {
    type: 'object',
    required: ['id', 'filename', 'url', 'mimeType', 'size', 'width', 'height', 'createdAt'],
    properties: {
      id: { type: 'string', format: 'uuid' },
      filename: { type: 'string', example: 'photo-eglise-a1b2c3d4e5f60708.jpg' },
      url: { type: 'string', format: 'uri' },
      mimeType: {
        type: 'string',
        enum: [
          'image/jpeg',
          'image/png',
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ],
      },
      size: { type: 'integer', minimum: 1 },
      width: { type: ['integer', 'null'], minimum: 1 },
      height: { type: ['integer', 'null'], minimum: 1 },
      createdAt: { type: 'string', format: 'date-time' },
    },
  },
  MediaDeleteRequest: {
    type: 'object',
    additionalProperties: false,
    properties: {
      deletedReference: {
        type: 'string',
        maxLength: 128,
        description: 'Référence opaque fournie par Supabase pour audit.',
      },
      reason: {
        type: 'string',
        maxLength: 200,
        description: 'Raison technique ou métier de la suppression.',
      },
    },
  },
  MediaDeleted: {
    type: 'object',
    required: ['id', 'filename', 'status', 'deletedAt'],
    properties: {
      id: { type: 'string', format: 'uuid' },
      filename: { type: 'string', example: 'photo-du-culte-a1b2c3d4e5f60708.jpg' },
      status: { type: 'string', const: 'deleted' },
      deletedAt: { type: 'string', format: 'date-time' },
    },
  },
} as const;

export const mediaResponses = {
  BadRequest: { description: 'Requête multipart ou champs invalides.', content: problemContent },
  Unauthorized: { description: "Clé d'intégration absente ou invalide.", content: problemContent },
  PayloadTooLarge: {
    description: 'Image au-dessus de la taille maximale.',
    content: problemContent,
  },
  UnsupportedMediaType: {
    description: "Type déclaré ou contenu réel de l'image refusé.",
    content: problemContent,
  },
  TooManyRequests: { description: "Limite d'upload atteinte.", content: problemContent },
  NotFound: { description: 'Image publique introuvable.', content: problemContent },
} as const;
