-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create groups table
CREATE TABLE public.groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create group members table
CREATE TABLE public.group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Create friendships table
CREATE TABLE public.friendships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, friend_id)
);

-- Create expense categories enum
CREATE TYPE public.expense_category AS ENUM (
  'food', 'transport', 'accommodation', 'entertainment', 
  'shopping', 'utilities', 'healthcare', 'other'
);

-- Create expenses table
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  category expense_category NOT NULL DEFAULT 'other',
  paid_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create expense participants table (tracks who owes what)
CREATE TABLE public.expense_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_owed DECIMAL(10,2) NOT NULL CHECK (amount_owed >= 0),
  is_settled BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(expense_id, user_id)
);

-- Create settlements table
CREATE TABLE public.settlements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_user UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  description TEXT,
  settled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create activities table for activity feed
CREATE TABLE public.activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('expense_added', 'expense_updated', 'expense_deleted', 'group_created', 'member_added', 'settlement_made')),
  description TEXT NOT NULL,
  expense_id UUID REFERENCES public.expenses(id) ON DELETE CASCADE,
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for groups
CREATE POLICY "Users can view groups they belong to" ON public.groups FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.group_members WHERE group_id = groups.id AND user_id = auth.uid()));

CREATE POLICY "Users can create groups" ON public.groups FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Group creators can update their groups" ON public.groups FOR UPDATE 
USING (auth.uid() = created_by);

-- RLS Policies for group_members
CREATE POLICY "Users can view group members for groups they belong to" ON public.group_members FOR SELECT
USING (EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid()));

CREATE POLICY "Group creators can add members" ON public.group_members FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM public.groups WHERE id = group_id AND created_by = auth.uid()));

-- RLS Policies for friendships
CREATE POLICY "Users can view their friendships" ON public.friendships FOR SELECT
USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can create friendships" ON public.friendships FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their friendships" ON public.friendships FOR UPDATE
USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- RLS Policies for expenses
CREATE POLICY "Users can view expenses in their groups or paid by them" ON public.expenses FOR SELECT
USING (
  auth.uid() = paid_by OR 
  EXISTS (SELECT 1 FROM public.group_members WHERE group_id = expenses.group_id AND user_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.expense_participants WHERE expense_id = expenses.id AND user_id = auth.uid())
);

CREATE POLICY "Users can create expenses" ON public.expenses FOR INSERT
WITH CHECK (auth.uid() = paid_by);

CREATE POLICY "Users can update expenses they created" ON public.expenses FOR UPDATE
USING (auth.uid() = paid_by);

CREATE POLICY "Users can delete expenses they created" ON public.expenses FOR DELETE
USING (auth.uid() = paid_by);

-- RLS Policies for expense_participants
CREATE POLICY "Users can view expense participants for accessible expenses" ON public.expense_participants FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.expenses WHERE id = expense_id AND (
    paid_by = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.group_members WHERE group_id = expenses.group_id AND user_id = auth.uid())
  )) OR
  auth.uid() = user_id
);

CREATE POLICY "Expense creators can manage participants" ON public.expense_participants FOR ALL
USING (EXISTS (SELECT 1 FROM public.expenses WHERE id = expense_id AND paid_by = auth.uid()));

-- RLS Policies for settlements
CREATE POLICY "Users can view settlements they're involved in" ON public.settlements FOR SELECT
USING (auth.uid() = from_user OR auth.uid() = to_user);

CREATE POLICY "Users can create settlements" ON public.settlements FOR INSERT
WITH CHECK (auth.uid() = from_user);

-- RLS Policies for activities
CREATE POLICY "Users can view activities for their groups" ON public.activities FOR SELECT
USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM public.group_members WHERE group_id = activities.group_id AND user_id = auth.uid())
);

CREATE POLICY "Users can create activities" ON public.activities FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON public.groups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile when user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create indexes for better performance
CREATE INDEX idx_group_members_group_id ON public.group_members(group_id);
CREATE INDEX idx_group_members_user_id ON public.group_members(user_id);
CREATE INDEX idx_expenses_group_id ON public.expenses(group_id);
CREATE INDEX idx_expenses_paid_by ON public.expenses(paid_by);
CREATE INDEX idx_expense_participants_expense_id ON public.expense_participants(expense_id);
CREATE INDEX idx_expense_participants_user_id ON public.expense_participants(user_id);
CREATE INDEX idx_activities_group_id ON public.activities(group_id);
CREATE INDEX idx_activities_user_id ON public.activities(user_id);