import { useRef, useState } from 'react';
import { Download, Pause, Play } from 'lucide-react';
import { getNaipeInfo } from '@/utils/coralTheme';

export default function AudioPlayer({ naipe, url, label, allowDownload = false, onPlay, isSelected = false }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef(null);
  const info = naipe ? getNaipeInfo(naipe) : { label: label || 'Audio', cor: '#6366f1' };

  if (onPlay) {
    return (
      <div
        className={`flex items-center gap-3 rounded-xl p-3 shadow-sm border transition-colors ${
          isSelected ? 'bg-indigo-50 border-indigo-100' : 'bg-white border-gray-100'
        }`}
      >
        <button
          type="button"
          onClick={() => onPlay({ url, label: info.label, color: info.cor, allowDownload })}
          className="w-9 h-9 rounded-full flex items-center justify-center text-white flex-shrink-0 shadow-md hover:scale-105 transition-transform"
          style={{ backgroundColor: info.cor }}
          title={`Tocar ${info.label}`}
        >
          <Play className="w-4 h-4 ml-0.5" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-700 truncate">{info.label}</p>
          <p className="text-[11px] text-gray-400 truncate">Toque no play para abrir no player fixo</p>
        </div>
        {allowDownload && (
          <a
            href={url}
            download
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Baixar"
            onClick={(event) => event.stopPropagation()}
          >
            <Download className="w-4 h-4" />
          </a>
        )}
      </div>
    );
  }

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setPlaying(!playing);
  };

  const onTimeUpdate = () => {
    if (!audioRef.current) return;
    const pct = (audioRef.current.currentTime / audioRef.current.duration) * 100;
    setProgress(Number.isNaN(pct) ? 0 : pct);
  };

  const onEnded = () => {
    setPlaying(false);
    setProgress(0);
  };

  const seek = (event) => {
    if (!audioRef.current) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const pct = (event.clientX - rect.left) / rect.width;
    audioRef.current.currentTime = pct * audioRef.current.duration;
  };

  return (
    <div className="flex items-center gap-3 bg-white rounded-xl p-3 shadow-sm border border-gray-100">
      <audio ref={audioRef} src={url} onTimeUpdate={onTimeUpdate} onEnded={onEnded} />
      <button
        type="button"
        onClick={toggle}
        className="w-9 h-9 rounded-full flex items-center justify-center text-white flex-shrink-0 shadow-md hover:scale-105 transition-transform"
        style={{ backgroundColor: info.cor }}
      >
        {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-700 truncate">{info.label}</p>
        <div
          className="mt-1 h-1.5 bg-gray-100 rounded-full cursor-pointer overflow-hidden"
          onClick={seek}
        >
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${progress}%`, backgroundColor: info.cor }}
          />
        </div>
      </div>
      {allowDownload && (
        <a
          href={url}
          download
          className="text-gray-400 hover:text-gray-600 transition-colors"
          title="Baixar"
        >
          <Download className="w-4 h-4" />
        </a>
      )}
    </div>
  );
}
