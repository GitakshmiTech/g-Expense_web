import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { UserCircle, Landmark, Bell, ShieldCheck, History, Save, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { PageHeader } from '../../components/common/PageHeader';
import { DataTable } from '../../components/tables/DataTable';
import { setCredentials } from '../../redux/authSlice';
import { api } from '../../services/platform.service';

export const Settings = () => {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  
  const user = useSelector((state) => state.auth.user);
  const accessToken = useSelector((state) => state.auth.accessToken);

  const [activeTab, setActiveTab] = useState('profile');
  const [successMessage, setSuccessMessage] = useState('');

  // Form states
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [department, setDepartment] = useState(user?.department || '');
  const [designation, setDesignation] = useState(user?.designation || '');

  // Bank Info
  const [bankName, setBankName] = useState(user?.bankDetails?.bankName || '');
  const [accountNumber, setAccountNumber] = useState(user?.bankDetails?.accountNumber || '');
  const [ifscCode, setIfscCode] = useState(user?.bankDetails?.ifscCode || '');

  // Notification Preferences
  const [emailNotif, setEmailNotif] = useState(user?.notificationPreferences?.email !== false);
  const [pushNotif, setPushNotif] = useState(user?.notificationPreferences?.push !== false);

  // Password Update
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Audit Logs Query
  const { data: auditLogs = [] } = useQuery({ 
    queryKey: ['audit'], 
    queryFn: api.audit, 
    retry: false,
    enabled: activeTab === 'audit'
  });

  // Profile Update Mutation
  const updateProfile = useMutation({
    mutationFn: (payload) => api.updateUser(user._id, payload),
    onSuccess: (data) => {
      dispatch(setCredentials({ user: data, accessToken }));
      setSuccessMessage('Settings updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Failed to update profile settings');
    }
  });

  const handleSaveProfile = (e) => {
    e.preventDefault();
    updateProfile.mutate({
      name,
      email,
      phone,
      department,
      designation
    });
  };

  const handleSaveBank = (e) => {
    e.preventDefault();
    updateProfile.mutate({
      bankDetails: {
        bankName,
        accountNumber,
        ifscCode
      }
    });
  };

  const handleSaveNotifications = () => {
    updateProfile.mutate({
      notificationPreferences: {
        email: emailNotif,
        push: pushNotif
      }
    });
  };

  const handleUpdatePassword = (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert('New passwords do not match');
      return;
    }
    // Simulated Password Change API
    setSuccessMessage('Password changed successfully (mock)!');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  return (
    <>
      <PageHeader 
        title="Profile & Settings" 
        description="Manage your contact details, settlement bank accounts, notification configurations, and security credentials." 
      />

      {successMessage && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-950/15 dark:text-emerald-400">
          {successMessage}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-[240px_1fr] mt-2">
        {/* Settings Navigation Panel */}
        <aside className="panel rounded-2xl p-3 flex flex-col space-y-1 h-fit">
          {[
            { id: 'profile', label: 'My Profile', icon: UserCircle },
            { id: 'bank', label: 'Bank Details', icon: Landmark },
            { id: 'security', label: 'Security & Password', icon: ShieldCheck },
            { id: 'notifications', label: 'Notifications', icon: Bell },
            { id: 'audit', label: 'Activity Audit Log', icon: History }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 w-full px-4 py-3 text-sm font-semibold rounded-xl transition-all ${
                  activeTab === tab.id
                    ? 'bg-brand-50 text-brand-700 dark:bg-slate-900 dark:text-brand-100 shadow-sm'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:hover:bg-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="h-4.5 w-4.5 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </aside>

        {/* Tab Contents */}
        <main className="panel rounded-2xl p-6">
          {/* TAB 1: PROFILE */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">Personal Information</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Full Name</label>
                  <input className="input w-full" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Email Address</label>
                  <input className="input w-full" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Mobile Number</label>
                  <input className="input w-full" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 XXXXX XXXXX" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Department</label>
                  <input className="input w-full bg-slate-50 dark:bg-slate-800" value={department} onChange={(e) => setDepartment(e.target.value)} disabled />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Designation</label>
                  <input className="input w-full bg-slate-50 dark:bg-slate-800" value={designation} onChange={(e) => setDesignation(e.target.value)} disabled />
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <button type="submit" className="btn-primary flex items-center gap-2" disabled={updateProfile.isPending}>
                  <Save className="h-4 w-4" /> Save Profile Details
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: BANK DETAILS */}
          {activeTab === 'bank' && (
            <form onSubmit={handleSaveBank} className="space-y-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">Settlement Bank Account</h3>
              <p className="text-xs text-slate-500 mb-3">Please supply the direct deposit details. Reimbursed funds are wired here.</p>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Bank Name</label>
                  <input 
                    className="input w-full" 
                    placeholder="e.g. Axis Bank"
                    value={bankName} 
                    onChange={(e) => setBankName(e.target.value)} 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Account Number</label>
                  <input 
                    className="input w-full font-mono" 
                    placeholder="e.g. 9150100XXXXXXX"
                    value={accountNumber} 
                    onChange={(e) => setAccountNumber(e.target.value)} 
                    required 
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">IFSC Code</label>
                  <input 
                    className="input w-full font-mono uppercase" 
                    placeholder="e.g. UTIB0000293"
                    value={ifscCode} 
                    onChange={(e) => setIfscCode(e.target.value)} 
                    required 
                  />
                </div>
              </div>
              
              <div className="flex justify-end pt-4">
                <button type="submit" className="btn-primary flex items-center gap-2" disabled={updateProfile.isPending}>
                  <Save className="h-4 w-4" /> Update Bank Info
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: SECURITY */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">Change Password</h3>
                <div className="space-y-3 max-w-md">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Current Password</label>
                    <input className="input w-full" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">New Password</label>
                    <input className="input w-full" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Confirm New Password</label>
                    <input className="input w-full" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                  </div>
                </div>
                <div className="pt-2">
                  <button type="submit" className="btn-primary flex items-center gap-2">
                    <Save className="h-4 w-4" /> Update Password
                  </button>
                </div>
              </form>

              <section className="border-t border-slate-100 dark:border-slate-800 pt-5 space-y-3">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">Multi-Factor Authentication (MFA)</h4>
                <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/30">
                  <div className="space-y-1">
                    <p className="font-semibold text-sm dark:text-white">Authenticator App MFA</p>
                    <p className="text-xs text-slate-500 max-w-md">Secure your account using standard TOTP generators (Google Authenticator, Microsoft Authenticator).</p>
                  </div>
                  <button className="btn-secondary text-xs py-1.5 px-3">Set Up MFA</button>
                </div>
              </section>
            </div>
          )}

          {/* TAB 4: NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div className="space-y-5">
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">Notification Configurations</h3>
              <p className="text-xs text-slate-500 mb-4">Choose which notifications you want to receive regarding your expense submissions and payouts.</p>
              
              <div className="space-y-4">
                {[
                  {
                    id: 'email',
                    title: 'Email Alerts',
                    desc: 'Receive workflow status progress updates, rejection reports details, and payment settlements via email.',
                    checked: emailNotif,
                    onChange: (e) => setEmailNotif(e.target.checked)
                  },
                  {
                    id: 'push',
                    title: 'In-App & Push Notifications',
                    desc: 'Real-time alert messages in the sidebar and dashboard feed for approval transitions.',
                    checked: pushNotif,
                    onChange: (e) => setPushNotif(e.target.checked)
                  }
                ].map((pref) => (
                  <label key={pref.id} className="flex items-start gap-4 rounded-xl border border-slate-200 p-4 dark:border-slate-800 bg-white dark:bg-slate-900 cursor-pointer hover:border-brand-500 transition-colors">
                    <input 
                      type="checkbox" 
                      className="h-5 w-5 text-brand-600 rounded mt-0.5" 
                      checked={pref.checked}
                      onChange={pref.onChange}
                    />
                    <div className="space-y-1">
                      <p className="font-semibold text-sm dark:text-white">{pref.title}</p>
                      <p className="text-xs text-slate-500 leading-relaxed">{pref.desc}</p>
                    </div>
                  </label>
                ))}
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                <button 
                  onClick={handleSaveNotifications} 
                  className="btn-primary flex items-center gap-2"
                  disabled={updateProfile.isPending}
                >
                  <Save className="h-4 w-4" /> Save Preferences
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: AUDIT LOG */}
          {activeTab === 'audit' && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">Audit Action Trail</h3>
              <DataTable 
                data={auditLogs} 
                columns={[
                  { header: 'Action', accessorKey: 'action' }, 
                  { header: 'Entity', accessorKey: 'entity' }, 
                  { header: 'IP Address', accessorKey: 'ip' }, 
                  { header: 'Timestamp', accessorFn: (row) => new Date(row.createdAt).toLocaleString('en-IN') }
                ]} 
              />
            </div>
          )}
        </main>
      </div>
    </>
  );
};
