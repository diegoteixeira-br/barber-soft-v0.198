-- Criar bucket para conteúdo de barbeiros
INSERT INTO storage.buckets (id, name, public)
VALUES ('barber-content', 'barber-content', true);

-- Política para upload (usuários autenticados)
CREATE POLICY "Authenticated users can upload barber content"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'barber-content' AND auth.role() = 'authenticated');

-- Política para visualização (público)
CREATE POLICY "Anyone can view barber content"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'barber-content');

-- Política para atualização
CREATE POLICY "Authenticated users can update barber content"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'barber-content' AND auth.role() = 'authenticated');

-- Política para exclusão
CREATE POLICY "Authenticated users can delete barber content"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'barber-content' AND auth.role() = 'authenticated');