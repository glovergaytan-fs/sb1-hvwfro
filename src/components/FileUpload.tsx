import React from 'react';

interface FileUploadProps {
  label: string;
  icon: React.ReactNode;
  onFileSelect: (file: File) => void;
  accept: string;
}

const FileUpload: React.FC<FileUploadProps> = ({ label, icon, onFileSelect, accept }) => {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  return (
    <div className="flex items-center justify-center w-full">
      <label htmlFor={`dropzone-file-${label}`} className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          {icon}
          <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">{label}</span></p>
          <p className="text-xs text-gray-500">Click to upload or drag and drop</p>
        </div>
        <input id={`dropzone-file-${label}`} type="file" className="hidden" onChange={handleFileChange} accept={accept} />
      </label>
    </div>
  );
};

export default FileUpload;