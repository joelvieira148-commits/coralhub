insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'coralhub-media',
  'coralhub-media',
  true,
  524288000,
  array[
    'application/pdf',
    'audio/aac',
    'audio/flac',
    'audio/m4a',
    'audio/mpeg',
    'audio/mp3',
    'audio/ogg',
    'audio/opus',
    'audio/wav',
    'audio/webm',
    'image/apng',
    'image/avif',
    'image/gif',
    'image/heic',
    'image/heif',
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/3gpp',
    'video/mp4',
    'video/mpeg',
    'video/ogg',
    'video/quicktime',
    'video/webm'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "coralhub media leitura publica" on storage.objects;
create policy "coralhub media leitura publica"
on storage.objects for select
using (bucket_id = 'coralhub-media');

drop policy if exists "coralhub media upload publico" on storage.objects;
create policy "coralhub media upload publico"
on storage.objects for insert
with check (bucket_id = 'coralhub-media');
