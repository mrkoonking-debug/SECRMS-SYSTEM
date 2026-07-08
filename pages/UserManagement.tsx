
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MockDb } from '../services/mockDb';
import { UserPlus, Trash2, Shield, User, Loader2, AlertCircle, Check, Edit2, X, Save, Wallet } from 'lucide-react';
import { Team } from '../types';
import { GlassSelect } from '../components/GlassSelect';
import { showToast } from '../services/toast';

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  // Edit state
  const [editingUid, setEditingUid] = useState<string | null>(null);
  const [editRole, setEditRole] = useState('');
  const [editTeam, setEditTeam] = useState('');
  const [editCanAccessFinance, setEditCanAccessFinance] = useState(false);
  const [editNickname, setEditNickname] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [formData, setFormData] = useState({
    name: '', nickname: '', email: '', password: '', role: 'staff', team: 'ALL', canAccessFinance: false
  });

  const fetchUsers = async () => {
    setLoading(true);
    const data = await MockDb.getAllUsers();
    setUsers(data);
    setLoading(false);
  };

  useEffect(() => {
    const user = MockDb.getCurrentUser();
    if (!user || user.role !== 'admin') {
      navigate('/admin/dashboard', { replace: true });
      return;
    }
    fetchUsers();
  }, [navigate]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await MockDb.createStaffAccount(formData);
      setSuccess('สร้างบัญชีพนักงานสำเร็จ!');
      setFormData({ name: '', nickname: '', email: '', password: '', role: 'staff', team: 'ALL', canAccessFinance: false });
      fetchUsers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'ไม่สามารถสร้างบัญชีได้');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (uid: string) => {
    if (confirm('ยืนยันการลบพนักงานรายนี้? (จะไม่สามารถกู้คืนได้)')) {
      await MockDb.deleteStaffAccount(uid);
      fetchUsers();
    }
  };

  const startEdit = (user: any) => {
    setEditingUid(user.uid);
    setEditRole(user.role || 'staff');
    setEditTeam(user.team || 'ALL');
    setEditCanAccessFinance(user.canAccessFinance || false);
    setEditNickname(user.nickname || '');
  };

  const cancelEdit = () => {
    setEditingUid(null);
    setEditRole('');
    setEditTeam('');
    setEditNickname('');
  };

  const handleSaveEdit = async (uid: string) => {
    setIsSavingEdit(true);
    try {
      await MockDb.updateStaffAccount(uid, { role: editRole, team: editTeam, canAccessFinance: editCanAccessFinance, nickname: editNickname });
      showToast('อัพเดทสิทธิ์สำเร็จ', 'success');
      setEditingUid(null);
      fetchUsers();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'ไม่สามารถอัพเดทได้', 'error');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const roleOptions = [
    { value: 'staff', label: 'พนักงานทั่วไป (Staff)' },
    { value: 'admin', label: 'ผู้จัดการระบบ (Admin)' }
  ];

  const teamOptions = [
    { value: 'ALL', label: 'ทุกแผนก' },
    { value: Team.HIKVISION, label: 'Team A (Hikvision)' },
    { value: Team.DAHUA, label: 'Team B (Dahua)' },
    { value: Team.TEAM_C, label: 'Team C (Network)' },
    { value: Team.TEAM_E, label: 'Team E (UPS)' },
    { value: Team.TEAM_G, label: 'Team G (Online)' }
  ];

  const getRoleBadge = (role: string) => {
    if (role === 'admin') return 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400';
    return 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400';
  };

  const getTeamBadge = (team: string) => {
    return 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400';
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-[#1d1d1f] dark:text-white mb-2">จัดการพนักงาน</h1>
        <p className="text-gray-500">สร้างและจัดการสิทธิ์การเข้าถึงระบบสำหรับทีมงานของคุณ</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ฟอร์มสร้างพนักงานใหม่ */}
        <div className="glass-panel p-8 rounded-[2rem] h-fit">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-blue-500" /> เพิ่มพนักงานใหม่
          </h3>

          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">ชื่อ-นามสกุล</label>
              <input
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-gray-50 dark:bg-[#2c2c2e] border border-gray-200 dark:border-[#424245] rounded-xl px-4 py-3 text-sm"
                placeholder="กรอกชื่อ-นามสกุลจริง"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">ชื่อเล่น (ใช้แสดงหน้าการเงิน)</label>
              <input
                value={formData.nickname}
                onChange={e => setFormData({ ...formData, nickname: e.target.value })}
                className="w-full bg-gray-50 dark:bg-[#2c2c2e] border border-gray-200 dark:border-[#424245] rounded-xl px-4 py-3 text-sm"
                placeholder="กรอกชื่อเล่น"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">อีเมลเข้าระบบ</label>
              <input
                required
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-gray-50 dark:bg-[#2c2c2e] border border-gray-200 dark:border-[#424245] rounded-xl px-4 py-3 text-sm"
                placeholder="กรอกอีเมลสำหรับเข้าระบบ"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">รหัสผ่าน</label>
              <input
                required
                type="password"
                minLength={6}
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                className="w-full bg-gray-50 dark:bg-[#2c2c2e] border border-gray-200 dark:border-[#424245] rounded-xl px-4 py-3 text-sm"
                placeholder="อย่างน้อย 6 ตัวอักษร"
              />
            </div>

            <GlassSelect
              label="ระดับสิทธิ์"
              value={formData.role}
              onChange={val => setFormData({ ...formData, role: val })}
              options={roleOptions}
            />

            <GlassSelect
              label="แผนกที่รับผิดชอบ"
              value={formData.team}
              onChange={val => setFormData({ ...formData, team: val })}
              options={teamOptions}
            />

            {/* Finance Access Toggle */}
            <div 
              onClick={() => setFormData({ ...formData, canAccessFinance: !formData.canAccessFinance })}
              className="flex items-center justify-between bg-amber-50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-800/30 rounded-xl px-4 py-3 cursor-pointer select-none"
            >
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-bold text-amber-700 dark:text-amber-400">เข้าถึงหน้าการเงิน</span>
              </div>
              <button
                type="button"
                className={`w-11 h-6 rounded-full transition-colors relative ${formData.canAccessFinance ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
              >
                <span className={`block w-4 h-4 rounded-full bg-white shadow-sm absolute top-1 left-1 transition-transform ${formData.canAccessFinance ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            {error && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {error}</div>}
            {success && <div className="p-3 bg-green-50 text-green-600 rounded-xl text-xs flex items-center gap-2"><Check className="w-4 h-4" /> {success}</div>}

            <button
              disabled={isSubmitting}
              className="w-full py-4 bg-[#0071e3] hover:bg-[#0077ed] disabled:bg-gray-400 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-transform active:scale-95"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'สร้างบัญชี'}
            </button>
          </form>
        </div>

        {/* รายชื่อพนักงานทั้งหมด */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-lg font-bold mb-4 ml-2">รายชื่อทีมงาน ({users.length})</h3>
          {loading ? (
            <div className="p-20 text-center"><Loader2 className="w-10 h-10 animate-spin mx-auto text-gray-300" /></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {users.map((user) => {
                const isEditing = editingUid === user.uid;
                const isSelf = MockDb.getCurrentUser()?.uid === user.uid;

                return (
                  <div key={user.uid} className={`glass-panel p-3.5 md:p-4.5 transition-all ${isEditing ? 'ring-2 ring-[#0071e3]/30 shadow-lg' : ''}`}>
                    {isEditing ? (
                      // ── Edit Mode ──
                      <div className="space-y-3 animate-fade-in">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-100 text-blue-600 flex-shrink-0">
                            <Edit2 className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-bold dark:text-white text-sm">{user.name}</div>
                            <div className="text-xs text-gray-500">{user.email}</div>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">ชื่อเล่น (ใช้แสดงหน้าการเงิน)</label>
                          <input
                            value={editNickname}
                            onChange={e => setEditNickname(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-[#2c2c2e] border border-gray-200 dark:border-[#424245] rounded-xl px-4 py-2.5 text-xs text-[#1d1d1f] dark:text-white outline-none"
                            placeholder="กรอกชื่อเล่น"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">ระดับสิทธิ์</label>
                          <GlassSelect
                            value={editRole}
                            onChange={val => setEditRole(val)}
                            options={roleOptions}
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">แผนกที่รับผิดชอบ</label>
                          <GlassSelect
                            value={editTeam}
                            onChange={val => setEditTeam(val)}
                            options={teamOptions}
                          />
                        </div>

                        <div 
                          onClick={() => setEditCanAccessFinance(!editCanAccessFinance)}
                          className="flex items-center justify-between bg-amber-50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-800/30 rounded-lg px-3 py-2.5 cursor-pointer select-none"
                        >
                          <div className="flex items-center gap-2">
                            <Wallet className="w-4 h-4 text-amber-500" />
                            <span className="text-xs font-bold text-amber-700 dark:text-amber-400">เข้าถึงหน้าการเงิน</span>
                          </div>
                          <button
                            type="button"
                            className={`w-11 h-6 rounded-full transition-colors relative ${editCanAccessFinance ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                          >
                            <span className={`block w-4 h-4 rounded-full bg-white shadow-sm absolute top-1 left-1 transition-transform ${editCanAccessFinance ? 'translate-x-5' : 'translate-x-0'}`} />
                          </button>
                        </div>

                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={cancelEdit}
                            className="flex-1 py-2 bg-gray-200 dark:bg-[#3a3a3c] text-gray-600 dark:text-gray-300 rounded-lg text-sm font-bold flex items-center justify-center gap-1 hover:bg-gray-300 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" /> ยกเลิก
                          </button>
                          <button
                            onClick={() => handleSaveEdit(user.uid)}
                            disabled={isSavingEdit}
                            className="flex-1 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-1 transition-colors disabled:opacity-50"
                          >
                            {isSavingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} บันทึก
                          </button>
                        </div>
                      </div>
                    ) : (
                      // ── View Mode ──
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${user.role === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'} flex-shrink-0`}>
                            {user.role === 'admin' ? <Shield className="w-5 h-5" /> : <User className="w-5 h-5" />}
                          </div>
                          <div>
                            <div className="font-bold text-sm md:text-base dark:text-white">
                              {user.name} {user.nickname && <span className="text-xs text-gray-400 font-normal">({user.nickname})</span>}
                            </div>
                            <div className="text-[11px] text-gray-500 leading-tight truncate max-w-[150px] sm:max-w-[200px]">{user.email}</div>
                            <div className="mt-1 flex gap-1.5 flex-wrap">
                              <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold ${getRoleBadge(user.role)}`}>{user.role}</span>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold ${getTeamBadge(user.team)}`}>{user.team}</span>
                              {user.canAccessFinance && <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400">FINANCE</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1 flex-shrink-0 ml-2">
                          <button
                            onClick={() => startEdit(user)}
                            className="p-1.5 text-gray-400 hover:text-blue-500 transition-colors"
                            title="แก้ไขข้อมูล"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {!isSelf && (
                            <button
                              onClick={() => handleDelete(user.uid)}
                              className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"
                              title="ลบพนักงาน"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
