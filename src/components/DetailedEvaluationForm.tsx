import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { EVALUATION_DATA } from '../constants/evaluationData';
import type { Section } from '../types';
import { normalizeEvidenceList } from '../utils/evidence';
import { normalizeTrainingActivities } from '../utils/trainingActivities';
import BottomBar from './drl/BottomBar';
import CriteriaRow from './drl/CriteriaRow';
import PreviewModal from './drl/PreviewModal';
import SectionCard from './drl/SectionCard';

interface Props {
  initialData?: any;
  studentDetails?: any;
  adminData?: any;
  studentId?: number;
  semester?: string;
  onSubmit: (data: any) => void;
  loading?: boolean;
  isAdminMode?: boolean;
  onExport?: () => void;
  onClose?: () => void;
}

const sumAutoActivities = (criterionActivities: any[]) =>
  criterionActivities
    .filter((activity: any) => String(activity?.source || '').toUpperCase() !== 'CUSTOM_EVIDENCE')
    .reduce((sum: number, activity: any) => sum + (Number(activity?.points) || 0), 0);

const sumApprovedCustomEvidence = (criterionCustomEvidence: any[]) =>
  criterionCustomEvidence
    .filter((item: any) => item?.status === 'APPROVED')
    .reduce((sum: number, item: any) => sum + (Number(item?.points) || 0), 0);

const DetailedEvaluationForm: React.FC<Props> = ({
  initialData,
  studentDetails,
  adminData,
  studentId,
  semester,
  onSubmit,
  loading,
  isAdminMode,
  onExport,
  onClose,
}) => {
  const [scores, setScores] = useState<Record<string, number | undefined>>({});
  const [autoScores, setAutoScores] = useState<Record<string, number>>({});
  const [adminScores, setAdminScores] = useState<Record<string, number | undefined>>({});
  const [evidence, setEvidence] = useState<Record<string, any[]>>({});
  const [customEvidence, setCustomEvidence] = useState<Record<string, any[]>>({});
  const [activities, setActivities] = useState<Record<string, any[]>>({});
  const [expandedSections, setExpandedSections] = useState<string[]>(['sec-1']);
  const [previewData, setPreviewData] = useState<{ files: any[]; initialIndex: number; criterionId: string } | null>(null);
  
  // Custom evidence modal states
  const [customEvidenceModal, setCustomEvidenceModal] = useState<{ criterionId: string; maxPoints: number; content: string } | null>(null);
  const [customActName, setCustomActName] = useState('');
  const [customPoints, setCustomPoints] = useState(1);
  const [customFile, setCustomFile] = useState<File | null>(null);
  const [submittingCustom, setSubmittingCustom] = useState(false);

  useEffect(() => {
    const studentScoreMap: Record<string, number | undefined> = {};
    const autoScoreMap: Record<string, number> = {};
    const adminScoreMap: Record<string, number | undefined> = {};
    const evidenceMap: Record<string, any[]> = {};
    const customEvidenceMap: Record<string, any[]> = {};
    const activityMap: Record<string, any[]> = {};

    EVALUATION_DATA.forEach((section) => {
      section.criteria.forEach((criterion) => {
        if (studentDetails?.[criterion.id]) {
          const criterionDetails = studentDetails[criterion.id] || {};
          const totalScore = Number(criterionDetails.score || 0);
          const normalizedFiles = normalizeEvidenceList(criterionDetails.files || []);
          const normalizedActivities = normalizeTrainingActivities(criterionDetails.activities || []);
          const normalizedCustomEvidence = Array.isArray(criterionDetails.customEvidence)
            ? criterionDetails.customEvidence
            : [];
          const autoScore = sumAutoActivities(normalizedActivities) + sumApprovedCustomEvidence(normalizedCustomEvidence);
          const manualCandidate = Number(criterionDetails.manualScore);
          const inferredManual = Math.max(0, totalScore - autoScore);
          const manualScore = Number.isFinite(manualCandidate) ? Math.max(0, manualCandidate) : inferredManual;

          if (isAdminMode) {
            studentScoreMap[criterion.id] = totalScore;
            autoScoreMap[criterion.id] = autoScore;
          } else if (manualScore > 0) {
            studentScoreMap[criterion.id] = manualScore;
            autoScoreMap[criterion.id] = autoScore;
          } else {
            studentScoreMap[criterion.id] = undefined;
            autoScoreMap[criterion.id] = autoScore;
          }
          evidenceMap[criterion.id] = normalizedFiles;
          activityMap[criterion.id] = normalizedActivities;
          customEvidenceMap[criterion.id] = normalizedCustomEvidence;
        } else if (initialData?.scores?.[criterion.id] !== undefined || initialData?.details?.[criterion.id]) {
          const initialCriterion = initialData?.details?.[criterion.id] || {};
          const totalScore = Number(initialData?.scores?.[criterion.id] ?? initialCriterion.score ?? 0);
          const normalizedFiles = normalizeEvidenceList(initialData?.evidence?.[criterion.id] || initialCriterion.files || []);
          const normalizedActivities = normalizeTrainingActivities(initialData?.activities?.[criterion.id] || initialCriterion.activities || []);
          const normalizedCustomEvidence = Array.isArray(initialData?.customEvidence?.[criterion.id])
            ? initialData.customEvidence[criterion.id]
            : Array.isArray(initialCriterion.customEvidence)
              ? initialCriterion.customEvidence
              : [];
          const autoScore = sumAutoActivities(normalizedActivities) + sumApprovedCustomEvidence(normalizedCustomEvidence);
          const manualCandidate = Number(initialCriterion.manualScore);
          const inferredManual = Math.max(0, totalScore - autoScore);
          const manualScore = Number.isFinite(manualCandidate) ? Math.max(0, manualCandidate) : inferredManual;

          if (isAdminMode) {
            studentScoreMap[criterion.id] = totalScore;
            autoScoreMap[criterion.id] = autoScore;
          } else if (manualScore > 0) {
            studentScoreMap[criterion.id] = manualScore;
            autoScoreMap[criterion.id] = autoScore;
          } else {
            studentScoreMap[criterion.id] = undefined;
            autoScoreMap[criterion.id] = autoScore;
          }
          evidenceMap[criterion.id] = normalizedFiles;
          activityMap[criterion.id] = normalizedActivities;
          customEvidenceMap[criterion.id] = normalizedCustomEvidence;
        } else {
          studentScoreMap[criterion.id] = undefined;
          autoScoreMap[criterion.id] = 0;
          evidenceMap[criterion.id] = [];
          activityMap[criterion.id] = [];
          customEvidenceMap[criterion.id] = [];
        }

        if (adminData?.[criterion.id] !== undefined) {
          adminScoreMap[criterion.id] = Number(adminData[criterion.id]);
        } else if (isAdminMode) {
          adminScoreMap[criterion.id] = studentScoreMap[criterion.id];
        } else {
          adminScoreMap[criterion.id] = undefined;
        }
      });
    });

    setScores(studentScoreMap);
    setAutoScores(autoScoreMap);
    setAdminScores(adminScoreMap);
    setEvidence(evidenceMap);
    setCustomEvidence(customEvidenceMap);
    setActivities(activityMap);
  }, [studentDetails, adminData, initialData, isAdminMode]);

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => (prev.includes(id) ? prev.filter((sectionId) => sectionId !== id) : [...prev, id]));
  };

  const calculateSectionTotal = (
    section: Section,
    scoreSet: Record<string, number | undefined>,
    includeAutoScore = false,
  ) => {
    let total = 0;
    section.criteria.forEach((criterion) => {
      total += Number(scoreSet[criterion.id] || 0) + (includeAutoScore ? Number(autoScores[criterion.id] || 0) : 0);
    });
    return Math.min(total, section.maxPoints);
  };

  const grandTotal = EVALUATION_DATA.reduce(
    (acc, section) => acc + calculateSectionTotal(section, scores, !isAdminMode),
    0,
  );
  const adminGrandTotal = EVALUATION_DATA.reduce((acc, section) => acc + calculateSectionTotal(section, adminScores), 0);

  const handleFileUpload = async (criterionId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    if (!studentId) {
      toast.error('Khong tim thay thong tin sinh vien de upload minh chung');
      event.target.value = '';
      return;
    }
    if (!semester) {
      toast.error('Vui long chon hoc ky truoc khi upload minh chung');
      event.target.value = '';
      return;
    }

    const formData = new FormData();
    Array.from(files).forEach((file) => formData.append('files', file));
    formData.append('criterionId', criterionId);
    formData.append('semester', semester);
    formData.append('student_id', String(studentId));

    try {
      const res = await api.post('/training/upload-evidence', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setEvidence((prev) => ({
        ...prev,
        [criterionId]: [...(prev[criterionId] || []), ...normalizeEvidenceList(res.data.files)],
      }));
      const savedCount = res.data.files?.length || files.length;
      const storageLabel = res.data.storage === 'r2' ? 'Cloudflare R2' : 'local server';
      toast.success(`Da upload ${savedCount} minh chung (${storageLabel})`);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Upload minh chung that bai');
    } finally {
      event.target.value = '';
    }
  };

  const handleCustomEvidenceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEvidenceModal) return;
    if (!customActName.trim()) {
      toast.error('Vui lòng nhập tên hoạt động');
      return;
    }
    if (!customFile) {
      toast.error('Vui lòng chọn ảnh minh chứng');
      return;
    }
    if (!studentId) {
      toast.error('Không tìm thấy thông tin sinh viên');
      return;
    }
    if (!semester) {
      toast.error('Vui lòng chọn học kỳ');
      return;
    }

    setSubmittingCustom(true);
    const { criterionId } = customEvidenceModal;

    const formData = new FormData();
    formData.append('files', customFile);
    formData.append('criterionId', criterionId);
    formData.append('semester', semester);
    formData.append('student_id', String(studentId));

    try {
      const res = await api.post('/training/upload-evidence', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const uploadedFiles = normalizeEvidenceList(res.data.files);
      if (!uploadedFiles.length) {
        throw new Error('Upload file không trả về thông tin file hợp lệ');
      }

      const newItem = {
        id: 'ev_' + Date.now(),
        activityName: customActName.trim(),
        points: Number(customPoints),
        status: 'PENDING',
        files: uploadedFiles,
        submittedAt: new Date().toISOString()
      };

      setCustomEvidence((prev) => ({
        ...prev,
        [criterionId]: [...(prev[criterionId] || []), newItem],
      }));

      toast.success('Đã nộp minh chứng hoạt động thành công! Đang chờ duyệt.');
      
      // Reset & Close Modal
      setCustomEvidenceModal(null);
      setCustomActName('');
      setCustomPoints(1);
      setCustomFile(null);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Nộp minh chứng thất bại');
    } finally {
      setSubmittingCustom(false);
    }
  };

  const handleRemoveEvidence = (criterionId: string, path: string) => {
    setEvidence((prev) => ({
      ...prev,
      [criterionId]: normalizeEvidenceList(prev[criterionId] || []).filter((file) => file.path !== path),
    }));
  };

  const handleRemoveFromPreview = (index: number) => {
    if (!previewData) return;
    const fileToRemove = previewData.files[index];
    if (!fileToRemove) return;
    
    handleRemoveEvidence(previewData.criterionId, fileToRemove.path);
    
    // Update local preview state to remove the file
    const newFiles = [...previewData.files];
    newFiles.splice(index, 1);
    
    if (newFiles.length === 0) {
      setPreviewData(null);
    } else {
      setPreviewData({
        ...previewData,
        files: newFiles,
        initialIndex: Math.min(index, newFiles.length - 1)
      });
    }
  };

  const handleSubmit = () => {
    if (isAdminMode) {
      onSubmit({
        admin_details: adminScores,
        admin_total: adminGrandTotal,
        admin_y_thuc: calculateSectionTotal(EVALUATION_DATA[0], adminScores),
        admin_hoat_dong: calculateSectionTotal(EVALUATION_DATA[1], adminScores) + calculateSectionTotal(EVALUATION_DATA[2], adminScores),
        admin_ky_luat: calculateSectionTotal(EVALUATION_DATA[3], adminScores) + calculateSectionTotal(EVALUATION_DATA[4], adminScores),
      });
      return;
    }

    const manualScores = Object.fromEntries(
      Object.keys(scores).map((id) => [id, Number(scores[id] || 0)]),
    );

    const normalizedScores = Object.fromEntries(
      Object.keys(scores).map((id) => [id, Number(scores[id] || 0) + Number(autoScores[id] || 0)]),
    );

    const details: Record<string, any> = {};
    Object.keys(normalizedScores).forEach((id) => {
      details[id] = {
        score: normalizedScores[id],
        manualScore: manualScores[id],
        files: evidence[id] || [],
        activities: activities[id] || [],
        customEvidence: customEvidence[id] || [],
      };
    });

    onSubmit({
      scores: normalizedScores,
      total: grandTotal,
      details,
      y_thuc: calculateSectionTotal(EVALUATION_DATA[0], scores, true),
      hoat_dong: calculateSectionTotal(EVALUATION_DATA[1], scores, true) + calculateSectionTotal(EVALUATION_DATA[2], scores, true),
      ky_luat: calculateSectionTotal(EVALUATION_DATA[3], scores, true) + calculateSectionTotal(EVALUATION_DATA[4], scores, true),
    });
  };

  return (
    <>
      <div className="animate-in slide-in-from-bottom-10 fade-in space-y-4 md:space-y-8 pb-32 duration-700">
        {EVALUATION_DATA.map((section) => (
          <SectionCard
            key={section.id}
            section={section}
            studentSecTotal={calculateSectionTotal(section, scores, !isAdminMode)}
            adminSecTotal={calculateSectionTotal(section, adminScores)}
            isExpanded={expandedSections.includes(section.id)}
            isAdminMode={isAdminMode}
            onToggle={() => toggleSection(section.id)}
          >
            {section.criteria.map((criterion) => (
              <CriteriaRow
                key={criterion.id}
                criterion={criterion}
                studentScore={
                  scores[criterion.id] !== undefined
                    ? Number(scores[criterion.id] || 0) + Number(autoScores[criterion.id] || 0)
                    : undefined
                }
                studentInputMax={
                  isAdminMode
                    ? criterion.maxPoints
                    : Math.max(0, criterion.maxPoints - Number(autoScores[criterion.id] || 0))
                }
                studentPlaceholder={
                  !isAdminMode && Number(autoScores[criterion.id] || 0) > 0
                    ? String(autoScores[criterion.id])
                    : ''
                }
                adminScore={adminScores[criterion.id]}
                evidence={evidence[criterion.id] || []}
                customEvidence={customEvidence[criterion.id] || []}
                activities={activities[criterion.id] || []}
                isAdminMode={isAdminMode}
                onStudentScoreChange={(value) =>
                  setScores((prev) => ({
                    ...prev,
                    [criterion.id]: value,
                  }))
                }
                onAdminScoreChange={(value) => setAdminScores((prev) => ({ ...prev, [criterion.id]: value }))}
                onUpload={(event) => handleFileUpload(criterion.id, event)}
                onAddCustomEvidence={() => setCustomEvidenceModal({
                  criterionId: criterion.id,
                  maxPoints: criterion.maxPoints,
                  content: criterion.content
                })}
                onViewEvidence={(path) => {
                   const files = [...(evidence[criterion.id] || []), ...((customEvidence[criterion.id] || []).flatMap((item: any) => item.files || []))];
                   const index = files.findIndex(f => f.path === path);
                   setPreviewData({ 
                     files, 
                     initialIndex: index >= 0 ? index : 0, 
                     criterionId: criterion.id 
                   });
                 }}
              />
            ))}
          </SectionCard>
        ))}

        <BottomBar
          grandTotal={grandTotal}
          adminGrandTotal={adminGrandTotal}
          onSave={handleSubmit}
          onExport={onExport}
          onClose={onClose}
          loading={loading}
          isAdminMode={isAdminMode}
        />
      </div>

      {customEvidenceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-[2.5rem] border border-slate-100 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-50 pb-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">Nộp minh chứng mới</p>
                <h3 className="text-lg font-black text-slate-900">Minh chứng cho Mục {customEvidenceModal.criterionId.replace('crit-', '')}</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCustomEvidenceModal(null);
                  setCustomActName('');
                  setCustomPoints(1);
                  setCustomFile(null);
                }}
                className="rounded-xl p-1.5 hover:bg-slate-50 text-slate-400 hover:text-slate-700 transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            <form onSubmit={handleCustomEvidenceSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1">Nội dung tiêu chí</label>
                <p className="text-xs font-bold text-slate-600 bg-slate-50 p-3 rounded-2xl border border-slate-100">{customEvidenceModal.content}</p>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1">Tên hoạt động minh chứng *</label>
                <input
                  type="text"
                  required
                  placeholder="Nhập tên hoạt động (ví dụ: Tham gia hiến máu tình nguyện đợt 1)"
                  value={customActName}
                  onChange={(e) => setCustomActName(e.target.value)}
                  className="w-full rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-300 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1">Số điểm muốn cộng *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={customEvidenceModal.maxPoints}
                    value={customPoints}
                    onChange={(e) => setCustomPoints(Math.min(customEvidenceModal.maxPoints, Math.max(1, Number(e.target.value || 1))))}
                    className="w-full rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-300 focus:bg-white font-black"
                  />
                  <p className="text-[10px] text-slate-400 mt-1 italic font-bold">Tối đa: {customEvidenceModal.maxPoints}đ</p>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1">Ảnh minh chứng *</label>
                  <input
                    type="file"
                    required
                    accept="image/*"
                    onChange={(e) => setCustomFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-50">
                <button
                  type="button"
                  onClick={() => {
                    setCustomEvidenceModal(null);
                    setCustomActName('');
                    setCustomPoints(1);
                    setCustomFile(null);
                  }}
                  className="flex-1 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-2xl transition text-center"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submittingCustom}
                  className="flex-1 py-3 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 rounded-2xl transition text-center flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                >
                  {submittingCustom ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Đang xử lý...
                    </>
                  ) : 'Nộp minh chứng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <PreviewModal
        files={previewData?.files || []}
        initialIndex={previewData?.initialIndex}
        onClose={() => setPreviewData(null)}
        onRemove={isAdminMode ? undefined : handleRemoveFromPreview}
      />
    </>
  );
};

export default DetailedEvaluationForm;
