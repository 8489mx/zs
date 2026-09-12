import { useState } from 'react';
import { ContractingScheduleTask } from '../contracting.types';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import { systemConfirm } from '@/shared/components/system-alert';
import { contractingApi } from '../api/contracting.api';
import { ScheduleGeneratorModal } from './ScheduleGeneratorModal';
import { TaskDelayModal } from './TaskDelayModal';

interface ContractingGanttTabProps {
  tasks: ContractingScheduleTask[];
  loading: boolean;
  projectId?: string;
  projectName?: string;
  onNewTask: () => void;
  onTaskUpdated: () => void;
}

export function ContractingGanttTab({
  tasks,
  loading,
  projectId,
  projectName,
  onNewTask,
  onTaskUpdated,
}: ContractingGanttTabProps) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [showGeneratorModal, setShowGeneratorModal] = useState(false);
  const [selectedDelayTask, setSelectedDelayTask] = useState<ContractingScheduleTask | null>(null);

  // Metrics
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'completed' || Number(t.progressPercent) >= 100).length;
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress' || (Number(t.progressPercent) > 0 && Number(t.progressPercent) < 100)).length;
  const criticalPathTasks = tasks.filter((t) => t.isCriticalPath).length;

  const handleUpdateProgress = async (task: ContractingScheduleTask, newProgress: number) => {
    try {
      setUpdatingId(task.id);
      await contractingApi.updateScheduleTask(task.id, {
        progressPercent: newProgress,
      });
      onTaskUpdated();
    } catch (err) {
      console.error('Failed to update task progress:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    const confirmed = await systemConfirm({
      title: 'حذف نشاط من الجدول الزمني',
      message: 'هل أنت متأكد من حذف هذه المهمة من الجدول الزمني للمشروع؟ لا يمكن التراجع عن هذا الإجراء.',
      confirmText: 'تأكيد الحذف',
      cancelText: 'إلغاء',
      variant: 'danger',
    });
    if (!confirmed) return;

    try {
      await contractingApi.deleteScheduleTask(taskId);
      onTaskUpdated();
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  const getStatusBadge = (status: string, progress: number) => {
    if (status === 'completed' || progress >= 100) {
      return <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: 'var(--font-badge)', fontWeight: 600, background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0' }}>مكتملة بنجاح</span>;
    }
    if (status === 'in_progress' || progress > 0) {
      return <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: 'var(--font-badge)', fontWeight: 600, background: '#e0e7ff', color: '#3730a3', border: '1px solid #c7d2fe' }}>قيد التنفيذ ({progress}%)</span>;
    }
    if (status === 'delayed') {
      return <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: 'var(--font-badge)', fontWeight: 600, background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca' }}>متأخرة عن الجدول</span>;
    }
    return <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: 'var(--font-badge)', fontWeight: 600, background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' }}>لم تبدأ</span>;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} dir="rtl">
      {/* هيدر التبويب */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: 'var(--font-section-title)', fontWeight: 700, color: '#1e293b', margin: 0 }}>
            الجدول الزمني ومخطط جانت للمسار الحرج (Gantt Schedule & CPM)
          </h2>
          <p style={{ fontSize: 'var(--font-subtitle)', color: '#64748b', margin: '4px 0 0' }}>
            {projectName ? `المشروع: ${projectName}` : 'متابعة مراحل التنفيذ، الأنشطة الحرجة، والمدد الزمنية المعتمدة'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {projectId && (
            <button
              type="button"
              onClick={() => setShowGeneratorModal(true)}
              style={{
                height: '36px',
                padding: '0 16px',
                borderRadius: '8px',
                fontWeight: 600,
                background: '#eff6ff',
                color: '#1e40af',
                border: '1px solid #bfdbfe',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                fontSize: 'var(--font-body)',
              }}
            >
              <AppIcons.Calendar size={16} />
              <span>توليد الجدول الزمني الذكي للأدوار</span>
            </button>
          )}
          <button
            type="button"
            onClick={onNewTask}
            style={{
              height: '36px',
              padding: '0 16px',
              borderRadius: '8px',
              fontWeight: 600,
              background: '#170e5e',
              color: '#ffffff',
              border: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              fontSize: 'var(--font-body)',
            }}
          >
            <AppIcons.Plus size={16} />
            <span>إضافة نشاط ومرحلة جديدة</span>
          </button>
        </div>
      </div>

      {/* بطاقات المؤشرات السريعة للجدول */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 'var(--font-table-head)', color: '#64748b' }}>إجمالي أنشطة الجدول</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>{totalTasks} نشاط</div>
          </div>
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1e40af' }}>
            <AppIcons.Calendar size={18} />
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 'var(--font-table-head)', color: '#64748b' }}>أنشطة المسار الحرج (CPM)</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#dc2626', marginTop: '2px' }}>{criticalPathTasks} نشاط حرج</div>
          </div>
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}>
            <AppIcons.AlertCircle size={18} />
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 'var(--font-table-head)', color: '#64748b' }}>أنشطة قيد التنفيذ</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#1e40af', marginTop: '2px' }}>{inProgressTasks} نشاط</div>
          </div>
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1e40af' }}>
            <AppIcons.Clock size={18} />
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 'var(--font-table-head)', color: '#64748b' }}>الأنشطة المكتملة</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#15803d', marginTop: '2px' }}>{completedTasks} نشاط</div>
          </div>
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#15803d' }}>
            <AppIcons.CheckCircle size={18} />
          </div>
        </div>
      </div>

      {/* قائمة وجدول الأنشطة التفاعلي */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: 'var(--font-body)' }}>
            جاري تحميل الجدول الزمني للمشروع...
          </div>
        ) : tasks.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: '#64748b' }}>
              <AppIcons.Calendar size={24} />
            </div>
            <h3 style={{ fontSize: 'var(--font-section-title)', fontWeight: 700, color: '#1e293b', margin: '0 0 6px' }}>
              لا توجد أنشطة مجدولة للمشروع حتى الآن
            </h3>
            <p style={{ fontSize: 'var(--font-body)', color: '#64748b', margin: '0 0 16px' }}>
              قم بإضافة مراحل وأنشطة التنفيذ وتحديد تواريخ البدء والنهاية لإنشاء الجدول الزمني ومخطط جانت.
            </p>
            <button
              type="button"
              onClick={onNewTask}
              style={{
                height: '36px',
                padding: '0 18px',
                borderRadius: '8px',
                fontWeight: 600,
                background: '#170e5e',
                color: '#ffffff',
                border: 'none',
                cursor: 'pointer',
                fontSize: 'var(--font-body)',
              }}
            >
              إضافة أول نشاط بالجدول
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 14px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569' }}>الكود و WBS</th>
                  <th style={{ padding: '12px 14px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569' }}>النشاط أو المرحلة</th>
                  <th style={{ padding: '12px 14px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569' }}>البداية والنهاية</th>
                  <th style={{ padding: '12px 14px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569' }}>المدة</th>
                  <th style={{ padding: '12px 14px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569', minWidth: '180px' }}>مخطط التقدم الزمني (Gantt)</th>
                  <th style={{ padding: '12px 14px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569' }}>الحالة</th>
                  <th style={{ padding: '12px 14px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569', textAlign: 'center' }}>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => {
                  const progress = Number(task.progressPercent || 0);
                  const isCritical = task.isCriticalPath;

                  return (
                    <tr
                      key={task.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        backgroundColor: isCritical ? '#fffbfb' : 'transparent',
                      }}
                    >
                      <td style={{ padding: '12px 14px', fontSize: 'var(--font-body)', fontWeight: 700, color: '#1e293b' }}>
                        <div>{task.taskCode}</div>
                        <span style={{ fontSize: 'var(--font-micro)', color: '#64748b' }}>WBS: {task.wbsCode}</span>
                      </td>

                      <td style={{ padding: '12px 14px', fontSize: 'var(--font-body)', maxWidth: '280px' }}>
                        <div style={{ fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>{task.taskName}</span>
                          {isCritical && (
                            <span style={{ fontSize: 'var(--font-micro)', background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                              مسار حرج CPM
                            </span>
                          )}
                        </div>
                        {task.assignedTeam && (
                          <div style={{ fontSize: 'var(--font-micro)', color: '#64748b', marginTop: '2px' }}>
                            المسؤول: {task.assignedTeam}
                          </div>
                        )}
                      </td>

                      <td style={{ padding: '12px 14px', fontSize: 'var(--font-body)', color: '#475569' }}>
                        <div>{task.startDate}</div>
                        <div style={{ fontSize: 'var(--font-micro)', color: '#94a3b8' }}>إلى {task.endDate}</div>
                      </td>

                      <td style={{ padding: '12px 14px', fontSize: 'var(--font-body)', fontWeight: 600, color: '#0f172a' }}>
                        {task.durationDays} يوم
                      </td>

                      {/* شريط جانت الزمني المباشر */}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              flex: 1,
                              height: '14px',
                              backgroundColor: '#e2e8f0',
                              borderRadius: '7px',
                              overflow: 'hidden',
                              position: 'relative',
                              border: isCritical ? '1px solid #f87171' : '1px solid #cbd5e1',
                            }}
                          >
                            <div
                              style={{
                                width: `${progress}%`,
                                height: '100%',
                                backgroundColor: isCritical ? '#dc2626' : '#170e5e',
                                borderRadius: '7px',
                                transition: 'width 0.3s ease',
                              }}
                            />
                          </div>
                          <span style={{ fontSize: 'var(--font-micro)', fontWeight: 700, minWidth: '35px', textAlign: 'left', color: '#1e293b' }}>
                            {progress}%
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                          <button
                            type="button"
                            disabled={updatingId === task.id || progress >= 100}
                            onClick={() => handleUpdateProgress(task, Math.min(100, progress + 25))}
                            style={{ fontSize: '10px', padding: '1px 6px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', color: '#334155' }}
                          >
                            +25%
                          </button>
                          <button
                            type="button"
                            disabled={updatingId === task.id || progress >= 100}
                            onClick={() => handleUpdateProgress(task, 100)}
                            style={{ fontSize: '10px', padding: '1px 6px', background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: '4px', cursor: 'pointer', color: '#15803d', fontWeight: 600 }}
                          >
                            إتمام
                          </button>
                        </div>
                      </td>

                      <td style={{ padding: '12px 14px' }}>
                        {getStatusBadge(task.status, progress)}
                      </td>

                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => setSelectedDelayTask(task)}
                            title="إثبات تأخير وتمديد المدة وترحيل المواعيد"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              border: '1px solid #fed7aa',
                              backgroundColor: '#fff7ed',
                              color: '#c2410c',
                              fontSize: 'var(--font-micro)',
                              fontWeight: 700,
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <AppIcons.Clock size={13} />
                            <span>ترحيل / تأخير</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteTask(task.id)}
                            title="حذف المهمة"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#94a3b8',
                              cursor: 'pointer',
                              padding: '4px',
                              borderRadius: '4px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <AppIcons.Trash size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {projectId && (
        <ScheduleGeneratorModal
          open={showGeneratorModal}
          projectId={projectId}
          projectName={projectName}
          onClose={() => setShowGeneratorModal(false)}
          onSuccess={() => {
            setShowGeneratorModal(false);
            onTaskUpdated();
          }}
        />
      )}

      {selectedDelayTask && (
        <TaskDelayModal
          open={Boolean(selectedDelayTask)}
          task={selectedDelayTask}
          allTasks={tasks}
          projectId={projectId}
          onClose={() => setSelectedDelayTask(null)}
          onSuccess={() => {
            setSelectedDelayTask(null);
            onTaskUpdated();
          }}
        />
      )}
    </div>
  );
}
