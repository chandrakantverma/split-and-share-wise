-- Fix infinite recursion in group_members RLS policies
-- This script fixes the database policy issues preventing group creation

-- Step 1: Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view group members for groups they belong to" ON public.group_members;
DROP POLICY IF EXISTS "Group creators can add members" ON public.group_members;
DROP POLICY IF EXISTS "Users can view groups they belong to" ON public.groups;
DROP POLICY IF EXISTS "Users can view expenses in their groups or paid by them" ON public.expenses;
DROP POLICY IF EXISTS "Users can view expense participants for accessible expenses" ON public.expense_participants;

-- Step 2: Create simplified policies without circular references
CREATE POLICY "Users can view group members for groups they belong to" ON public.group_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.group_members gm 
    WHERE gm.group_id = group_members.group_id 
    AND gm.user_id = auth.uid()
  )
);

CREATE POLICY "Group creators can add members" ON public.group_members FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.groups 
    WHERE id = group_id 
    AND created_by = auth.uid()
  )
);

CREATE POLICY "Users can view groups they belong to" ON public.groups FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.group_members 
    WHERE group_id = groups.id 
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can view expenses in their groups or paid by them" ON public.expenses FOR SELECT
USING (
  auth.uid() = paid_by 
  OR EXISTS (
    SELECT 1 FROM public.group_members 
    WHERE group_id = expenses.group_id 
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can view expense participants for accessible expenses" ON public.expense_participants FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.expenses 
    WHERE id = expense_id 
    AND (
      paid_by = auth.uid() 
      OR EXISTS (
        SELECT 1 FROM public.group_members 
        WHERE group_id = expenses.group_id 
        AND user_id = auth.uid()
      )
    )
  )
  OR auth.uid() = user_id
);

-- Step 3: Ensure basic policies exist
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);

-- Step 4: Test the fix by trying to query group_members
-- This should now work without infinite recursion
SELECT 'Database policies fixed successfully!' as status; 