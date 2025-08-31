import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  CheckCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Settlement {
  id: string;
  from_user: string;
  to_user: string;
  amount: number;
  description: string;
  settled_at: string;
  group_id?: string;
}

interface Debt {
  user_id: string;
  full_name: string;
  email: string;
  amount: number;
  group_name?: string;
}

export default function SettleUp() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [settling, setSettling] = useState(false);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [showSettleForm, setShowSettleForm] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [settleAmount, setSettleAmount] = useState('');
  const [settleDescription, setSettleDescription] = useState('');

  useEffect(() => {
    if (user) {
      fetchDebtsAndSettlements();
    }
  }, [user]);

  const fetchDebtsAndSettlements = async () => {
    try {
      // Get user's group IDs
      const { data: groupData } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user?.id);

      const groupIds = groupData?.map(item => item.group_id) || [];

      // Fetch debts (expenses where user owes money)
      const { data: debtData, error: debtError } = await supabase
        .from('expense_participants')
        .select('amount_owed, expense_id')
        .eq('user_id', user?.id)
        .eq('is_settled', false);

      if (debtError) throw debtError;

      // Get expense details for debts
      const expenseIds = debtData?.map(item => item.expense_id) || [];
      const { data: expenseData, error: expenseError } = await supabase
        .from('expenses')
        .select('id, paid_by, group_id, groups(name)')
        .in('id', expenseIds)
        .neq('paid_by', user?.id);

      if (expenseError) throw expenseError;

      // Get payer profiles
      const payerIds = expenseData?.map(item => item.paid_by) || [];
      const { data: payerData, error: payerError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', payerIds);

      if (payerError) throw payerError;

      // Group debts by person
      const debtMap = new Map<string, Debt>();
      
      debtData?.forEach(debtItem => {
        const expense = expenseData?.find(e => e.id === debtItem.expense_id);
        if (!expense) return;
        
        const payer = payerData?.find(p => p.id === expense.paid_by);
        if (!payer) return;
        
        const groupName = expense.groups?.name;
        const amount = Number(debtItem.amount_owed);
        
        if (debtMap.has(payer.id)) {
          debtMap.get(payer.id)!.amount += amount;
        } else {
          debtMap.set(payer.id, {
            user_id: payer.id,
            full_name: payer.full_name,
            email: payer.email,
            amount: amount,
            group_name: groupName
          });
        }
      });

      // Fetch debts owed to user
      const { data: owedData, error: owedError } = await supabase
        .from('expense_participants')
        .select('amount_owed, expense_id, user_id')
        .eq('is_settled', false);

      if (owedError) throw owedError;

      // Get expenses where user is the payer
      const userExpenseIds = owedData?.map(item => item.expense_id) || [];
      const { data: userExpenseData, error: userExpenseError } = await supabase
        .from('expenses')
        .select('id, group_id, groups(name)')
        .in('id', userExpenseIds)
        .eq('paid_by', user?.id);

      if (userExpenseError) throw userExpenseError;

      // Get participant profiles
      const participantIds = owedData?.map(item => item.user_id) || [];
      const { data: participantData, error: participantError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', participantIds);

      if (participantError) throw participantError;

      if (owedError) throw owedError;

      // Add debts owed to user (negative amounts)
      owedData?.forEach(owedItem => {
        const expense = userExpenseData?.find(e => e.id === owedItem.expense_id);
        if (!expense) return;
        
        const participant = participantData?.find(p => p.id === owedItem.user_id);
        if (!participant) return;
        
        const groupName = expense.groups?.name;
        const amount = -Number(owedItem.amount_owed); // Negative because user is owed money
        
        if (debtMap.has(participant.id)) {
          debtMap.get(participant.id)!.amount += amount;
        } else {
          debtMap.set(participant.id, {
            user_id: participant.id,
            full_name: participant.full_name,
            email: participant.email,
            amount: amount,
            group_name: groupName
          });
        }
      });

      // Convert map to array and filter out settled debts
      const debtsList = Array.from(debtMap.values()).filter(debt => debt.amount !== 0);
      setDebts(debtsList);

      // Fetch settlements
      const { data: settlementData, error: settlementError } = await supabase
        .from('settlements')
        .select(`
          *,
          from_profiles:profiles!settlements_from_user_fkey(full_name),
          to_profiles:profiles!settlements_to_user_fkey(full_name)
        `)
        .or(`from_user.eq.${user?.id},to_user.eq.${user?.id}`)
        .order('settled_at', { ascending: false })
        .limit(20);

      if (settlementError) throw settlementError;

      const settlementsList = settlementData?.map(item => ({
        id: item.id,
        from_user: item.from_user,
        to_user: item.to_user,
        amount: Number(item.amount),
        description: item.description || '',
        settled_at: item.settled_at,
        group_id: item.group_id
      })) || [];

      setSettlements(settlementsList);
    } catch (error) {
      console.error('Error fetching debts and settlements:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load debt information",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSettle = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDebt || !settleAmount || !settleDescription.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please fill in all required fields",
      });
      return;
    }

    const amount = parseFloat(settleAmount);
    if (amount <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid Amount",
        description: "Amount must be greater than 0",
      });
      return;
    }

    setSettling(true);

    try {
      // Create settlement record
      const { error: settlementError } = await supabase
        .from('settlements')
        .insert({
          from_user: user?.id,
          to_user: selectedDebt.user_id,
          amount: amount,
          description: settleDescription.trim(),
          group_id: selectedDebt.group_name ? undefined : null // For now, only group settlements
        });

      if (settlementError) throw settlementError;

      toast({
        title: "Payment Recorded",
        description: `Payment of ₹${amount} recorded successfully`,
      });

      // Reset form
      setSelectedDebt(null);
      setSettleAmount('');
      setSettleDescription('');
      setShowSettleForm(false);

      // Refresh data
      fetchDebtsAndSettlements();
    } catch (error) {
      console.error('Error recording settlement:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to record payment. Please try again.",
      });
    } finally {
      setSettling(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(Math.abs(amount));
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
            {[1, 2, 3].map(i => (
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
          <h1 className="text-3xl font-bold">Settle Up</h1>
          <p className="text-muted-foreground">
            Record payments and settle debts with friends and group members.
          </p>
        </div>
      </div>

      {/* Current Balances */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Current Balances
          </CardTitle>
          <CardDescription>
            Overview of what you owe and what's owed to you
          </CardDescription>
        </CardHeader>
        <CardContent>
          {debts.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-success mx-auto mb-4" />
              <p className="text-muted-foreground">All settled up!</p>
              <p className="text-sm text-muted-foreground">
                You have no outstanding debts or amounts owed to you.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {debts.map((debt, index) => (
                <div key={debt.user_id}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium">
                          {debt.full_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{debt.full_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {debt.email}
                          {debt.group_name && ` • ${debt.group_name}`}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className={`flex items-center gap-2 ${
                        debt.amount > 0 ? 'text-success' : 'text-destructive'
                      }`}>
                        {debt.amount > 0 ? (
                          <TrendingUp className="h-4 w-4" />
                        ) : (
                          <TrendingDown className="h-4 w-4" />
                        )}
                        <span className="font-medium">
                          {debt.amount > 0 ? `+${formatCurrency(debt.amount)}` : `-${formatCurrency(debt.amount)}`}
                        </span>
                      </div>
                      <Badge variant="outline" className="text-xs mt-1">
                        {debt.amount > 0 ? 'You are owed' : 'You owe'}
                      </Badge>
                    </div>
                  </div>
                  
                  {debt.amount < 0 && (
                    <Button
                      size="sm"
                      className="mt-3"
                      onClick={() => {
                        setSelectedDebt(debt);
                        setSettleAmount(Math.abs(debt.amount).toString());
                        setShowSettleForm(true);
                      }}
                    >
                      Settle Up
                    </Button>
                  )}
                  
                  {index < debts.length - 1 && <Separator className="mt-4" />}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Settlement Form */}
      {showSettleForm && selectedDebt && (
        <Card>
          <CardHeader>
            <CardTitle>Record Payment</CardTitle>
            <CardDescription>
              Record a payment to {selectedDebt.full_name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSettle} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (₹)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="e.g., Cash payment, Bank transfer, etc."
                  value={settleDescription}
                  onChange={(e) => setSettleDescription(e.target.value)}
                  required
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowSettleForm(false);
                    setSelectedDebt(null);
                    setSettleAmount('');
                    setSettleDescription('');
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={settling}>
                  {settling ? 'Recording...' : 'Record Payment'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Recent Settlements */}
      {settlements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Recent Settlements
            </CardTitle>
            <CardDescription>
              Your recent payment history
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {settlements.map((settlement, index) => (
                <div key={settlement.id}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {settlement.from_user === user?.id ? 'You paid' : 'You received'} 
                        {settlement.from_user === user?.id 
                          ? ` ${settlements.find(s => s.id === settlement.id)?.to_user || 'Unknown'}`
                          : ` ${settlements.find(s => s.id === settlement.id)?.from_user || 'Unknown'}`
                        }
                      </p>
                      {settlement.description && (
                        <p className="text-sm text-muted-foreground">{settlement.description}</p>
                      )}
                    </div>
                    
                    <div className="text-right">
                      <div className="font-medium">
                        {formatCurrency(settlement.amount)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(settlement.settled_at)}
                      </div>
                    </div>
                  </div>
                  
                  {index < settlements.length - 1 && <Separator className="mt-4" />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 