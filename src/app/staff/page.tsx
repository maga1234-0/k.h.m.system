
"use client"

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  UserPlus, 
  Mail, 
  Phone, 
  Shield, 
  Calendar,
  MessageSquare,
  MoreVertical,
  Loader2,
  Send,
  Clock,
  Edit2,
  Trash2,
  RefreshCw
} from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { 
  useFirestore, 
  useCollection, 
  useMemoFirebase, 
  useUser, 
  setDocumentNonBlocking,
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking
} from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";

export default function StaffPage() {
  const { user, isUserLoading: isAuthLoading } = useUser();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [isMessageOpen, setIsMessageOpen] = useState(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  const [messageText, setMessageText] = useState("");
  const [scheduleData, setScheduleData] = useState({
    date: "",
    shift: "Morning"
  });

  const [newStaff, setNewStaff] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    role: "Receptionist",
    status: "On Duty"
  });

  const [editStaffData, setEditStaffData] = useState<any>(null);

  const firestore = useFirestore();
  const staffCollection = useMemoFirebase(() => user ? collection(firestore, 'staff') : null, [firestore, user]);
  const { data: staff, isLoading } = useCollection(staffCollection);

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push('/login');
    }
  }, [user, isAuthLoading, router]);

  // Fix hydration mismatch by setting initial date on client mount
  useEffect(() => {
    setScheduleData(prev => ({
      ...prev,
      date: new Date().toISOString().split('T')[0]
    }));
  }, []);

  const handleAddStaff = () => {
    if (!newStaff.firstName || !newStaff.lastName || !newStaff.email || !staffCollection) return;

    const staffId = doc(staffCollection).id;
    const staffRef = doc(firestore, 'staff', staffId);

    const staffData = {
      ...newStaff,
      id: staffId,
      avatar: staffId,
      createdAt: new Date().toISOString()
    };

    setDocumentNonBlocking(staffRef, staffData, { merge: true });
    
    setIsAddDialogOpen(false);
    setNewStaff({
      firstName: "",
      lastName: "",
      email: "",
      phoneNumber: "",
      role: "Receptionist",
      status: "On Duty"
    });

    toast({
      title: "Staff Member Added",
      description: `${staffData.firstName} ${staffData.lastName} has been added to the team.`,
    });
  };

  const handleUpdateStaff = () => {
    if (!editStaffData || !editStaffData.id) return;

    const staffRef = doc(firestore, 'staff', editStaffData.id);
    updateDocumentNonBlocking(staffRef, editStaffData);
    
    setIsEditDialogOpen(false);
    toast({
      title: "Profile Updated",
      description: `Details for ${editStaffData.firstName} have been saved.`,
    });
  };

  const handleDeleteStaff = (member: any) => {
    const staffRef = doc(firestore, 'staff', member.id);
    deleteDocumentNonBlocking(staffRef);
    toast({
      variant: "destructive",
      title: "Member Removed",
      description: `${member.firstName} ${member.lastName} has been removed from the directory.`,
    });
  };

  const handleSendMessage = () => {
    if (!messageText || !selectedStaff) return;
    
    const phone = selectedStaff.phoneNumber?.replace(/\D/g, '');

    if (phone) {
      const encodedMessage = encodeURIComponent(messageText);
      const whatsappUrl = `https://wa.me/${phone}?text=${encodedMessage}`;
      window.open(whatsappUrl, '_blank');

      toast({
        title: "WhatsApp Redirect",
        description: `Opening chat with ${selectedStaff.firstName}...`,
      });
    } else {
      toast({
        variant: "destructive",
        title: "No Phone Registered",
        description: `Could not find a valid phone number for ${selectedStaff.firstName}.`,
      });
    }
    
    setIsMessageOpen(false);
    setMessageText("");
  };

  const handleUpdateSchedule = () => {
    if (!selectedStaff) return;
    
    toast({
      title: "Schedule Updated",
      description: `${selectedStaff.firstName} has been assigned the ${scheduleData.shift} shift for ${scheduleData.date}.`,
    });
    
    setIsScheduleOpen(false);
  };

  if (isAuthLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const filteredStaff = staff?.filter(member => 
    member.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    member.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.role?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-screen w-full">
      <AppSidebar />
      <SidebarInset className="flex flex-col overflow-auto bg-background">
        <header className="flex h-16 items-center border-b px-6 justify-between bg-background sticky top-0 z-10">
          <div className="flex items-center">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mx-4 h-6" />
            <h1 className="font-headline font-semibold text-xl">Staff Management</h1>
          </div>
          
          <Button onClick={() => setIsAddDialogOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
            <UserPlus className="h-4 w-4" /> Add Member
          </Button>
        </header>

        <main className="p-6 space-y-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search staff members..." 
                className="pl-9 bg-background" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className="px-3 py-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                {staff?.filter(s => s.status === 'On Duty').length || 0} On Duty
              </Badge>
              <Badge variant="outline" className="px-3 py-1 bg-amber-500/10 text-amber-600 border-amber-500/20">
                {staff?.filter(s => s.status === 'On Break').length || 0} On Break
              </Badge>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredStaff?.map((member) => (
                <Card key={member.id} className="border-none shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="absolute top-2 right-2 z-20">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem onClick={() => {
                        setEditStaffData({...member});
                        setIsEditDialogOpen(true);
                      }}>
                        <Edit2 className="h-4 w-4 mr-2" /> Edit Member
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        const newStatus = member.status === 'On Duty' ? 'On Break' : 'On Duty';
                        const staffRef = doc(firestore, 'staff', member.id);
                        updateDocumentNonBlocking(staffRef, { status: newStatus });
                        toast({
                          title: "Status Changed",
                          description: `${member.firstName} is now ${newStatus}.`,
                        });
                      }}>
                        <RefreshCw className="h-4 w-4 mr-2" /> Toggle Status
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteStaff(member)}>
                        <Trash2 className="h-4 w-4 mr-2" /> Remove Member
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <CardHeader className="flex flex-row items-center gap-4">
                    <Avatar className="h-16 w-16 border-2 border-primary/10">
                      <AvatarImage src={`https://picsum.photos/seed/${member.id}/200`} />
                      <AvatarFallback>{member.firstName?.charAt(0)}{member.lastName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <CardTitle className="text-lg font-headline">{member.firstName} {member.lastName}</CardTitle>
                      <CardDescription className="flex items-center gap-1 font-medium text-primary">
                        <Shield className="h-3 w-3" /> {member.role || 'Staff'}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <Badge variant={member.status === 'On Duty' ? 'default' : member.status === 'On Break' ? 'secondary' : 'outline'} className="text-[10px]">
                        {member.status || 'Offline'}
                      </Badge>
                      <div className="flex items-center text-xs text-muted-foreground gap-1">
                        <Calendar className="h-3 w-3" /> Shift: 08:00 - 16:00
                      </div>
                    </div>
                    
                    <div className="space-y-2 pt-2 border-t">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-3 w-3" /> {member.email}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-3 w-3" /> {member.phoneNumber || 'N/A'}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 gap-2"
                        onClick={() => {
                          setSelectedStaff(member);
                          setIsMessageOpen(true);
                        }}
                      >
                        <MessageSquare className="h-3 w-3" /> WhatsApp
                      </Button>
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => {
                          setSelectedStaff(member);
                          setIsScheduleOpen(true);
                        }}
                      >
                        Schedule
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>

        {/* Add Staff Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add Staff Member</DialogTitle>
              <DialogDescription>Create a new profile for a hotel staff member.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input 
                    id="firstName" 
                    value={newStaff.firstName}
                    onChange={(e) => setNewStaff({...newStaff, firstName: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input 
                    id="lastName" 
                    value={newStaff.lastName}
                    onChange={(e) => setNewStaff({...newStaff, lastName: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input 
                  id="email" 
                  type="email"
                  value={newStaff.email}
                  onChange={(e) => setNewStaff({...newStaff, email: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number (International format)</Label>
                <Input 
                  id="phone" 
                  placeholder="e.g. 243980453935"
                  value={newStaff.phoneNumber}
                  onChange={(e) => setNewStaff({...newStaff, phoneNumber: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select 
                  value={newStaff.role} 
                  onValueChange={(val) => setNewStaff({...newStaff, role: val})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Manager">Manager</SelectItem>
                    <SelectItem value="Receptionist">Receptionist</SelectItem>
                    <SelectItem value="Housekeeping">Housekeeping</SelectItem>
                    <SelectItem value="Concierge">Concierge</SelectItem>
                    <SelectItem value="Security">Security</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAddStaff} disabled={!newStaff.firstName || !newStaff.lastName || !newStaff.email}>Add Member</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Staff Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit Member Details</DialogTitle>
              <DialogDescription>Update profile information for your employee.</DialogDescription>
            </DialogHeader>
            {editStaffData && (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="editFirstName">First Name</Label>
                    <Input 
                      id="editFirstName" 
                      value={editStaffData.firstName}
                      onChange={(e) => setEditStaffData({...editStaffData, firstName: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editLastName">Last Name</Label>
                    <Input 
                      id="editLastName" 
                      value={editStaffData.lastName}
                      onChange={(e) => setEditStaffData({...editStaffData, lastName: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editEmail">Email Address</Label>
                  <Input 
                    id="editEmail" 
                    type="email"
                    value={editStaffData.email}
                    onChange={(e) => setEditStaffData({...editStaffData, email: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editPhone">Phone Number</Label>
                  <Input 
                    id="editPhone" 
                    value={editStaffData.phoneNumber}
                    onChange={(e) => setEditStaffData({...editStaffData, phoneNumber: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editRole">Role</Label>
                  <Select 
                    value={editStaffData.role} 
                    onValueChange={(val) => setEditStaffData({...editStaffData, role: val})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Manager">Manager</SelectItem>
                      <SelectItem value="Receptionist">Receptionist</SelectItem>
                      <SelectItem value="Housekeeping">Housekeeping</SelectItem>
                      <SelectItem value="Concierge">Concierge</SelectItem>
                      <SelectItem value="Security">Security</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleUpdateStaff}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Message Dialog */}
        <Dialog open={isMessageOpen} onOpenChange={setIsMessageOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" /> 
                WhatsApp {selectedStaff?.firstName}
              </DialogTitle>
              <DialogDescription>
                Send a direct message to this staff member's WhatsApp account.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Textarea 
                placeholder="Type your WhatsApp message here..." 
                className="min-h-[120px]"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsMessageOpen(false)}>Cancel</Button>
              <Button onClick={handleSendMessage} disabled={!messageText} className="gap-2">
                <Send className="h-4 w-4" /> Send via WhatsApp
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Schedule Dialog */}
        <Dialog open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" /> 
                Assign Shift: {selectedStaff?.firstName}
              </DialogTitle>
              <DialogDescription>
                Assign or modify the work schedule for this employee.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="shiftDate">Date</Label>
                <Input 
                  id="shiftDate" 
                  type="date" 
                  value={scheduleData.date}
                  onChange={(e) => setScheduleData({...scheduleData, date: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shiftType">Shift Type</Label>
                <Select 
                  value={scheduleData.shift} 
                  onValueChange={(val) => setScheduleData({...scheduleData, shift: val})}
                >
                  <SelectTrigger id="shiftType">
                    <SelectValue placeholder="Select shift" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Morning">Morning (08:00 - 16:00)</SelectItem>
                    <SelectItem value="Afternoon">Afternoon (16:00 - 00:00)</SelectItem>
                    <SelectItem value="Night">Night (00:00 - 08:00)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsScheduleOpen(false)}>Cancel</Button>
              <Button onClick={handleUpdateSchedule}>Confirm Assignment</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </div>
  );
}
