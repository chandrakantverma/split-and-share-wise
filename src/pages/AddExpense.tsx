import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, Save, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Group {
  id: string;
  name: string;
}

interface GroupMember {
  id: string;
  full_name: string;
  email: string;
}

export default function AddExpense() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    expenseDate: new Date().toISOString().split('T')[0],
    groupId: '',
  });

  useEffect(() => {
    if (user) {
      fetchUserGroups();
    }
  }, [user]);

  useEffect(() => {
    if (selectedGroup) {
      fetchGroupMembers(selectedGroup);
    }
  }, [selectedGroup]);

  const fetchUserGroups = async () => {
    try {
      console.log('Fetching groups for user:', user?.id);
      
      // Test basic database connection first
      const { data: testData, error: testError } = await supabase
        .from('groups')
        .select('count')
        .limit(1);
      
      console.log('Database connection test:', testData, testError);
      
      // First get the group IDs from group_members
      const { data: memberData, error: memberError } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user?.id);

      console.log('Group members data:', memberData);
      console.log('Group members error:', memberError);

      if (memberError) {
        console.error('Error fetching group members:', memberError);
        // Don't throw error, just set empty groups
        setGroups([]);
        return;
      }

      if (!memberData || memberData.length === 0) {
        console.log('No groups found for user');
        setGroups([]);
        return;
      }

      // Then get the group details for each group
      const groupIds = memberData.map(item => item.group_id);
      console.log('Group IDs:', groupIds);
      
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .select('id, name')
        .in('id', groupIds);

      console.log('Groups data:', groupData);
      console.log('Groups error:', groupError);

      if (groupError) {
        console.error('Error fetching groups:', groupError);
        // Don't throw error, just set empty groups
        setGroups([]);
        return;
      }

      const userGroups: Group[] = (groupData || []).map(group => ({
        id: group.id,
        name: group.name
      }));
      
      console.log('Formatted groups:', userGroups);
      setGroups(userGroups);
    } catch (error) {
      console.error('Error fetching groups:', error);
      // Don't show error toast, just set empty groups
      setGroups([]);
    }
  };

  const fetchGroupMembers = async (groupId: string) => {
    try {
      // First get the user IDs from group_members
      const { data: memberData, error: memberError } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', groupId);

      if (memberError) throw memberError;

      if (!memberData || memberData.length === 0) {
        setGroupMembers([]);
        return;
      }

      // Then get the profile details for each user
      const userIds = memberData.map(item => item.user_id);
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      if (profileError) throw profileError;

      const members: GroupMember[] = (profileData || []).map(profile => ({
        id: profile.id,
        full_name: profile.full_name,
        email: profile.email
      }));
      
      setGroupMembers(members);
      
      // Auto-select all members including current user
      const memberIds = members.map(member => member.id);
      setSelectedParticipants(memberIds);
    } catch (error) {
      console.error('Error fetching group members:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load group members",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedGroup || selectedParticipants.length === 0 || !formData.description || !formData.amount) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please fill in all required fields and select participants",
      });
      return;
    }

    setLoading(true);

    try {
      const amount = parseFloat(formData.amount);
      const participantCount = selectedParticipants.length;
      const amountPerPerson = amount / participantCount;

      // Create the expense
      const { data: expense, error: expenseError } = await supabase
        .from('expenses')
        .insert({
          description: formData.description,
          amount: amount,
          expense_date: formData.expenseDate,
          group_id: selectedGroup,
          paid_by: user?.id,
        })
        .select()
        .single();

      if (expenseError) throw expenseError;

      // Create expense participants
      const participants = selectedParticipants.map(participantId => ({
        expense_id: expense.id,
        user_id: participantId,
        amount_owed: amountPerPerson,
        is_settled: false,
      }));

      const { error: participantsError } = await supabase
        .from('expense_participants')
        .insert(participants);

      if (participantsError) throw participantsError;

      toast({
        title: "Success",
        description: "Expense added successfully!",
      });

      navigate('/');
    } catch (error) {
      console.error('Error adding expense:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add expense. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGroupChange = (groupId: string) => {
    setSelectedGroup(groupId);
    setFormData(prev => ({ ...prev, groupId }));
  };

  const toggleParticipant = (participantId: string) => {
    setSelectedParticipants(prev => 
      prev.includes(participantId)
        ? prev.filter(id => id !== participantId)
        : [...prev, participantId]
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Add Expense</h1>
          <p className="text-muted-foreground">
            Create a new expense and split it with your group members.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Expense Details</CardTitle>
          <CardDescription>
            Fill in the expense information and select participants to split the cost.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Input
                  id="description"
                  placeholder="e.g., Dinner at restaurant"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount (₹) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="date">Expense Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.expenseDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, expenseDate: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="group">Group *</Label>
                <Select value={selectedGroup} onValueChange={handleGroupChange} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a group" />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {groups.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No groups available. Create a group first.
                  </p>
                )}
              </div>
            </div>

            {groups.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No groups found</p>
                <p className="text-sm text-muted-foreground mb-4">
                  You need to create or join a group before adding expenses
                </p>
                <div className="flex gap-2 justify-center">
                  <Button asChild>
                    <Link to="/groups">
                      Go to Groups
                    </Link>
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/groups')}>
                    Create Group
                  </Button>
                </div>
              </div>
            ) : selectedGroup && groupMembers.length > 0 ? (
              <div className="space-y-4">
                <div>
                  <Label>Participants *</Label>
                  <p className="text-sm text-muted-foreground">
                    Select who should split this expense (amount will be divided equally)
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {groupMembers.map((member) => (
                    <div key={member.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={member.id}
                        checked={selectedParticipants.includes(member.id)}
                        onCheckedChange={() => toggleParticipant(member.id)}
                      />
                      <Label htmlFor={member.id} className="text-sm font-normal">
                        {member.full_name} {member.id === user?.id && '(You)'}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            ) : selectedGroup && groupMembers.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-muted-foreground">Loading group members...</p>
              </div>
            ) : null}

            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/')}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  "Saving..."
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Expense
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 