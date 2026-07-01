import { useEffect, useRef, useState } from 'react';
import {
  Download,
  FastForward,
  Pause,
  Play,
  Repeat,
  Rewind,
  X,
} from 'lucide-react';

const formatTime = (seconds = 0) => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${rest}`;
};

export default function FixedAudioPlayer({ track, onClose }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [repeat, setRepeat] = useState(false);
  const color = track?.color || '#6366f1';

  useEffect(() => {
    if (!track || !audioRef.current) return;

    const audio = audioRef.current;
    audio.load();
    setCurrentTime(0);
    setDuration(0);

    audio.play()
      .then(() => setPlaying(true))
      .catch((error) => {
        console.warn('Nao foi possivel iniciar o audio automaticamente:', error);
        setPlaying(false);
      });
  }, [track]);

  if (!track?.url) return null;

  const toggle = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      try {
        await audio.play();
        setPlaying(true);
      } catch (error) {
        console.warn('Nao foi possivel tocar o audio:', error);
      }
    } else {
      audio.pause();
      setPlaying(false);
    }
  };

  const seekBy = (amount) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.min(Math.max(audio.currentTime + amount, 0), audio.duration || 0);
  };

  const seekTo = (event) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Number(event.target.value);
  };

  return (
    <div className="fixed left-3 right-3 bottom-20 md:bottom-4 z-50 mx-auto max-w-3xl rounded-2xl border border-gray-200 bg-white shadow-2xl">
      <audio
        ref={audioRef}
        src={track.url}
        loop={repeat}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime || 0)}
        onEnded={() => {
          if (!repeat) {
            setPlaying(false);
            setCurrentTime(0);
          }
        }}
      />
      <div className="p-3 sm:p-4">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={toggle}
            className="mt-1 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-white shadow-md transition-transform hover:scale-105"
            style={{ backgroundColor: color }}
            title={playing ? 'Pausar' : 'Tocar'}
          >
            {playing ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-gray-900">{track.title || track.label || 'Musica'}</p>
                <p className="truncate text-xs text-gray-500">{track.subtitle || track.label || 'Audio'}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                title="Fechar player"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3">
              <input
                type="range"
                min="0"
                max={duration || 0}
                step="0.1"
                value={Math.min(currentTime, duration || 0)}
                onChange={seekTo}
                className="w-full accent-indigo-600"
              />
              <div className="mt-1 flex justify-between text-[11px] text-gray-400">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            <div className="mt-2 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => seekBy(-10)}
                className="rounded-full p-2 text-gray-600 hover:bg-gray-100"
                title="Voltar 10 segundos"
              >
                <Rewind className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => seekBy(10)}
                className="rounded-full p-2 text-gray-600 hover:bg-gray-100"
                title="Adiantar 10 segundos"
              >
                <FastForward className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setRepeat((value) => !value)}
                className={`rounded-full p-2 ${
                  repeat ? 'text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
                style={repeat ? { backgroundColor: color } : undefined}
                title={repeat ? 'Repetir ligado' : 'Repetir'}
              >
                <Repeat className="h-4 w-4" />
              </button>
              {track.allowDownload && (
                <a
                  href={track.url}
                  download
                  className="rounded-full p-2 text-gray-600 hover:bg-gray-100"
                  title="Baixar"
                >
                  <Download className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
