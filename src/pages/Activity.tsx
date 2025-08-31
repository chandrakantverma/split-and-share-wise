import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  Receipt,
  Users,
  Calendar
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

interface ActivityItem {
  id: string;
  description: string;
  amount: number;
  expense_date: string;
  group_name?: string;
  paid_by_name: string;
  activity_type: string;
  created_at: string;
}

export default function Activity() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchActivities();
    }
  }, [user]);

  const fetchActivities = async () => {
    try {
      // Get user's group IDs
      const { data: groupData } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user?.id);

      const groupIds = groupData?.map(item => item.group_id) || [];

      // Fetch expenses from user's groups or paid by user
      const { data: expenses, error } = await supabase
        .from('expenses')
        .select(`
          id,
          description,
          amount,
          expense_date,
          created_at,
          groups(name),
          profiles!expenses_paid_by_fkey(full_name)
        `)
        .or(`paid_by.eq.${user?.id},group_id.in.(${groupIds.join(',')})`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const formattedActivities = expenses?.map(expense => ({
        id: expense.id,
        description: expense.description,
        amount: Number(expense.amount),
        expense_date: expense.expense_date,
        group_name: (expense.groups as any)?.name,
        paid_by_name: (expense.profiles as any)?.full_name || 'Unknown',
        activity_type: 'expense_added',
        created_at: expense.created_at,
      })) || [];

      setActivities(formattedActivities);
    } catch (error) {
      console.error('Error fetching activities:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load activity data",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-20 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Activity</h1>
          <p className="text-muted-foreground">
            View all your expense activities and history.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Recent Activity
          </CardTitle>
          <CardDescription>
            Your expense history across all groups
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activities.length === 0 ? (
              <div className="text-center py-8">
                <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No activity yet</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Start by adding some expenses to your groups
                </p>
                <Button asChild>
                  <Link to="/expenses/new">
                    Add Your First Expense
                  </Link>
                </Button>
              </div>
            ) : (
              activities.map((activity, index) => (
                <div key={activity.id}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium">{activity.description}</p>
                        <Badge variant="outline" className="text-xs">
                          {activity.activity_type === 'expense_added' ? 'Expense' : 'Other'}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {activity.group_name || 'No Group'}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(activity.expense_date)}
                        </div>
                        <span>Paid by {activity.paid_by_name}</span>
                      </div>
                    </div>
                    
                    <div className="text-right ml-4">
                      <div className="text-lg font-semibold">
                        {formatCurrency(activity.amount)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(activity.created_at)}
                      </div>
                    </div>
                  </div>
                  
                  {index < activities.length - 1 && <Separator className="mt-4" />}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 