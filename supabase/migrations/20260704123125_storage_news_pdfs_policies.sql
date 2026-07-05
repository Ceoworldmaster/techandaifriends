/*
# Storage RLS Policies for news-pdfs bucket

Allows:
- Anyone to read (public bucket)
- Authenticated users to upload
*/

DROP POLICY IF EXISTS "news_pdfs_public_read" ON storage.objects;
CREATE POLICY "news_pdfs_public_read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'news-pdfs');

DROP POLICY IF EXISTS "news_pdfs_auth_insert" ON storage.objects;
CREATE POLICY "news_pdfs_auth_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'news-pdfs');

DROP POLICY IF EXISTS "news_pdfs_auth_update" ON storage.objects;
CREATE POLICY "news_pdfs_auth_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'news-pdfs');

DROP POLICY IF EXISTS "news_pdfs_auth_delete" ON storage.objects;
CREATE POLICY "news_pdfs_auth_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'news-pdfs');
