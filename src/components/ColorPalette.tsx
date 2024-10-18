import React from 'react';
import { HexColorPicker } from 'react-colorful';

interface ColorPaletteProps {
  colorPalette: {
    primary: string;
    secondary: string;
    accent: string;
  };
  setColorPalette: React.Dispatch<React.SetStateAction<{
    primary: string;
    secondary: string;
    accent: string;
  }>>;
}

const ColorPalette: React.FC<ColorPaletteProps> = ({ colorPalette, setColorPalette }) => {
  const handleColorChange = (color: string, key: 'primary' | 'secondary' | 'accent') => {
    setColorPalette(prev => ({ ...prev, [key]: color }));
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Color Palette</h3>
      <div className="flex space-x-4">
        {Object.entries(colorPalette).map(([key, value]) => (
          <div key={key} className="flex flex-col items-center">
            <label className="text-sm text-gray-600 capitalize">{key}</label>
            <div className="relative">
              <HexColorPicker
                color={value}
                onChange={(color) => handleColorChange(color, key as 'primary' | 'secondary' | 'accent')}
              />
              <div
                className="w-8 h-8 rounded-full border-2 border-white shadow-inner absolute -bottom-4 left-1/2 transform -translate-x-1/2"
                style={{ backgroundColor: value }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ColorPalette;