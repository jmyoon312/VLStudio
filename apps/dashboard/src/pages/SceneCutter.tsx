import React from 'react';

const SceneCutter: React.FC = () => {
  const getSrc = () => {
    if (typeof window !== 'undefined') {
      if (window.location.protocol === 'file:') {
        return './scenecutter/index.html';
      }
      return '/scenecutter/index.html';
    }
    return '/scenecutter/index.html';
  };

  return (
    <div className="w-full h-full flex flex-col bg-background">
      <iframe
        src={getSrc()}
        className="w-full h-full border-none"
        title="Scene Cutter Pro"
        sandbox="allow-scripts allow-same-origin allow-downloads allow-modals allow-popups allow-forms"
        allow="cross-origin-isolated"
      />
    </div>
  );
};

export default SceneCutter;
