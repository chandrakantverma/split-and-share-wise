import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Receipt,
  ArrowRight,
  DollarSign
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface Balance {
  total_owed: number;
  total_owing: number;
  net_balance: number;
}

interface RecentExpense {
  id: string;
  description: string;
  amount: number;
  expense_date: string;
  group_name?: string;
  paid_by_name: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [balances, setBalances] = useState<Balance>({ total_owed: 0, total_owing: 0, net_balance: 0 });
  const [recentExpenses, setRecentExpenses] = useState<RecentExpense[]>([]);
  const [groupCount, setGroupCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      // Fetch balances
      const { data: owedData } = await supabase
        .from('expense_participants')
        .select('amount_owed')
        .eq('user_id', user?.id)
        .eq('is_settled', false);

      const { data: owingData } = await supabase
        .from('expense_participants')
        .select('amount_owed, expenses!inner(paid_by)')
        .neq('expenses.paid_by', user?.id)
        .eq('user_id', user?.id)
        .eq('is_settled', false);

      const totalOwed = owedData?.reduce((sum, item) => sum + Number(item.amount_owed), 0) || 0;
      const totalOwing = owingData?.reduce((sum, item) => sum + Number(item.amount_owed), 0) || 0;

      setBalances({
        total_owed: totalOwed,
        total_owing: totalOwing,
        net_balance: totalOwed - totalOwing,
      });

      // Get user's group IDs first
      const userGroupIds = await getUserGroupIds();
      
      // Fetch recent expenses
      const { data: expenses } = await supabase
        .from('expenses')
        .select(`
          id,
          description,
          amount,
          expense_date,
          groups(name),
          profiles!expenses_paid_by_fkey(full_name)
        `)
        .or(`paid_by.eq.${user?.id},group_id.in.(${userGroupIds})`)
        .order('created_at', { ascending: false })
        .limit(5);

      const formattedExpenses = expenses?.map(expense => ({
        id: expense.id,
        description: expense.description,
        amount: Number(expense.amount),
        expense_date: expense.expense_date,
        group_name: (expense.groups as any)?.name,
        paid_by_name: (expense.profiles as any)?.full_name || 'Unknown',
      })) || [];

      setRecentExpenses(formattedExpenses);

      // Fetch group count
      const { count } = await supabase
        .from('group_members')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id);

      setGroupCount(count || 0);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load dashboard data",
      });
    } finally {
      setLoading(false);
    }
  };

  const getUserGroupIds = async () => {
    const { data } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', user?.id);
    
    return data?.map(item => item.group_id).join(',') || '';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's your expense summary.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/settle-up">
              <DollarSign className="h-4 w-4 mr-2" />
              Settle Up
            </Link>
          </Button>
          <Button asChild>
            <Link to="/expenses/new">
              <Plus className="h-4 w-4 mr-2" />
              Add Expense
            </Link>
          </Button>
        </div>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">You are owed</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {formatCurrency(balances.total_owed)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total amount others owe you
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">You owe</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(balances.total_owing)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total amount you owe others
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Balance</CardTitle>
            <Badge variant={balances.net_balance >= 0 ? "default" : "destructive"}>
              {balances.net_balance >= 0 ? "+" : "-"}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              balances.net_balance >= 0 ? 'text-success' : 'text-destructive'
            }`}>
              {formatCurrency(Math.abs(balances.net_balance))}
            </div>
            <p className="text-xs text-muted-foreground">
              {balances.net_balance >= 0 ? 'Overall, you are owed' : 'Overall, you owe'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Groups
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{groupCount}</div>
            <p className="text-muted-foreground">Active groups</p>
            <Button variant="outline" size="sm" className="mt-4" asChild>
              <Link to="/groups">
                View All <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Recent Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentExpenses.length === 0 ? (
                <p className="text-muted-foreground text-sm">No recent expenses</p>
              ) : (
                recentExpenses.slice(0, 3).map((expense) => (
                  <div key={expense.id} className="flex justify-between items-center">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{expense.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {expense.group_name && `${expense.group_name} • `}
                        {expense.paid_by_name}
                      </p>
                    </div>
                    <div className="text-sm font-medium">
                      {formatCurrency(expense.amount)}
                    </div>
                  </div>
                ))
              )}
              {recentExpenses.length > 0 && (
                <>
                  <Separator />
                  <Button variant="outline" size="sm" className="w-full" asChild>
                    <Link to="/activity">
                      View All Activity <ArrowRight className="h-4 w-4 ml-1" />
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}