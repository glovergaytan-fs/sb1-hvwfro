import React from 'react';

interface VideoPreviewProps {
  videoUrl: string;
}

const VideoPreview: React.FC<VideoPreviewProps> = ({ videoUrl }) => {
  return (
    <div className="mt-4">
      <h3 className="text-lg font-medium text-gray-900 mb-2">Video Preview</h3>
      <video controls className="w-full rounded-lg shadow-lg">
        <source src={videoUrl} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      <a
        href={videoUrl}
        download="visualizer.mp4"
        className="mt-2 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        Download Video
      </a>
    </div>
  );
};

export default VideoPreview;