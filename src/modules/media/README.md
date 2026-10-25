# Module Media

Ce module implémente le service externe appelé par Supabase.

```text
media.routes → media.controller → media.service
                                  ├── media-processor
                                  ├── media.repository → PostgreSQL
                                  └── local-media-storage → volume privé
```

`POST /api/v1/media` est protégé par une clé d’intégration avant Multer. `GET /media/:filename` est
public et ne retourne que les lignes `ready`. L'upload accepte JPEG/PNG, PDF et Word DOC/DOCX. Les
images sont décodées et réencodées avec Sharp ; les documents sont contrôlés par signature et stockés
sans transformation. PDF et Word sont servis en téléchargement.

Le stockage et le repository sont derrière des interfaces de `media.types.ts`, ce qui permet de
remplacer le volume local par un adaptateur S3-compatible sans modifier le contrôleur ni le service.
