-- Enable Row Level Security on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scholiums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scholium_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework_completion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

-- Users table policies
-- Users can view their own profile
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "users_insert_own" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Admins can view all users
CREATE POLICY "admins_select_all_users" ON public.users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update any user
CREATE POLICY "admins_update_all_users" ON public.users
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can delete any user
CREATE POLICY "admins_delete_users" ON public.users
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Users can view other members in their scholiums
CREATE POLICY "users_select_scholium_members" ON public.users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.scholium_members sm1
      WHERE sm1.user_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.scholium_members sm2
        WHERE sm2.user_id = public.users.id
        AND sm2.scholium_id = sm1.scholium_id
      )
    )
  );

-- Subjects table policies
-- Members of any scholium can view subjects
CREATE POLICY "scholium_members_select_subjects" ON public.subjects
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.scholium_members
      WHERE user_id = auth.uid()
    )
  );

-- Members with can_create_subject permission can create subjects
CREATE POLICY "authorized_members_insert_subjects" ON public.subjects
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.scholium_members
      WHERE user_id = auth.uid() AND can_create_subject = true
    )
  );

-- Admins can manage all subjects
CREATE POLICY "admins_all_subjects" ON public.subjects
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Scholiums table policies
-- Users can view scholiums they are members of
CREATE POLICY "members_select_scholiums" ON public.scholiums
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.scholium_members
      WHERE scholium_id = public.scholiums.id
      AND user_id = auth.uid()
    )
  );

-- Any authenticated user can create a scholium
CREATE POLICY "authenticated_insert_scholiums" ON public.scholiums
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Hosts can update their scholiums
CREATE POLICY "hosts_update_scholiums" ON public.scholiums
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.scholium_members
      WHERE scholium_id = public.scholiums.id
      AND user_id = auth.uid()
      AND is_host = true
    )
  );

-- Hosts can delete their scholiums
CREATE POLICY "hosts_delete_scholiums" ON public.scholiums
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.scholium_members
      WHERE scholium_id = public.scholiums.id
      AND user_id = auth.uid()
      AND is_host = true
    )
  );

-- Admins can manage all scholiums
CREATE POLICY "admins_all_scholiums" ON public.scholiums
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Scholium members table policies
-- Members can view members of their scholiums
CREATE POLICY "members_select_scholium_members" ON public.scholium_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.scholium_members sm
      WHERE sm.scholium_id = public.scholium_members.scholium_id
      AND sm.user_id = auth.uid()
    )
  );

-- Hosts and admins can add members to scholiums
CREATE POLICY "hosts_insert_scholium_members" ON public.scholium_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.scholium_members
      WHERE scholium_id = public.scholium_members.scholium_id
      AND user_id = auth.uid()
      AND is_host = true
    )
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Hosts can update member permissions
CREATE POLICY "hosts_update_scholium_members" ON public.scholium_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.scholium_members sm
      WHERE sm.scholium_id = public.scholium_members.scholium_id
      AND sm.user_id = auth.uid()
      AND sm.is_host = true
    )
  );

-- Hosts can remove members
CREATE POLICY "hosts_delete_scholium_members" ON public.scholium_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.scholium_members sm
      WHERE sm.scholium_id = public.scholium_members.scholium_id
      AND sm.user_id = auth.uid()
      AND sm.is_host = true
    )
  );

-- Users can leave scholiums themselves
CREATE POLICY "users_delete_own_membership" ON public.scholium_members
  FOR DELETE USING (user_id = auth.uid());

-- Admins can manage all memberships
CREATE POLICY "admins_all_scholium_members" ON public.scholium_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Homework table policies
-- Members can view homework in their scholiums
CREATE POLICY "members_select_homework" ON public.homework
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.scholium_members
      WHERE scholium_id = public.homework.scholium_id
      AND user_id = auth.uid()
    )
  );

-- Members with can_add_homework permission can create homework
CREATE POLICY "authorized_members_insert_homework" ON public.homework
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.scholium_members
      WHERE scholium_id = public.homework.scholium_id
      AND user_id = auth.uid()
      AND can_add_homework = true
    )
  );

-- Creators can update their own homework
CREATE POLICY "creators_update_homework" ON public.homework
  FOR UPDATE USING (created_by = auth.uid());

-- Creators can delete their own homework
CREATE POLICY "creators_delete_homework" ON public.homework
  FOR DELETE USING (created_by = auth.uid());

-- Admins can manage all homework
CREATE POLICY "admins_all_homework" ON public.homework
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Homework completion table policies
-- Users can view their own completion status
CREATE POLICY "users_select_own_completion" ON public.homework_completion
  FOR SELECT USING (user_id = auth.uid());

-- Users can view completion status of homework in their scholiums
CREATE POLICY "members_select_completion" ON public.homework_completion
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.homework h
      INNER JOIN public.scholium_members sm ON h.scholium_id = sm.scholium_id
      WHERE h.id = public.homework_completion.homework_id
      AND sm.user_id = auth.uid()
    )
  );

-- Users can update their own completion status
CREATE POLICY "users_update_own_completion" ON public.homework_completion
  FOR UPDATE USING (user_id = auth.uid());

-- Users can insert their own completion status
CREATE POLICY "users_insert_own_completion" ON public.homework_completion
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can delete their own completion status
CREATE POLICY "users_delete_own_completion" ON public.homework_completion
  FOR DELETE USING (user_id = auth.uid());

-- Admins can manage all completion records
CREATE POLICY "admins_all_completion" ON public.homework_completion
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Attachments table policies
-- Members can view attachments for homework in their scholiums
CREATE POLICY "members_select_attachments" ON public.attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.homework h
      INNER JOIN public.scholium_members sm ON h.scholium_id = sm.scholium_id
      WHERE h.id = public.attachments.homework_id
      AND sm.user_id = auth.uid()
    )
  );

-- Members can add attachments to homework in their scholiums
CREATE POLICY "members_insert_attachments" ON public.attachments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.homework h
      INNER JOIN public.scholium_members sm ON h.scholium_id = sm.scholium_id
      WHERE h.id = public.attachments.homework_id
      AND sm.user_id = auth.uid()
    )
  );

-- Uploaders can delete their own attachments
CREATE POLICY "uploaders_delete_attachments" ON public.attachments
  FOR DELETE USING (uploaded_by = auth.uid());

-- Admins can manage all attachments
CREATE POLICY "admins_all_attachments" ON public.attachments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
