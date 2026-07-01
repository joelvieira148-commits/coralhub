import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Download, ExternalLink, FileText, Loader2 } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { openExternalUrl } from '@/lib/native-app';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const getRenderWidth = (container, pageWidth) => {
  const availableWidth = container?.clientWidth || pageWidth;
  return Math.max(260, Math.min(availableWidth, 980));
};

function PdfPageCanvas({ pdf, pageNumber }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const renderTaskRef = useRef(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    let resizeTimer;

    const renderPage = async () => {
      try {
        setError('');
        renderTaskRef.current?.cancel();

        const page = await pdf.getPage(pageNumber);
        if (cancelled) return;

        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const baseViewport = page.getViewport({ scale: 1 });
        const width = getRenderWidth(container, baseViewport.width);
        const scale = width / baseViewport.width;
        const viewport = page.getViewport({ scale });
        const outputScale = window.devicePixelRatio || 1;
        const context = canvas.getContext('2d');

        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const transform = outputScale !== 1
          ? [outputScale, 0, 0, outputScale, 0, 0]
          : null;

        const renderTask = page.render({
          canvasContext: context,
          viewport,
          transform,
        });

        renderTaskRef.current = renderTask;
        await renderTask.promise;
      } catch (err) {
        if (cancelled || err?.name === 'RenderingCancelledException') return;
        setError('Nao foi possivel renderizar esta pagina.');
      }
    };

    renderPage();

    const resizeObserver = new ResizeObserver(() => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(renderPage, 150);
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      cancelled = true;
      clearTimeout(resizeTimer);
      resizeObserver.disconnect();
      renderTaskRef.current?.cancel();
    };
  }, [pdf, pageNumber]);

  return (
    <div ref={containerRef} className="w-full flex justify-center">
      {error ? (
        <div className="w-full rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      ) : (
        <canvas ref={canvasRef} className="max-w-full rounded bg-white shadow-sm" />
      )}
    </div>
  );
}

function PdfDocumentViewer({ url }) {
  const [pdf, setPdf] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const loadingTask = pdfjsLib.getDocument({ url });

    setLoading(true);
    setError('');
    setPdf(null);
    setPageCount(0);

    loadingTask.promise
      .then((loadedPdf) => {
        if (cancelled) return;
        setPdf(loadedPdf);
        setPageCount(loadedPdf.numPages);
      })
      .catch(() => {
        if (cancelled) return;
        setError('Nao foi possivel carregar o PDF neste dispositivo.');
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      loadingTask.destroy();
    };
  }, [url]);

  if (loading) {
    return (
      <div className="h-56 flex items-center justify-center bg-slate-50 text-slate-500">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-start gap-2 bg-amber-50 text-amber-800 px-3 py-4 text-xs">
        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <span>{error} Use o botao Abrir para visualizar fora do app.</span>
      </div>
    );
  }

  return (
    <div className="max-h-[70vh] overflow-y-auto bg-slate-100 p-2 space-y-3">
      {Array.from({ length: pageCount }, (_, index) => (
        <PdfPageCanvas key={index + 1} pdf={pdf} pageNumber={index + 1} />
      ))}
    </div>
  );
}

export default function PartituraViewer({ url, canDownload = false, primary = '#6366f1' }) {
  if (!url) return null;

  const handleOpen = () => {
    openExternalUrl(url);
  };

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-gray-50">
        <span className="text-xs font-medium text-gray-600 flex items-center gap-1">
          <FileText className="w-3 h-3" /> Partitura
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpen}
            className="inline-flex items-center gap-1 text-xs font-medium"
            style={{ color: primary }}
          >
            <ExternalLink className="w-3 h-3" />
            Abrir
          </button>
          {canDownload && (
            <a
              href={url}
              download
              className="inline-flex items-center gap-1 text-xs font-medium"
              style={{ color: primary }}
            >
              <Download className="w-3 h-3" />
              Baixar
            </a>
          )}
        </div>
      </div>
      <PdfDocumentViewer url={url} />
    </div>
  );
}
