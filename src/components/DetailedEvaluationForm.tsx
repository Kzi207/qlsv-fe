import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { EVALUATION_DATA } from '../constants/evaluationData';
import type { Section } from '../constants/evaluationData';
import { normalizeEvidenceList } from '../utils/evidence';
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
  const [adminScores, setAdminScores] = useState<Record<string, number | undefined>>({});
  const [evidence, setEvidence] = useState<Record<string, any[]>>({});
  const [expandedSections, setExpandedSections] = useState<string[]>(['sec-1']);
  const [previewData, setPreviewData] = useState<{ files: any[]; initialIndex: number; criterionId: string } | null>(null);

  useEffect(() => {
    const studentScoreMap: Record<string, number | undefined> = {};
    const adminScoreMap: Record<string, number | undefined> = {};
    const evidenceMap: Record<string, any[]> = {};

    EVALUATION_DATA.forEach((section) => {
      section.criteria.forEach((criterion) => {
        if (studentDetails?.[criterion.id]) {
          studentScoreMap[criterion.id] = Number(studentDetails[criterion.id].score || 0);
          evidenceMap[criterion.id] = normalizeEvidenceList(studentDetails[criterion.id].files || []);
        } else if (initialData?.scores?.[criterion.id] !== undefined) {
          studentScoreMap[criterion.id] = Number(initialData.scores[criterion.id] || 0);
          evidenceMap[criterion.id] = normalizeEvidenceList(initialData.evidence?.[criterion.id] || []);
        } else {
          studentScoreMap[criterion.id] = undefined;
          evidenceMap[criterion.id] = [];
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
    setAdminScores(adminScoreMap);
    setEvidence(evidenceMap);
  }, [studentDetails, adminData, initialData, isAdminMode]);

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => (prev.includes(id) ? prev.filter((sectionId) => sectionId !== id) : [...prev, id]));
  };

  const calculateSectionTotal = (section: Section, scoreSet: Record<string, number | undefined>) => {
    let total = 0;
    section.criteria.forEach((criterion) => {
      total += Number(scoreSet[criterion.id] || 0);
    });
    return Math.min(total, section.maxPoints);
  };

  const grandTotal = EVALUATION_DATA.reduce((acc, section) => acc + calculateSectionTotal(section, scores), 0);
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

    const normalizedScores = Object.fromEntries(
      Object.keys(scores).map((id) => [id, Number(scores[id] || 0)]),
    );

    const details: Record<string, any> = {};
    Object.keys(normalizedScores).forEach((id) => {
      details[id] = { score: normalizedScores[id], files: evidence[id] || [] };
    });

    onSubmit({
      scores: normalizedScores,
      total: grandTotal,
      details,
      y_thuc: calculateSectionTotal(EVALUATION_DATA[0], scores),
      hoat_dong: calculateSectionTotal(EVALUATION_DATA[1], scores) + calculateSectionTotal(EVALUATION_DATA[2], scores),
      ky_luat: calculateSectionTotal(EVALUATION_DATA[3], scores) + calculateSectionTotal(EVALUATION_DATA[4], scores),
    });
  };

  return (
    <>
      <div className="animate-in slide-in-from-bottom-10 fade-in space-y-4 md:space-y-8 pb-32 duration-700">
        {EVALUATION_DATA.map((section) => (
          <SectionCard
            key={section.id}
            section={section}
            studentSecTotal={calculateSectionTotal(section, scores)}
            adminSecTotal={calculateSectionTotal(section, adminScores)}
            isExpanded={expandedSections.includes(section.id)}
            isAdminMode={isAdminMode}
            onToggle={() => toggleSection(section.id)}
          >
            {section.criteria.map((criterion) => (
              <CriteriaRow
                key={criterion.id}
                criterion={criterion}
                studentScore={scores[criterion.id]}
                adminScore={adminScores[criterion.id]}
                evidence={evidence[criterion.id] || []}
                isAdminMode={isAdminMode}
                onStudentScoreChange={(value) => setScores((prev) => ({ ...prev, [criterion.id]: value }))}
                onAdminScoreChange={(value) => setAdminScores((prev) => ({ ...prev, [criterion.id]: value }))}
                onUpload={(event) => handleFileUpload(criterion.id, event)}
                onViewEvidence={(path) => {
                   const files = evidence[criterion.id] || [];
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
