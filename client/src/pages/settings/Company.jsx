import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, UploadCloud, Building2, Mail, User, Lock, Phone, Users, Layers, CreditCard, FileText, MapPin, Pencil, Eye, Power } from 'lucide-react';
import { useState } from 'react';
import { Drawer } from '../../components/common/Drawer';
import { PageHeader } from '../../components/common/PageHeader';
import { DataTable } from '../../components/tables/DataTable';
import { api } from '../../services/platform.service';

export const Company = () => {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('create'); // 'create', 'edit', 'view'
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    logo: '',
    phone: '',
    userLimit: '100',
    companyType: '',
    gstNumber: '',
    panNumber: '',
    registrationNo: '',
    country: 'India',
    state: 'Gujarat',
    officeAddress: ''
  });
  
  const queryClient = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ['companies'], queryFn: api.companies, retry: false });
  
  const createMutation = useMutation({
    mutationFn: api.createCompany,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      setOpen(false);
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => api.updateCompany(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      setOpen(false);
      setSelectedCompany(null);
      resetForm();
    }
  });

  const resetForm = () => {
    setSelectedCompany(null);
    setFormData({
      name: '',
      adminName: '',
      adminEmail: '',
      adminPassword: '',
      logo: '',
      phone: '',
      userLimit: '100',
      companyType: '',
      gstNumber: '',
      panNumber: '',
      registrationNo: '',
      country: 'India',
      state: 'Gujarat',
      officeAddress: ''
    });
  };

  const handleOpenDrawer = (company, drawerMode) => {
    setMode(drawerMode);
    if (company) {
      setSelectedCompany(company);
      setFormData({
        name: company.name || '',
        adminName: company.adminName || '',
        adminEmail: company.adminEmail || '',
        adminPassword: company.adminPassword || '',
        logo: company.logo || '',
        phone: company.phone || '',
        userLimit: String(company.limits?.users || '100'),
        companyType: company.companyType || '',
        gstNumber: company.gstNumber || '',
        panNumber: company.panNumber || '',
        registrationNo: company.registrationNo || '',
        country: company.country || 'India',
        state: company.state || 'Gujarat',
        officeAddress: company.officeAddress || ''
      });
    } else {
      resetForm();
    }
    setOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      limits: {
        users: parseInt(formData.userLimit) || 100
      }
    };
    
    if (mode === 'edit') {
      updateMutation.mutate({ id: selectedCompany._id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleToggleStatus = async (company) => {
    const newStatus = company.status === 'active' ? 'suspended' : 'active';
    try {
      await api.updateCompany(company._id, { status: newStatus });
      queryClient.invalidateQueries({ queryKey: ['companies'] });
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({ ...prev, logo: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const labelWithIcon = (Icon, text) => (
    <div className="flex items-center gap-1.5 mb-1.5">
      <Icon className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">{text}</span>
    </div>
  );

  return (
    <>
      <PageHeader 
        title="Super Admin Companies" 
        description="Company creation, subscription, limits, billing, and feature controls." 
        actions={
          <div className="flex gap-2">
            <button 
              className="btn-secondary" 
              onClick={async () => {
                if (window.confirm('Are you sure you want to migrate all submitted expenses to manager_review status?')) {
                  try {
                    const res = await api.migrateSubmitted();
                    alert(res.message || 'Migration completed successfully!');
                  } catch (err) {
                    alert(err.response?.data?.message || 'Migration failed');
                  }
                }
              }}
            >
              Migrate Submitted Expenses
            </button>
            <button className="btn-primary flex items-center gap-2" onClick={() => handleOpenDrawer(null, 'create')}>
              <Plus className="h-4 w-4" /> Create Company
            </button>
          </div>
        } 
      />
      
      <DataTable 
        showSearch={false}
        data={data} 
        columns={[
          { header: 'Company Name', accessorKey: 'name' }, 
          { header: 'Company Code', accessorKey: 'companyCode' }, 
          { header: 'Admin Email', accessorKey: 'adminEmail' }, 
          { 
            header: 'Status', 
            accessorKey: 'status',
            cell: ({ row }) => (
              <span className={`chip font-semibold capitalize ${row.original.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50' : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/50'}`}>
                {row.original.status || 'trial'}
              </span>
            )
          }, 
          { 
            header: 'Action', 
            id: 'actions',
            cell: ({ row }) => (
              <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                <button 
                  className="text-slate-500 hover:text-brand-600 transition-colors p-1" 
                  onClick={() => handleOpenDrawer(row.original, 'view')}
                  title="View Details"
                >
                  <Eye className="h-4 w-4" />
                </button>
                <button 
                  className="text-slate-500 hover:text-indigo-600 transition-colors p-1" 
                  onClick={() => handleOpenDrawer(row.original, 'edit')}
                  title="Edit Company"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button 
                  className={`transition-colors p-1 ${row.original.status === 'active' ? 'text-emerald-600 hover:text-rose-600' : 'text-slate-400 hover:text-emerald-600'}`} 
                  onClick={() => handleToggleStatus(row.original)}
                  title={row.original.status === 'active' ? 'Deactivate Company' : 'Activate Company'}
                >
                  <Power className="h-4 w-4" />
                </button>
              </div>
            )
          }
        ]} 
      />
      
      <Drawer 
        open={open} 
        onClose={() => setOpen(false)} 
        title={mode === 'view' ? 'VIEW COMPANY DETAILS' : mode === 'edit' ? 'EDIT COMPANY DETAILS' : 'ADD COMPANY DETAILS'} 
        description={mode === 'view' ? 'View registered details of this company tenant.' : mode === 'edit' ? 'Update details of this company tenant.' : 'Enter details to register a new company tenant in the system.'}
        className="max-w-5xl"
        footer={
          <div className="flex justify-end gap-3">
            <button type="button" className="btn-secondary border-none shadow-none uppercase font-bold text-xs text-slate-500" onClick={() => setOpen(false)}>
              {mode === 'view' ? 'Close' : 'Cancel'}
            </button>
            {mode !== 'view' && (
              <button type="submit" form="create-company-form" className="btn-primary px-6 py-2.5 uppercase font-bold text-xs bg-brand-600 text-white rounded-xl flex items-center gap-1.5" disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending ? 'Saving...' : mode === 'edit' ? 'Update Company' : <>Create Company <Plus className="h-3.5 w-3.5" /></>}
              </button>
            )}
          </div>
        }
      >
        <form id="create-company-form" className="space-y-6" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-6 lg:flex-row">
            {/* Logo Column */}
            <div className="flex flex-col items-center gap-2 shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Company Logo</span>
              <label className="border-2 border-dashed border-slate-200 hover:border-brand-500 rounded-2xl w-32 h-32 flex flex-col items-center justify-center cursor-pointer relative bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950 overflow-hidden group">
                {formData.logo ? (
                  <>
                    <img src={formData.logo} alt="Company Logo" className="w-full h-full object-cover" />
                    {mode !== 'view' && (
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Pencil className="h-5 w-5 text-white" />
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <UploadCloud className="h-8 w-8 text-brand-600" />
                    <span className="text-[10px] text-brand-600 font-bold mt-1.5">UPLOAD LOGO</span>
                  </>
                )}
                {mode !== 'view' && <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />}
                {formData.logo && mode !== 'view' && (
                  <div className="absolute bottom-1 right-1 rounded-full p-1.5 bg-brand-600 text-white shadow-md hover:bg-brand-700">
                    <Pencil className="h-3 w-3" />
                  </div>
                )}
              </label>
            </div>

            {/* Inputs Grid */}
            <div className="flex-1 space-y-4">
              {/* Row 1 */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  {labelWithIcon(Building2, 'Company Name')}
                  <input required disabled={mode === 'view'} type="text" className="input bg-slate-50/50" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Company name" />
                </div>
                <div>
                  {labelWithIcon(Mail, 'Admin Email')}
                  <input required disabled={mode === 'view'} type="email" className="input bg-slate-50/50" value={formData.adminEmail} onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })} placeholder="admin@company.com" />
                </div>
                <div>
                  {labelWithIcon(User, 'Admin Name')}
                  <input required disabled={mode === 'view'} type="text" className="input bg-slate-50/50" value={formData.adminName} onChange={(e) => setFormData({ ...formData, adminName: e.target.value })} placeholder="Full name" />
                </div>
              </div>

              {/* Row 2 */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="relative">
                  {labelWithIcon(Lock, 'Password')}
                  <div className="relative">
                    <input required={mode === 'create'} disabled={mode === 'view'} type={showPassword ? 'text' : 'password'} className="input bg-slate-50/50 pr-14" value={formData.adminPassword} onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })} placeholder="••••••••" />
                    {mode !== 'view' && (
                      <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-brand-600 hover:text-brand-700" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? 'HIDE' : 'SHOW'}
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  {labelWithIcon(Phone, 'Phone Number')}
                  <input disabled={mode === 'view'} type="text" className="input bg-slate-50/50" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="+1 (0) 00-0000" />
                </div>
                <div>
                  {labelWithIcon(Users, 'User Limit *')}
                  <input required disabled={mode === 'view'} type="number" className="input bg-slate-50/50" value={formData.userLimit} onChange={(e) => setFormData({ ...formData, userLimit: e.target.value })} placeholder="Max Users" />
                </div>
              </div>

              {/* Row 3 */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div>
                  {labelWithIcon(Layers, 'Company Type')}
                  <select required disabled={mode === 'view'} className="input bg-slate-50/50" value={formData.companyType} onChange={(e) => setFormData({ ...formData, companyType: e.target.value })}>
                    <option value="">Select Type</option>
                    <option value="pvt_ltd">Private Limited</option>
                    <option value="proprietorship">Proprietorship</option>
                    <option value="partnership">Partnership</option>
                    <option value="llp">LLP</option>
                  </select>
                </div>
                <div>
                  {labelWithIcon(CreditCard, 'GST Number')}
                  <input disabled={mode === 'view'} type="text" className="input bg-slate-50/50" value={formData.gstNumber} onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })} placeholder="GSTIN" />
                </div>
                <div>
                  {labelWithIcon(CreditCard, 'PAN Number')}
                  <input disabled={mode === 'view'} type="text" className="input bg-slate-50/50" value={formData.panNumber} onChange={(e) => setFormData({ ...formData, panNumber: e.target.value })} placeholder="ABCDE1234F" />
                </div>
                <div>
                  {labelWithIcon(FileText, 'Registration No')}
                  <input disabled={mode === 'view'} type="text" className="input bg-slate-50/50" value={formData.registrationNo} onChange={(e) => setFormData({ ...formData, registrationNo: e.target.value })} placeholder="REG NO" />
                </div>
              </div>

              {/* Row 4 */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  {labelWithIcon(MapPin, 'Country')}
                  <input required disabled={mode === 'view'} type="text" className="input bg-slate-50/50" value={formData.country} onChange={(e) => setFormData({ ...formData, country: e.target.value })} placeholder="India" />
                </div>
                <div>
                  {labelWithIcon(MapPin, 'State')}
                  <input required disabled={mode === 'view'} type="text" className="input bg-slate-50/50" value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} placeholder="Gujarat" />
                </div>
                <div>
                  {labelWithIcon(MapPin, 'Office Address')}
                  <input disabled={mode === 'view'} type="text" className="input bg-slate-50/50" value={formData.officeAddress} onChange={(e) => setFormData({ ...formData, officeAddress: e.target.value })} placeholder="Street, City, Country" />
                </div>
              </div>
            </div>
          </div>
        </form>
      </Drawer>
    </>
  );
};
