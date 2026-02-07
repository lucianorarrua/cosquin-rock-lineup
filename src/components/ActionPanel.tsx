import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import html2canvas from 'html2canvas';
import type { FestivalEvent, ScheduleInfo } from '../lib/types';
import { generateICS } from '../lib/data';
import {
  CopyIcon,
  ShareIcon,
  CalendarIcon,
  CheckIcon,
  DownloadIcon,
  EditIcon,
  ChevronDownIcon,
  ImageIcon,
} from './Icons';
import Toast from './Toast';
import AgendaImagePreview from './AgendaImagePreview';

// ─── Types ─────────────────────────────────────────────────────────

type ProcessingState = 'idle' | 'sharing' | 'downloading';

interface ToastInfo {
  message: string;
  type: 'success' | 'warning';
  linkText?: string;
  linkUrl?: string;
}

function isInstagramWebView(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /Instagram/i.test(ua);
}

interface ShareMenuProps {
  isOpen: boolean;
  onToggle: () => void;
  processingState: ProcessingState;
  copied: boolean;
  onCopy: () => void;
  onNativeShare: () => void;
}

interface ExportMenuProps {
  isOpen: boolean;
  onToggle: () => void;
  processingState: ProcessingState;
  onExportImage: () => void;
  onExportICS: () => void;
}

interface ActionPanelProps {
  selectedIds: Set<string>;
  allEvents: FestivalEvent[];
  readOnly: boolean;
  onSwitchToEdit: () => void;
  schedules: ScheduleInfo[];
  showOnlySelected: boolean;
  onToggleShowOnlySelected: () => void;
}

// ─── Sub-components ────────────────────────────────────────────────

function ShareMenuButton({
  isOpen,
  onToggle,
  processingState,
  copied,
  onCopy,
  onNativeShare,
}: ShareMenuProps) {
  const isProcessing = processingState === 'sharing';

  return (
    <div className="menu-container">
      <button
        className="btn-primary"
        onClick={onToggle}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <ShareIcon />
        {isProcessing ? 'Generando...' : 'Compartir'}
        {!isProcessing && <ChevronDownIcon />}
      </button>

      {isOpen && (
        <div className="dropdown-menu">
          <button onClick={onCopy} className="menu-item">
            {copied ? <CheckIcon /> : <CopyIcon />}
            {copied ? 'Copiado al portapapeles' : 'Copiar enlace'}
          </button>
          <button
            onClick={onNativeShare}
            className="menu-item"
            disabled={processingState !== 'idle'}
          >
            <ShareIcon />
            {isProcessing ? 'Generando...' : 'Compartir con imagen'}
          </button>
        </div>
      )}
    </div>
  );
}

function ExportMenuButton({
  isOpen,
  onToggle,
  processingState,
  onExportImage,
  onExportICS,
}: ExportMenuProps) {
  const isProcessing = processingState === 'downloading';

  return (
    <div className="menu-container">
      <button
        className="btn-secondary"
        onClick={onToggle}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <CalendarIcon />
        {isProcessing ? 'Generando...' : 'Exportar'}
        {!isProcessing && <ChevronDownIcon />}
      </button>

      {isOpen && (
        <div className="dropdown-menu">
          <button
            onClick={onExportImage}
            className="menu-item"
            disabled={processingState !== 'idle'}
          >
            <ImageIcon />
            {isProcessing ? 'Generando...' : 'Descargar imagen'}
          </button>
          <button onClick={onExportICS} className="menu-item">
            <DownloadIcon />
            Descargar archivo ICS
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────

export function ActionPanel({
  selectedIds,
  allEvents,
  readOnly,
  onSwitchToEdit,
  schedules,
  showOnlySelected,
  onToggleShowOnlySelected,
}: ActionPanelProps) {
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [toastInfo, setToastInfo] = useState<ToastInfo | null>(null);
  const [processingState, setProcessingState] =
    useState<ProcessingState>('idle');
  const menuRef = useRef<HTMLDivElement>(null);
  const agendaImageRef = useRef<HTMLDivElement>(null);

  const selectedEvents = useMemo(
    () => allEvents.filter((e) => selectedIds.has(e.id)),
    [allEvents, selectedIds]
  );

  const shareText = '¡Mirá mi agenda para el Cosquín Rock 2026! 🎸🔥';
  const shareTitle = 'Mi agenda Cosquín Rock 2026';

  // ─── Effects ───────────────────────────────────────────────────────

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.set('ids', [...selectedIds].join(','));
    url.searchParams.set('view', 'shared');
    url.searchParams.set('filter', 'selected');
    setShareUrl(url.toString());
  }, [selectedIds]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsShareMenuOpen(false);
        setIsExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ─── Handlers ──────────────────────────────────────────────────────

  const toggleShareMenu = useCallback(() => {
    setIsShareMenuOpen((prev) => !prev);
    setIsExportMenuOpen(false);
  }, []);

  const toggleExportMenu = useCallback(() => {
    setIsExportMenuOpen((prev) => !prev);
    setIsShareMenuOpen(false);
  }, []);

  const copyShareLink = useCallback(
    async ({ closeMenu = true, showToast = false } = {}) => {
      let copiedOk = false;
      try {
        await navigator.clipboard.writeText(shareUrl);
        copiedOk = true;
      } catch {
        try {
          const ta = document.createElement('textarea');
          ta.value = shareUrl;
          document.body.appendChild(ta);
          ta.select();
          copiedOk = document.execCommand('copy');
          document.body.removeChild(ta);
        } catch {
          copiedOk = false;
        }
      }

      if (!copiedOk) throw new Error('copy_failed');

      setCopied(true);
      setTimeout(() => setCopied(false), 2000);

      if (closeMenu) setIsShareMenuOpen(false);
      if (showToast) {
        setToastInfo({
          message: 'Enlace copiado. Podés compartirlo donde quieras.',
          type: 'success',
        });
      }
    },
    [shareUrl]
  );

  const handleCopy = useCallback(async () => {
    try {
      await copyShareLink({ closeMenu: true, showToast: true });
    } catch {
      setToastInfo({
        message:
          'No se pudo copiar el enlace. Abrí el sitio en Chrome o Safari.',
        type: 'warning',
      });
    }
  }, [copyShareLink]);

  const handleExportICS = useCallback(() => {
    const ics = generateICS(selectedEvents);
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cosquin-rock-2026.ics';
    a.click();
    URL.revokeObjectURL(url);
    setIsExportMenuOpen(false);
    setToastInfo({
      message: 'Calendario descargado!',
      type: 'success',
      linkText: 'Ver cómo importarlo',
      linkUrl: '/faq',
    });
  }, [selectedEvents]);

  const generateAgendaImage = useCallback(async (): Promise<Blob | null> => {
    if (!agendaImageRef.current || selectedEvents.length === 0) return null;

    await new Promise((resolve) => setTimeout(resolve, 150));

    const canvas = await html2canvas(agendaImageRef.current, {
      backgroundColor: '#0a0a0f',
      scale: 2,
      useCORS: true,
      logging: false,
    });

    return new Promise<Blob | null>((resolve) =>
      canvas.toBlob((result) => resolve(result), 'image/png')
    );
  }, [selectedEvents]);

  const downloadAgendaImage = useCallback((blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = 'mi-agenda-cosquin-rock-2026.png';
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleExportImage = useCallback(async () => {
    if (selectedEvents.length === 0) return;

    if (isInstagramWebView()) {
      setToastInfo({
        message:
          'Instagram bloquea las descargas. Abrí el sitio en Chrome o Safari para guardar la imagen.',
        type: 'warning',
      });
      setIsExportMenuOpen(false);
      return;
    }

    setProcessingState('downloading');
    setIsExportMenuOpen(false);

    try {
      const blob = await generateAgendaImage();
      if (blob) downloadAgendaImage(blob);
    } catch (error) {
      console.error('Error generating image:', error);
    } finally {
      setProcessingState('idle');
    }
  }, [selectedEvents, generateAgendaImage, downloadAgendaImage]);

  const handleNativeShare = useCallback(async () => {
    if (selectedEvents.length === 0) return;

    setProcessingState('sharing');
    setIsShareMenuOpen(false);

    try {
      let blob: Blob | null = null;
      try {
        blob = await generateAgendaImage();
      } catch (error) {
        console.warn('Error generating image for share:', error);
      }

      if (!blob && isInstagramWebView()) {
        setToastInfo({
          message:
            'Instagram bloquea la imagen. Se compartirá solo el enlace. Si falla, abrí el sitio en Chrome o Safari.',
          type: 'warning',
        });
      }

      if (blob) {
        const timestamp = new Date()
          .toISOString()
          .replace(/[:.]/g, '-')
          .slice(0, 19);
        const fileName = `mi-agenda-cosquin-rock-2026-${timestamp}.png`;
        const file = new File([blob], fileName, { type: 'image/png' });

        const canShare =
          'share' in navigator &&
          (!navigator.canShare || navigator.canShare({ files: [file] }));

        if (canShare) {
          await navigator.share({
            title: shareTitle,
            text: shareText,
            url: shareUrl,
            files: [file],
          });
          return;
        }

        downloadAgendaImage(blob);
      }

      await navigator.share({
        title: shareTitle,
        text: shareText,
        url: shareUrl,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;

      // Plan B: share without image
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        setToastInfo({
          message:
            'No se pudo adjuntar la imagen, pero se compartió el enlace.',
          type: 'warning',
        });
      } catch (fallbackError) {
        if (
          fallbackError instanceof DOMException &&
          fallbackError.name === 'AbortError'
        )
          return;
        console.error('Error sharing:', fallbackError);
        try {
          await copyShareLink({ closeMenu: false, showToast: true });
        } catch (copyError) {
          console.error('Error copying link:', copyError);
          setToastInfo({
            message:
              'El navegador de Instagram no permite compartir. Abrí el sitio en Chrome o Safari.',
            type: 'warning',
          });
        }
      }
    } finally {
      setProcessingState('idle');
    }
  }, [
    selectedEvents,
    generateAgendaImage,
    downloadAgendaImage,
    copyShareLink,
    shareText,
    shareUrl,
  ]);

  // ─── Shared UI Elements ────────────────────────────────────────────

  const actionMenus = (
    <div className="action-menus" ref={menuRef}>
      <ShareMenuButton
        isOpen={isShareMenuOpen}
        onToggle={toggleShareMenu}
        processingState={processingState}
        copied={copied}
        onCopy={handleCopy}
        onNativeShare={handleNativeShare}
      />
      <ExportMenuButton
        isOpen={isExportMenuOpen}
        onToggle={toggleExportMenu}
        processingState={processingState}
        onExportImage={handleExportImage}
        onExportICS={handleExportICS}
      />
    </div>
  );

  const agendaPreview = (
    <AgendaImagePreview
      ref={agendaImageRef}
      selectedEvents={selectedEvents}
      schedules={schedules}
    />
  );

  // ─── Render ────────────────────────────────────────────────────────

  if (readOnly) {
    return (
      <div className="action-panel">
        <div className="action-status">
          <div className="status-indicator active" />
          <span className="action-panel-text">
            Agenda compartida ({selectedIds.size} artistas)
          </span>
        </div>

        {actionMenus}

        <button onClick={onSwitchToEdit} className="btn-secondary">
          <EditIcon />
          Crear mi agenda
        </button>

        {agendaPreview}
      </div>
    );
  }

  if (selectedIds.size === 0) {
    return (
      <div className="action-panel-hint">
        <p>Seleccioná los artistas en la grilla para armar tu recorrido.</p>
      </div>
    );
  }

  return (
    <div className="action-panel">
      <div className="action-status">
        <div className="status-indicator active" />
        <span className="action-panel-text">
          {selectedIds.size} artista{selectedIds.size !== 1 ? 's' : ''}{' '}
          seleccionado{selectedIds.size !== 1 ? 's' : ''}
        </span>
        <div className="filter-toggle-group">
          <button
            className={`filter-toggle-option ${!showOnlySelected ? 'filter-toggle-option--active' : ''}`}
            onClick={() => showOnlySelected && onToggleShowOnlySelected()}
            aria-pressed={!showOnlySelected}
          >
            Todos
          </button>
          <button
            className={`filter-toggle-option ${showOnlySelected ? 'filter-toggle-option--active' : ''}`}
            onClick={() => !showOnlySelected && onToggleShowOnlySelected()}
            aria-pressed={showOnlySelected}
          >
            Mi Agenda
          </button>
        </div>
      </div>

      {actionMenus}

      {toastInfo && (
        <Toast
          message={toastInfo.message}
          type={toastInfo.type}
          linkText={toastInfo.linkText}
          linkUrl={toastInfo.linkUrl}
          onClose={() => setToastInfo(null)}
        />
      )}

      {agendaPreview}
    </div>
  );
}
