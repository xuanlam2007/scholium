-- Enable Realtime for all tables to support real-time subscriptions
-- This allows clients to receive instant updates when data changes

ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
ALTER PUBLICATION supabase_realtime ADD TABLE public.subjects;
ALTER PUBLICATION supabase_realtime ADD TABLE public.scholiums;
ALTER PUBLICATION supabase_realtime ADD TABLE public.scholium_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.homework;
ALTER PUBLICATION supabase_realtime ADD TABLE public.homework_completion;
ALTER PUBLICATION supabase_realtime ADD TABLE public.attachments;
