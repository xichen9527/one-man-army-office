DROP POLICY IF EXISTS "followups_select_own" ON public.followups;
CREATE POLICY "followups_select_own" ON public.followups FOR SELECT USING (auth.uid()::text = user_id);
DROP POLICY IF EXISTS "followups_insert_own" ON public.followups;
CREATE POLICY "followups_insert_own" ON public.followups FOR INSERT WITH CHECK (auth.uid()::text = user_id);
DROP POLICY IF EXISTS "followups_delete_own" ON public.followups;
CREATE POLICY "followups_delete_own" ON public.followups FOR DELETE USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "social_accounts_select_own" ON public.social_accounts;
CREATE POLICY "social_accounts_select_own" ON public.social_accounts FOR SELECT USING (auth.uid()::text = user_id);
DROP POLICY IF EXISTS "social_accounts_insert_own" ON public.social_accounts;
CREATE POLICY "social_accounts_insert_own" ON public.social_accounts FOR INSERT WITH CHECK (auth.uid()::text = user_id);
DROP POLICY IF EXISTS "social_accounts_update_own" ON public.social_accounts;
CREATE POLICY "social_accounts_update_own" ON public.social_accounts FOR UPDATE USING (auth.uid()::text = user_id);
DROP POLICY IF EXISTS "social_accounts_delete_own" ON public.social_accounts;
CREATE POLICY "social_accounts_delete_own" ON public.social_accounts FOR DELETE USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "social_posts_select_own" ON public.social_posts;
CREATE POLICY "social_posts_select_own" ON public.social_posts FOR SELECT USING (auth.uid()::text IN (SELECT user_id FROM public.social_accounts WHERE id = account_id));
DROP POLICY IF EXISTS "social_posts_insert_own" ON public.social_posts;
CREATE POLICY "social_posts_insert_own" ON public.social_posts FOR INSERT WITH CHECK (auth.uid()::text IN (SELECT user_id FROM public.social_accounts WHERE id = account_id));
DROP POLICY IF EXISTS "social_posts_update_own" ON public.social_posts;
CREATE POLICY "social_posts_update_own" ON public.social_posts FOR UPDATE USING (auth.uid()::text IN (SELECT user_id FROM public.social_accounts WHERE id = account_id));
DROP POLICY IF EXISTS "social_posts_delete_own" ON public.social_posts;
CREATE POLICY "social_posts_delete_own" ON public.social_posts FOR DELETE USING (auth.uid()::text IN (SELECT user_id FROM public.social_accounts WHERE id = account_id));

DROP POLICY IF EXISTS "trending_topics_select_all" ON public.trending_topics;
CREATE POLICY "trending_topics_select_all" ON public.trending_topics FOR SELECT USING (true);
DROP POLICY IF EXISTS "trending_topics_insert_all" ON public.trending_topics;
CREATE POLICY "trending_topics_insert_all" ON public.trending_topics FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "trending_topics_update_all" ON public.trending_topics;
CREATE POLICY "trending_topics_update_all" ON public.trending_topics FOR UPDATE USING (true);

DROP POLICY IF EXISTS "video_conferences_select_own" ON public.video_conferences;
CREATE POLICY "video_conferences_select_own" ON public.video_conferences FOR SELECT USING (auth.uid()::text = host_id);
DROP POLICY IF EXISTS "video_conferences_insert_own" ON public.video_conferences;
CREATE POLICY "video_conferences_insert_own" ON public.video_conferences FOR INSERT WITH CHECK (auth.uid()::text = host_id);
DROP POLICY IF EXISTS "video_conferences_update_own" ON public.video_conferences;
CREATE POLICY "video_conferences_update_own" ON public.video_conferences FOR UPDATE USING (auth.uid()::text = host_id);
DROP POLICY IF EXISTS "video_conferences_delete_own" ON public.video_conferences;
CREATE POLICY "video_conferences_delete_own" ON public.video_conferences FOR DELETE USING (auth.uid()::text = host_id);

DROP POLICY IF EXISTS "team_members_select_own" ON public.team_members;
CREATE POLICY "team_members_select_own" ON public.team_members FOR SELECT USING (auth.uid()::text = owner_id OR auth.uid()::text = user_id);
DROP POLICY IF EXISTS "team_members_insert_own" ON public.team_members;
CREATE POLICY "team_members_insert_own" ON public.team_members FOR INSERT WITH CHECK (auth.uid()::text = owner_id);
DROP POLICY IF EXISTS "team_members_update_own" ON public.team_members;
CREATE POLICY "team_members_update_own" ON public.team_members FOR UPDATE USING (auth.uid()::text = owner_id);
DROP POLICY IF EXISTS "team_members_delete_own" ON public.team_members;
CREATE POLICY "team_members_delete_own" ON public.team_members FOR DELETE USING (auth.uid()::text = owner_id);

DROP POLICY IF EXISTS "invitations_select_own" ON public.invitations;
CREATE POLICY "invitations_select_own" ON public.invitations FOR SELECT USING (auth.uid()::text = team_owner_id);
DROP POLICY IF EXISTS "invitations_insert_own" ON public.invitations;
CREATE POLICY "invitations_insert_own" ON public.invitations FOR INSERT WITH CHECK (auth.uid()::text = team_owner_id);
DROP POLICY IF EXISTS "invitations_update_own" ON public.invitations;
CREATE POLICY "invitations_update_own" ON public.invitations FOR UPDATE USING (auth.uid()::text = team_owner_id);
DROP POLICY IF EXISTS "invitations_delete_own" ON public.invitations;
CREATE POLICY "invitations_delete_own" ON public.invitations FOR DELETE USING (auth.uid()::text = team_owner_id);

DROP POLICY IF EXISTS "files_select_own_or_public" ON public.files;
CREATE POLICY "files_select_own_or_public" ON public.files FOR SELECT USING (auth.uid()::text = uploaded_by OR is_public = true);
DROP POLICY IF EXISTS "files_insert_own" ON public.files;
CREATE POLICY "files_insert_own" ON public.files FOR INSERT WITH CHECK (auth.uid()::text = uploaded_by);
DROP POLICY IF EXISTS "files_update_own" ON public.files;
CREATE POLICY "files_update_own" ON public.files FOR UPDATE USING (auth.uid()::text = uploaded_by);
DROP POLICY IF EXISTS "files_delete_own" ON public.files;
CREATE POLICY "files_delete_own" ON public.files FOR DELETE USING (auth.uid()::text = uploaded_by);
