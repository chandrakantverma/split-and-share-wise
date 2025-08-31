import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  Search,
  UserPlus,
  Users,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

interface Friend {
  id: string;
  full_name: string;
  email: string;
  balance: number;
  status: 'pending' | 'accepted';
}

export default function Friends() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [newFriendEmail, setNewFriendEmail] = useState('');
  const [addingFriend, setAddingFriend] = useState(false);

  useEffect(() => {
    if (user) {
      fetchFriends();
    }
  }, [user]);

  const fetchFriends = async () => {
    try {
      // Get all friendships where user is involved
      const { data: friendships, error } = await supabase
        .from('friendships')
        .select('*')
        .or(`user_id.eq.${user?.id},friend_id.eq.${user?.id}`)
        .eq('status', 'accepted');

      if (error) throw error;

      if (!friendships || friendships.length === 0) {
        setFriends([]);
        return;
      }

      // Get all user IDs involved in friendships
      const userIds = new Set<string>();
      friendships.forEach(friendship => {
        if (friendship.user_id !== user?.id) userIds.add(friendship.user_id);
        if (friendship.friend_id !== user?.id) userIds.add(friendship.friend_id);
      });

      // Get profile details for all users
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', Array.from(userIds));

      if (profileError) throw profileError;

      // Create a map for quick lookup
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      const friendsList: Friend[] = friendships.map(friendship => {
        const friendId = friendship.user_id === user?.id ? friendship.friend_id : friendship.user_id;
        const profile = profileMap.get(friendId);
        
        return {
          id: friendId,
          full_name: profile?.full_name || 'Unknown',
          email: profile?.email || 'Unknown',
          balance: 0, // TODO: Calculate actual balance
          status: friendship.status as 'pending' | 'accepted'
        };
      });

      setFriends(friendsList);
    } catch (error) {
      console.error('Error fetching friends:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load friends",
      });
    } finally {
      setLoading(false);
    }
  };

  const addFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newFriendEmail.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please enter a valid email address",
      });
      return;
    }

    setAddingFriend(true);

    try {
      // First check if the user exists
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', newFriendEmail.trim())
        .single();

      if (profileError || !profileData) {
        toast({
          variant: "destructive",
          title: "User Not Found",
          description: "No user found with this email address",
        });
        return;
      }

      if (profileData.id === user?.id) {
        toast({
          variant: "destructive",
          title: "Invalid Action",
          description: "You cannot add yourself as a friend",
        });
        return;
      }

      // Check if friendship already exists
      const { data: existingFriendship } = await supabase
        .from('friendships')
        .select('*')
        .or(`and(user_id.eq.${user?.id},friend_id.eq.${profileData.id}),and(user_id.eq.${profileData.id},friend_id.eq.${user?.id})`)
        .single();

      if (existingFriendship) {
        toast({
          variant: "destructive",
          title: "Already Friends",
          description: "You are already friends with this user",
        });
        return;
      }

      // Create friendship request
      const { error: friendshipError } = await supabase
        .from('friendships')
        .insert({
          user_id: user?.id,
          friend_id: profileData.id,
          status: 'pending'
        });

      if (friendshipError) throw friendshipError;

      toast({
        title: "Friend Request Sent",
        description: `Friend request sent to ${profileData.email}`,
      });

      setNewFriendEmail('');
      setShowAddFriend(false);
      fetchFriends(); // Refresh the list
    } catch (error) {
      console.error('Error adding friend:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add friend. Please try again.",
      });
    } finally {
      setAddingFriend(false);
    }
  };

  const filteredFriends = friends.filter(friend =>
    friend.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    friend.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(Math.abs(amount));
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Friends</h1>
          <p className="text-muted-foreground">
            Manage your friends and track balances.
          </p>
        </div>
        <Button onClick={() => setShowAddFriend(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add Friend
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search friends..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Add Friend Modal */}
      {showAddFriend && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Friend</CardTitle>
            <CardDescription>
              Send a friend request by entering their email address
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={addFriend} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Friend's Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="friend@example.com"
                  value={newFriendEmail}
                  onChange={(e) => setNewFriendEmail(e.target.value)}
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAddFriend(false);
                    setNewFriendEmail('');
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={addingFriend}>
                  {addingFriend ? 'Sending...' : 'Send Request'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Friends List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Your Friends ({filteredFriends.length})
          </CardTitle>
          <CardDescription>
            View your friends and current balances
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredFriends.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchQuery ? 'No friends found matching your search' : 'No friends yet'}
              </p>
              {!searchQuery && (
                <p className="text-sm text-muted-foreground mb-4">
                  Start by adding some friends to track shared expenses
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredFriends.map((friend, index) => (
                <div key={friend.id}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium">
                          {friend.full_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{friend.full_name}</p>
                        <p className="text-sm text-muted-foreground">{friend.email}</p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className={`flex items-center gap-2 ${
                        friend.balance > 0 ? 'text-success' : 
                        friend.balance < 0 ? 'text-destructive' : 'text-muted-foreground'
                      }`}>
                        {friend.balance > 0 ? (
                          <TrendingUp className="h-4 w-4" />
                        ) : friend.balance < 0 ? (
                          <TrendingDown className="h-4 w-4" />
                        ) : null}
                        <span className="font-medium">
                          {friend.balance > 0 ? `+${formatCurrency(friend.balance)}` :
                           friend.balance < 0 ? `-${formatCurrency(friend.balance)}` :
                           'Settled up'}
                        </span>
                      </div>
                      <Badge variant="outline" className="text-xs mt-1">
                        {friend.balance > 0 ? 'You are owed' :
                         friend.balance < 0 ? 'You owe' : 'Even'}
                      </Badge>
                    </div>
                  </div>
                  
                  {index < filteredFriends.length - 1 && <Separator className="mt-4" />}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 