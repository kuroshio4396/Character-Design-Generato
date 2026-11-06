import React, { useRef, useState } from 'react';
import { UploadCloud, Image as ImageIcon, X } from 'lucide-react';

interface ImageUploadProps {
  image: string | null;
  setImage: (image: string | null) => void;
  setMimeType: (mime: string) => void;
}

export function ImageUpload({ image, setImage, setMimeType }: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setMimeType(file.type);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  return (
    <div className="w-full">
      {!image ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border border-dashed rounded-sm p-12 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-2 ${
            isDragging
              ? 'border-[#0078d4] bg-[#f3f2f1]'
              : 'border-gray-300 bg-white hover:border-gray-400 hover:bg-[#faf9f8]'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleChange}
            accept="image/*"
            className="hidden"
          />
          <div className="w-10 h-10 rounded-sm bg-[#f3f2f1] flex items-center justify-center mb-2 border border-gray-200">
            <UploadCloud className="w-5 h-5 text-[#201f1e]" />
          </div>
          <div>
            <p className="text-[12px] font-semibold text-[#201f1e]">上传参考图像</p>
            <p className="text-[11px] text-gray-500 mt-1">支持 JPG, PNG, WEBP</p>
          </div>
        </div>
      ) : (
        <div className="relative rounded-sm overflow-hidden group bg-[#f3f2f1] border border-gray-200 flex justify-center">
          <img src={image} alt="Upload preview" className="w-auto h-auto max-h-[400px] object-contain" />
          <div className="absolute inset-0 bg-white/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
            <button
              onClick={() => setImage(null)}
              className="flex items-center gap-2 px-4 py-1.5 bg-white border border-gray-300 text-[#201f1e] rounded shadow-sm text-sm transition-colors hover:bg-gray-50"
            >
              <X className="w-4 h-4" /> 移除
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
