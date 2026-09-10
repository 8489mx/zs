import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/shared/components/page-header';
import { StatsGrid, type StatsGridItem } from '@/shared/components/stats-grid';
import { Button } from '@/shared/ui/button';
import {
  ApprovalRequest,
  getApprovalRequests,
  getPendingApprovalsCount,
  getApprovalRules,
} from '../api/approvals.api';
import { ApprovalRequestsTable } from '../components/ApprovalRequestsTable';
import { ApprovalRulesManager } from '../components/ApprovalRulesManager';
import { ApprovalActionModal } from '../components/ApprovalActionModal';
import { ClockIcon, ShieldAlertIcon, RefreshCwIcon } from '@/shared/components/icons/AppIcons';

export const ApprovalsWorkspacePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'requests' | 'rules'>('requests');
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [moduleFilter, setModuleFilter] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
  const [actionModalOpen, setActionModalOpen] = useState(false);

  // KPIs
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [approvedCount, setApprovedCount] = useState<number>(0);
  const [rejectedCount, setRejectedCount] = useState<number>(0);
  const [rulesCount, setRulesCount] = useState<number>(0);

  const loadData = async () => {
    setLoading(true);
    try {
      const [reqData, pendingRes, rulesData] = await Promise.all([
        getApprovalRequests({
          status: statusFilter || undefined,
          module: moduleFilter || undefined,
        }),
        getPendingApprovalsCount(),
        getApprovalRules(),
      ]);

      setRequests(reqData.items || []);
      setPendingCount(pendingRes.count || 0);
      setRulesCount(rulesData.filter((r) => r.is_active).length);

      // Load counts for stats
      const [apprRes, rejRes] = await Promise.all([
        getApprovalRequests({ status: 'approved', limit: 1 }),
        getApprovalRequests({ status: 'rejected', limit: 1 }),
      ]);
      setApprovedCount(apprRes.total || 0);
      setRejectedCount(rejRes.total || 0);
    } catch {
      // Resilience
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, moduleFilter]);

  const stats: StatsGridItem[] = [
    {
      key: 'pending',
      label: 'طلبات معلقة تتطلب الاعتماد',
      value: pendingCount,
    },
    {
      key: 'approved',
      label: 'معاملات تم اعتمادها بنجاح',
      value: approvedCount,
    },
    {
      key: 'rejected',
      label: 'معاملات تم رفضها',
      value: rejectedCount,
    },
    {
      key: 'rules',
      label: 'قواعد الرقابة الهرمية المفعلة',
      value: rulesCount,
    },
  ];

  return (
    <div
      dir="rtl"
      style={{
        maxWidth: '1280px',
        margin: '0 auto',
        padding: '24px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}
    >
      <PageHeader
        title="مركز الموافقات وسير العمل الهرمي (Approval Workflow Center)"
        description="حوكمة المعاملات المالية والمشتريات والمصروفات وفق مصفوفة الصلاحيات وسقف المبالغ المعتمدة."
        actions={
          <Button variant="secondary" onClick={loadData} disabled={loading}>
            <RefreshCwIcon size={16} />
            تحديث البيانات
          </Button>
        }
      />

      {/* KPI Stats Grid */}
      <StatsGrid items={stats} />

      {/* Main Tab Navigation */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: '10px',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('requests')}
          style={{
            padding: '8px 18px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: activeTab === 'requests' ? '#170e5e' : '#f1f5f9',
            color: activeTab === 'requests' ? '#ffffff' : '#334155',
            fontWeight: 700,
            fontSize: 'var(--font-body)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <ClockIcon size={16} />
          <span>طابور طلبات الاعتماد</span>
          {pendingCount > 0 && (
            <span
              style={{
                backgroundColor: activeTab === 'requests' ? '#ef4444' : '#fee2e2',
                color: activeTab === 'requests' ? '#ffffff' : '#991b1b',
                padding: '2px 6px',
                borderRadius: '10px',
                fontSize: 'var(--font-micro)',
                fontWeight: 700,
              }}
            >
              {pendingCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('rules')}
          style={{
            padding: '8px 18px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: activeTab === 'rules' ? '#170e5e' : '#f1f5f9',
            color: activeTab === 'rules' ? '#ffffff' : '#334155',
            fontWeight: 700,
            fontSize: 'var(--font-body)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <ShieldAlertIcon size={16} />
          <span>مصفوفة القواعد والسياسات</span>
        </button>
      </div>

      {activeTab === 'requests' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Filters Bar */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#ffffff',
              padding: '12px 16px',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <span style={{ fontSize: 'var(--font-body)', fontWeight: 600, color: '#475569' }}>
                تصفية الحالة:
              </span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: 'var(--font-body)',
                  outline: 'none',
                }}
              >
                <option value="">جميع الحالات</option>
                <option value="pending">بانتظار الاعتماد (معلق)</option>
                <option value="approved">معتمد رسمياً</option>
                <option value="rejected">مرفوض</option>
              </select>

              <span style={{ fontSize: 'var(--font-body)', fontWeight: 600, color: '#475569', marginInlineStart: '12px' }}>
                الموديول:
              </span>
              <select
                value={moduleFilter}
                onChange={(e) => setModuleFilter(e.target.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: 'var(--font-body)',
                  outline: 'none',
                }}
              >
                <option value="">كافة الموديولات</option>
                <option value="purchase_orders">أوامر الشراء</option>
                <option value="purchases">فواتير المشتريات</option>
                <option value="expenses">المصروفات النقدية</option>
                <option value="treasury_transactions">حركات وسندات الخزينة</option>
              </select>
            </div>

            <div style={{ fontSize: 'var(--font-micro)', color: '#64748b' }}>
              إجمالي النتائج: <strong>{requests.length}</strong>
            </div>
          </div>

          <ApprovalRequestsTable
            requests={requests}
            loading={loading}
            onSelectRequest={(req) => {
              setSelectedRequest(req);
              setActionModalOpen(true);
            }}
          />
        </div>
      )}

      {activeTab === 'rules' && <ApprovalRulesManager />}

      <ApprovalActionModal
        isOpen={actionModalOpen}
        onClose={() => setActionModalOpen(false)}
        request={selectedRequest}
        onSuccess={() => loadData()}
      />
    </div>
  );
};
