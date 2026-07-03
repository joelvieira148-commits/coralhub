import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Download, ExternalLink, FileImage, FileText, Loader2, Minus, Plus } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import pdfjsWorker from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
import { openExternalUrl } from '@/lib/native-app';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const MIN_ZOOM = 0.75;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.25;
const PDF_LOAD_TIMEOUT_MS = 20000;

const getGoogleViewerUrl = (url) => (
  `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(url)}`
);

const isImagePartitura = (url = '', fileType = '') => {
  if (/^image\//i.test(fileType || '')) return true;

  try {
    const decoded = decodeURIComponent(String(url).split('?')[0]);
    return /\.(apng|avif|gif|heic|heif|jpe?g|png|webp)$/i.test(decoded);
  } catch {
    return /\.(apng|avif|gif|heic|heif|jpe?g|png|webp)$/i.test(String(url).split('?')[0]);
  }
};

const withTimeout = (promise, ms, message) => new Promise((resolve, reject) => {
  const timer = window.setTimeout(() => {
    reject(new Error(message));
  }, ms);

  promise
    .then(resolve)
    .catch(reject)
    .finally(() => window.clearTimeout(timer));
});

const getRenderWidth = (container, pageWidth, zoom = 1) => {
  const availableWidth = container?.clientWidth || pageWidth;
  return Math.max(260, Math.min(availableWidth, 980)) * zoom;
};

function EmbeddedPdfFallback({ url, reason = '' }) {
  const [mode, setMode] = useState('google');
  const [viewerUrl, setViewerUrl] = useState(() => getGoogleViewerUrl(url));
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    setViewerUrl(mode === 'direct' ? url : getGoogleViewerUrl(url));
  }, [mode, url]);

  useEffect(() => {
    setMode('google');
    setZoom(1);
  }, [url]);

  const zoomOut = () => setZoom((current) => Math.max(MIN_ZOOM, Number((current - ZOOM_STEP).toFixed(2))));
  const zoomIn = () => setZoom((current) => Math.min(MAX_ZOOM, Number((current + ZOOM_STEP).toFixed(2))));

  return (
    <div className="bg-slate-100">
      <div className="flex items-start gap-2 border-b border-amber-100 bg-amber-50 px-3 py-3 text-xs text-amber-800">
        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <span>
          {reason || 'Modo compativel aberto dentro da pagina com zoom.'}
          {' '}Use + e - para aproximar.
        </span>
      </div>
      <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-2 py-2">
        <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setMode('google')}
            className={`rounded-md px-2 py-1 text-xs font-semibold ${mode === 'google' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
          >
            Google
          </button>
          <button
            type="button"
            onClick={() => setMode('direct')}
            className={`rounded-md px-2 py-1 text-xs font-semibold ${mode === 'direct' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
          >
            Direto
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={zoomOut}
            disabled={zoom <= MIN_ZOOM}
            className="rounded-lg border border-slate-200 p-1.5 text-slate-600 disabled:opacity-40"
            title="Diminuir"
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="min-w-[48px] text-center text-xs font-semibold text-slate-600">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={zoomIn}
            disabled={zoom >= MAX_ZOOM}
            className="rounded-lg border border-slate-200 p-1.5 text-slate-600 disabled:opacity-40"
            title="Aumentar"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="h-[70vh] overflow-auto bg-white">
        <iframe
          key={viewerUrl}
          src={viewerUrl}
          title="Visualizador de PDF"
          className="bg-white"
          referrerPolicy="no-referrer"
          style={{
            width: `${100 * zoom}%`,
            height: `${70 * zoom}vh`,
            border: 0,
          }}
        />
      </div>
    </div>
  );
}

function ImagePartituraViewer({ url }) {
  const [zoom, setZoom] = useState(1);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setZoom(1);
    setFailed(false);
  }, [url]);

  const zoomOut = () => setZoom((current) => Math.max(MIN_ZOOM, Number((current - ZOOM_STEP).toFixed(2))));
  const zoomIn = () => setZoom((current) => Math.min(MAX_ZOOM, Number((current + ZOOM_STEP).toFixed(2))));

  return (
    <div className="bg-slate-100">
      <div className="sticky top-0 z-20 flex items-center justify-end gap-1 border-b border-slate-200 bg-white px-2 py-2">
        <button
          type="button"
          onClick={zoomOut}
          disabled={zoom <= MIN_ZOOM}
          className="rounded-lg border border-slate-200 p-1.5 text-slate-600 disabled:opacity-40"
          title="Diminuir"
        >
          <Minus className="w-4 h-4" />
        </button>
        <span className="min-w-[48px] text-center text-xs font-semibold text-slate-600">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          onClick={zoomIn}
          disabled={zoom >= MAX_ZOOM}
          className="rounded-lg border border-slate-200 p-1.5 text-slate-600 disabled:opacity-40"
          title="Aumentar"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <div className="max-h-[70vh] overflow-auto bg-white p-2">
        {failed ? (
          <div className="flex items-start gap-2 bg-amber-50 px-3 py-4 text-xs text-amber-800">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>Nao foi possivel abrir esta imagem dentro da pagina. Toque em Abrir.</span>
          </div>
        ) : (
          <img
            src={url}
            alt="Partitura"
            className="mx-auto block max-w-none rounded bg-white shadow-sm"
            style={{ width: `${100 * zoom}%` }}
            onError={() => setFailed(true)}
          />
        )}
      </div>
    </div>
  );
}

function PdfPageCanvas({ pdf, pageNumber, zoom }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const renderTaskRef = useRef(null);
  const [rendering, setRendering] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    let resizeTimer;

    const renderPage = async () => {
      try {
        setError('');
        setRendering(true);
        renderTaskRef.current?.cancel();

        const page = await pdf.getPage(pageNumber);
        if (cancelled) return;

        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const baseViewport = page.getViewport({ scale: 1 });
        const width = getRenderWidth(container, baseViewport.width, zoom);
        const scale = width / baseViewport.width;
        const viewport = page.getViewport({ scale });
        const outputScale = Math.min(window.devicePixelRatio || 1, 2);
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
        if (!cancelled) {
          setRendering(false);
        }
      } catch (err) {
        if (cancelled || err?.name === 'RenderingCancelledException') return;
        setError('Nao foi possivel renderizar esta pagina.');
        setRendering(false);
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
  }, [pdf, pageNumber, zoom]);

  return (
    <div ref={containerRef} className="relative w-full flex justify-center overflow-auto">
      {rendering && !error && (
        <div className="absolute inset-x-0 top-4 z-10 flex justify-center pointer-events-none">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-xs text-slate-500 shadow">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Carregando pagina...
          </span>
        </div>
      )}
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

function PdfDocumentViewer({ url, forceEmbedded = false }) {
  const [pdf, setPdf] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    let loadingTask;

    setLoading(true);
    setError('');
    setPdf(null);
    setPageCount(0);
    setZoom(1);

    const loadPdf = async () => {
      const loadWithPdfJs = async (options, timeoutMessage) => {
        loadingTask = pdfjsLib.getDocument(options);
        return withTimeout(loadingTask.promise, PDF_LOAD_TIMEOUT_MS, timeoutMessage);
      };

      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), PDF_LOAD_TIMEOUT_MS);

      try {
        const response = await fetch(url, {
          mode: 'cors',
          credentials: 'omit',
          cache: 'no-store',
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Falha ao baixar PDF: ${response.status}`);
        }

        const data = await response.arrayBuffer();
        return await loadWithPdfJs(
          {
            data,
            disableWorker: true,
            useSystemFonts: true,
          },
          'Tempo esgotado ao renderizar PDF baixado.'
        );
      } catch (downloadError) {
        console.warn('Falha ao baixar PDF, tentando abrir pela URL:', downloadError);
        loadingTask?.destroy();
        return await loadWithPdfJs(
          {
            url,
            withCredentials: false,
            disableWorker: true,
            disableAutoFetch: true,
            disableStream: true,
            disableRange: true,
            useSystemFonts: true,
          },
          'Tempo esgotado ao carregar PDF pela URL.'
        );
      } finally {
        window.clearTimeout(timer);
      }
    };

    loadPdf()
      .then((loadedPdf) => {
        if (cancelled) return;
        setPdf(loadedPdf);
        setPageCount(loadedPdf.numPages);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Falha ao carregar PDF:', err);
        setError('Abrindo o PDF dentro da pagina em modo compativel.');
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      loadingTask?.destroy();
    };
  }, [url]);

  const zoomOut = () => setZoom((current) => Math.max(MIN_ZOOM, Number((current - ZOOM_STEP).toFixed(2))));
  const zoomIn = () => setZoom((current) => Math.min(MAX_ZOOM, Number((current + ZOOM_STEP).toFixed(2))));

  if (forceEmbedded) {
    return <EmbeddedPdfFallback url={url} />;
  }

  if (loading) {
    return (
      <div className="h-56 flex items-center justify-center bg-slate-50 text-slate-500">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <EmbeddedPdfFallback url={url} reason={error} />
    );
  }

  return (
    <div className="bg-slate-100">
      <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-2 py-2">
        <span className="text-xs font-semibold text-slate-600">
          {pageCount} pagina{pageCount !== 1 ? 's' : ''}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={zoomOut}
            disabled={zoom <= MIN_ZOOM}
            className="rounded-lg border border-slate-200 p-1.5 text-slate-600 disabled:opacity-40"
            title="Diminuir"
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="min-w-[48px] text-center text-xs font-semibold text-slate-600">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={zoomIn}
            disabled={zoom >= MAX_ZOOM}
            className="rounded-lg border border-slate-200 p-1.5 text-slate-600 disabled:opacity-40"
            title="Aumentar"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="max-h-[70vh] overflow-auto p-2">
        {pdf && Array.from({ length: pageCount }, (_, index) => (
          <div key={index + 1} className="mb-3 last:mb-0">
            <div className="mb-1 text-center text-[11px] font-semibold text-slate-500">
              Pagina {index + 1}
            </div>
            <PdfPageCanvas pdf={pdf} pageNumber={index + 1} zoom={zoom} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PartituraViewer({ url, fileType = '', canDownload = false, primary = '#6366f1' }) {
  const [forceEmbedded, setForceEmbedded] = useState(false);

  useEffect(() => {
    setForceEmbedded(false);
  }, [url]);

  if (!url) return null;
  const isImage = isImagePartitura(url, fileType);

  const handleOpen = () => {
    openExternalUrl(url);
  };

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-gray-50">
        <span className="text-xs font-medium text-gray-600 flex items-center gap-1">
          {isImage ? <FileImage className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
          Partitura
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
          {!isImage && (
            <button
              type="button"
              onClick={() => setForceEmbedded((current) => !current)}
              className="inline-flex items-center gap-1 text-xs font-medium"
              style={{ color: primary }}
            >
              <FileText className="w-3 h-3" />
              {forceEmbedded ? 'Leitor' : 'Modo compativel'}
            </button>
          )}
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
      {isImage ? (
        <ImagePartituraViewer url={url} />
      ) : (
        <PdfDocumentViewer url={url} forceEmbedded={forceEmbedded} />
      )}
    </div>
  );
}
