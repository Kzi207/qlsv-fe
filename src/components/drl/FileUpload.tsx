import React, { useRef } from 'react';
import { FileText, Eye, Plus } from 'lucide-react';
import { getEvidenceUrl, isPdfEvidence, normalizeEvidenceList } from '../../utils/evidence';

interface FileUploadProps {
  files: any[];
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onView: (path: string) => void;
  disabled?: boolean;
  className?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({ files, onUpload, onView, disabled, className }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const normalizedFiles = normalizeEvidenceList(files);

  return (
    <div className={className || "mt-4 space-y-3"}>
      <div className="flex flex-wrap gap-2">
        {normalizedFiles.map((file, i) => {
          const isPDF = isPdfEvidence(file);

          return (
            <div
              key={`${file.path}-${i}`}
              className="group relative h-12 w-12 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-sm transition-all hover:border-blue-500/50 hover:shadow-blue-500/10"
            >
              {isPDF ? (
                <div className="flex h-full w-full items-center justify-center text-blue-500">
                  <FileText size={18} />
                </div>
              ) : (
                <img
                  src={getEvidenceUrl(file)}
                  alt={file.name}
                  className="h-full w-full object-cover opacity-80 transition-opacity group-hover:opacity-100"
                />
              )}

              <div className="absolute inset-0 flex items-center justify-center bg-white/60 opacity-0 transition-all backdrop-blur-[1px] group-hover:opacity-100">
                <button
                  onClick={() => onView(file.path)}
                  className="rounded-lg bg-blue-500/20 p-1 text-blue-600 transition-colors hover:bg-blue-500/40"
                >
                  <Eye size={14} />
                </button>
              </div>
            </div>
          );
        })}

        {!disabled && (
          <button
            onClick={() => inputRef.current?.click()}
            className="flex h-12 w-12 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-400 transition-all hover:border-blue-500/40 hover:bg-blue-500/5 hover:text-blue-500"
          >
            <Plus size={18} />
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={onUpload}
        accept="image/*,.pdf"
      />
    </div>
  );
};

export default FileUpload;
