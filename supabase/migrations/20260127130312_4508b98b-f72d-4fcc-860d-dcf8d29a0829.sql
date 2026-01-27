-- Allow super admin to read all business_settings
CREATE POLICY "Super admin can read all business_settings" 
ON public.business_settings 
FOR SELECT 
USING (is_super_admin());