import { HardDrive } from 'lucide-react';
import { formatarBytes, verificarEspaco } from '@/utils/storage';

export default function StorageIndicator({ coral, primary }) {
  const espaco = verificarEspaco(coral, 0);
  const cor = primary || '#6366f1';
  const proximoLimite = espaco.percentual >= 90;

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-center gap-2 mb-2">
        <HardDrive className="w-4 h-4" style={{ color: cor }} />
        <span className="text-sm font-semibold text-gray-700">Armazenamento</span>
        <span className="text-xs text-gray-400 ml-auto">
          {formatarBytes(espaco.usado)} de 1 TB
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${espaco.percentual}%`,
            backgroundColor: proximoLimite ? '#ef4444' : cor,
          }}
        />
      </div>
      <p className="text-xs text-gray-400 mt-1.5">
        {espaco.percentual.toFixed(2)}% usado · {formatarBytes(espaco.restante)} disponível
      </p>
    </div>
  );
}