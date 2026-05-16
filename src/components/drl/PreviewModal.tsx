import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw, Download, Trash2, FileText, Maximize2 } from 'lucide-react';
import { getEvidenceUrl, isPdfEvidence, normalizeEvidenceList } from '../../utils/evidence';

interface PreviewModalProps {
  files: any[];
  initialIndex?: number;
  onClose: () => void;
  onRemove?: (index: number) => void;
}

const PreviewModal: React.FC<PreviewModalProps> = ({ files, initialIndex = 0, onClose, onRemove }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const normalizedFiles = normalizeEvidenceList(files);

  useEffect(() => {
    setCurrentIndex(initialIndex);
    setRotation(0);
    setZoom(1);
  }, [initialIndex, files]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') handlePrev(e as any);
      if (e.key === 'ArrowRight') handleNext(e as any);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [normalizedFiles.length]);

  if (normalizedFiles.length === 0) return null;

  const currentFile = normalizedFiles[currentIndex];
  const fileUrl = getEvidenceUrl(currentFile);
  const isPDF = isPdfEvidence(currentFile);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : normalizedFiles.length - 1));
    setRotation(0);
    setZoom(1);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev < normalizedFiles.length - 1 ? prev + 1 : 0));
    setRotation(0);
    setZoom(1);
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = currentFile.name || 'minh-chung';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return createPortal(
    <div 
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/90 animate-in fade-in duration-300 backdrop-blur-sm p-2 md:p-4"
      onClick={onClose}
    >
      {/* The Horizontal Frame (16:9) */}
      <div 
        className="relative w-full md:w-[95vw] max-w-6xl aspect-video bg-slate-950 rounded-2xl md:rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl flex flex-col animate-in zoom-in-95 duration-300"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Bar - Integrated into Frame */}
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-3 md:p-6 bg-gradient-to-b from-black/90 to-transparent">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="h-8 w-8 md:h-10 md:w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg">
              {isPDF ? <FileText size={16} /> : <Maximize2 size={16} />}
            </div>
            <div className="min-w-0">
              <h3 className="text-[10px] md:text-xs font-black text-white tracking-tight uppercase leading-none truncate max-w-[120px] md:max-w-xs">{currentFile.name || 'Minh chứng'}</h3>
              <p className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                {currentIndex + 1} / {normalizedFiles.length}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 md:gap-2">
            <div className="hidden md:flex items-center bg-white/10 rounded-xl p-1 backdrop-blur-md">
              <button onClick={() => setZoom(z => Math.max(0.5, z - 0.2))} className="p-1.5 text-white/70 hover:text-white transition-all">
                <ZoomOut size={16} />
              </button>
              <span className="px-1 text-[9px] font-black text-white min-w-[35px] text-center">{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom(z => Math.min(3, z + 0.2))} className="p-1.5 text-white/70 hover:text-white transition-all">
                <ZoomIn size={16} />
              </button>
            </div>
            
            <button onClick={() => setRotation(r => r + 90)} className="p-2 md:p-2.5 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-all">
              <RotateCw size={14} />
            </button>
            
            <button onClick={handleDownload} className="p-2 md:p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg">
              <Download size={14} />
            </button>

            {onRemove && (
              <button 
                onClick={() => { if(window.confirm('Xóa minh chứng này?')) onRemove(currentIndex); }} 
                className="p-2 md:p-2.5 bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition-all"
              >
                <Trash2 size={14} />
              </button>
            )}

            <div className="w-px h-6 bg-white/10 mx-0.5" />

            <button onClick={onClose} className="p-2 md:p-2.5 bg-white/10 text-white rounded-xl hover:bg-rose-600 transition-all">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Navigation Buttons - Inside Frame */}
        {normalizedFiles.length > 1 && (
          <>
            <button 
              onClick={handlePrev}
              className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-20 p-2 md:p-3 rounded-full bg-white/5 text-white hover:bg-white/20 transition-all border border-white/10 backdrop-blur-md"
            >
              <ChevronLeft size={20} strokeWidth={3} />
            </button>
            <button 
              onClick={handleNext}
              className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-20 p-2 md:p-3 rounded-full bg-white/5 text-white hover:bg-white/20 transition-all border border-white/10 backdrop-blur-md"
            >
              <ChevronRight size={20} strokeWidth={3} />
            </button>
          </>
        )}

        {/* Content Area - Filling the Frame */}
        <div className="flex-1 relative flex items-center justify-center p-2 md:p-4 overflow-hidden">
          {isPDF ? (
            <div className="w-full h-[90%] max-w-4xl bg-white rounded-xl overflow-hidden shadow-2xl flex flex-col">
              <iframe src={fileUrl} className="w-full h-full border-none" title="PDF Preview" />
            </div>
          ) : (
            <img 
              src={fileUrl} 
              alt={currentFile.name} 
              className="max-w-full max-h-full object-contain transition-all duration-300 ease-out"
              style={{ 
                transform: `rotate(${rotation}deg) scale(${zoom})`,
              }}
            />
          )}
        </div>

        {/* Bottom Gallery - Inside Frame */}
        {normalizedFiles.length > 1 && (
          <div className="absolute bottom-0 left-0 right-0 z-20 p-2 md:p-4 bg-gradient-to-t from-black/90 to-transparent flex justify-center">
            <div className="flex gap-1.5 md:gap-2 p-1 bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 overflow-x-auto max-w-full scrollbar-hide">
              {normalizedFiles.map((file, i) => (
                <button
                  key={`${file.path}-${i}`}
                  onClick={() => {
                    setCurrentIndex(i);
                    setRotation(0);
                    setZoom(1);
                  }}
                  className={`relative h-8 w-8 md:h-10 md:w-10 flex-shrink-0 rounded-lg overflow-hidden transition-all duration-300 border-2 ${
                    currentIndex === i ? 'border-blue-500 scale-105' : 'border-transparent opacity-40'
                  }`}
                >
                  {isPdfEvidence(file) ? (
                    <div className="h-full w-full bg-slate-800 flex items-center justify-center text-blue-400">
                      <FileText size={12} />
                    </div>
                  ) : (
                    <img src={getEvidenceUrl(file)} className="h-full w-full object-cover" alt="Thumb" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default PreviewModal;
