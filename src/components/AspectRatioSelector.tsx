import React from 'react';

interface AspectRatioSelectorProps {
  aspectRatio: string;
  setAspectRatio: React.Dispatch<React.SetStateAction<string>>;
}

const AspectRatioSelector: React.FC<AspectRatioSelectorProps> = ({ aspectRatio, setAspectRatio }) => {
  const ratios = ['16:9', '4:3', '1:1', '9:16'];

  return (
    <div className="space-y-2">
      <h3 className="text-lg font-medium text-gray-900">Aspect Ratio</h3>
      <div className="flex space-x-2">
        {ratios.map((ratio) => (
          <button
            key={ratio}
            onClick={() => setAspectRatio(ratio)}
            className={`px-3 py-1 rounded-md text-sm font-medium ${
              aspectRatio === ratio
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {ratio}
          </button>
        ))}
      </div>
    </div>
  );
};

export default AspectRatioSelector;