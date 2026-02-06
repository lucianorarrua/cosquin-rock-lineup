import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import html2canvas from 'html2canvas';
import type { FestivalEvent, ScheduleInfo } from '../lib/types';
import { generateICS } from '../lib/data';
import {
  CopyIcon,
  ShareIcon,
  XIcon,
  CalendarIcon,
  CheckIcon,
  DownloadIcon,
  EditIcon,
  ChevronDownIcon,
  MessageCircleIcon,
  ImageIcon,
  InstagramIcon,
} from './Icons';
import Toast from './Toast';
import AgendaImagePreview from './AgendaImagePreview';

// ─── Share / Export Panel ──────────────────────────────────────────

interface ActionPanelProps {
  selectedIds: Set<string>;
  allEvents: FestivalEvent[];
  readOnly: boolean;
  onSwitchToEdit: () => void;
  schedules: ScheduleInfo[];
  showOnlySelected: boolean;
  onToggleShowOnlySelected: () => void;
  isMobile: boolean;
}

export function ActionPanel({
  selectedIds,
  allEvents,
  readOnly,
  onSwitchToEdit,
  schedules,
  showOnlySelected,
  onToggleShowOnlySelected,
  isMobile,
}: ActionPanelProps) {
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [isExportingImage, setIsExportingImage] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const agendaImageRef = useRef<HTMLDivElement>(null);

  const selectedEvents = useMemo(
    () => allEvents.filter((e) => selectedIds.has(e.id)),
    [allEvents, selectedIds]
  );

  const shareText = useMemo(
    () => `¡Mirá mi agenda para el Cosquín Rock 2026! 🎸🔥\n${shareUrl}`,
    [shareUrl]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.set('ids', [...selectedIds].join(','));
    url.searchParams.set('view', 'shared');
    url.searchParams.set('filter', 'selected');
    setShareUrl(url.toString());
  }, [selectedIds]);

  // Click outside to close menu
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

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      setIsShareMenuOpen(false);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = shareUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      setIsShareMenuOpen(false);
    }
  }, [shareUrl]);

  const handleShareWhatsApp = useCallback(() => {
    const text = encodeURIComponent(shareText);
    window.open(`https://wa.me/?text=${text}`, '_blank');
    setIsShareMenuOpen(false);
  }, [shareText]);

  const handleShareX = useCallback(() => {
    const text = encodeURIComponent(
      `¡Mi agenda para el Cosquín Rock 2026! 🎸🔥`
    );
    const url = encodeURIComponent(shareUrl);
    window.open(
      `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      '_blank'
    );
    setIsShareMenuOpen(false);
  }, [shareUrl]);

  const handleShareInstagram = useCallback(() => {
    const text = encodeURIComponent(
      `¡Mirá mi agenda para el Cosquín Rock 2026! 🎸🔥\n${shareUrl}`
    );
    window.open(`https://instagram.com/direct/new/?text=${text}`, '_blank');
    setIsShareMenuOpen(false);
  }, [shareUrl]);

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
    setShowToast(true);
  }, [selectedEvents]);

  const generateAgendaImage = useCallback(async (): Promise<Blob | null> => {
    if (!agendaImageRef.current || selectedEvents.length === 0) return null;

    // Small delay to allow menu to close and component to render
    await new Promise((resolve) => setTimeout(resolve, 150));

    const canvas = await html2canvas(agendaImageRef.current, {
      backgroundColor: '#0a0a0f',
      scale: 2,
      useCORS: true,
      logging: false,
    });

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((result) => resolve(result), 'image/png')
    );

    return blob;
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

    setIsExportingImage(true);
    setIsExportMenuOpen(false);

    try {
      const blob = await generateAgendaImage();
      if (!blob) return;
      downloadAgendaImage(blob);
    } catch (error) {
      console.error('Error generating image:', error);
    } finally {
      setIsExportingImage(false);
    }
  }, [selectedEvents, generateAgendaImage, downloadAgendaImage]);

  const handleNativeShare = useCallback(async () => {
    if (selectedEvents.length === 0) return;

    if (!('share' in navigator)) {
      handleShareWhatsApp();
      return;
    }

    setIsExportingImage(true);
    setIsShareMenuOpen(false);

    try {
      const blob = await generateAgendaImage();
      if (!blob) return;

      const file = new File([blob], 'mi-agenda-cosquin-rock-2026.png', {
        type: 'image/png',
      });

      if (navigator.canShare && !navigator.canShare({ files: [file] })) {
        downloadAgendaImage(blob);
        handleShareWhatsApp();
        return;
      }

      await navigator.share({
        title: 'Mi agenda Cosquín Rock 2026',
        text: shareText,
        url: shareUrl,
        files: [file],
      });
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        console.error('Error sharing:', error);
      }
    } finally {
      setIsExportingImage(false);
    }
  }, [selectedEvents, generateAgendaImage, downloadAgendaImage, handleShareWhatsApp, shareText, shareUrl]);

  if (readOnly) {
    return (
      <div className="action-panel">
        <div className="action-status">
          <div className="status-indicator active" />
          <span className="action-panel-text">
            Agenda compartida ({selectedIds.size} artistas)
          </span>
        </div>

        <div className="action-menus" ref={menuRef}>
          {isMobile ? (
            <button
              className="btn-primary"
              onClick={handleNativeShare}
              disabled={isExportingImage}
            >
              <ShareIcon />
              {isExportingImage ? 'Generando...' : 'Compartir'}
            </button>
          ) : (
            <div className="menu-container">
              <button
                className="btn-primary"
                onClick={() => {
                  setIsShareMenuOpen(!isShareMenuOpen);
                  setIsExportMenuOpen(false);
                }}
                aria-haspopup="true"
                aria-expanded={isShareMenuOpen}
              >
                <ShareIcon />
                Compartir
                <ChevronDownIcon />
              </button>

              {isShareMenuOpen && (
                <div className="dropdown-menu">
                  <button onClick={handleCopy} className="menu-item">
                    {copied ? <CheckIcon /> : <CopyIcon />}
                    {copied ? 'Copiado al portapapeles' : 'Copiar enlace'}
                  </button>
                  <button
                    onClick={handleShareWhatsApp}
                    className="menu-item"
                  >
                    <MessageCircleIcon />
                    Enviar por WhatsApp
                  </button>
                  <button
                    onClick={handleShareInstagram}
                    className="menu-item"
                  >
                    <InstagramIcon />
                    Enviar por Instagram
                  </button>
                  <button onClick={handleShareX} className="menu-item">
                    <XIcon />
                    Compartir en X
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="menu-container">
            <button
              className="btn-secondary"
              onClick={() => {
                setIsExportMenuOpen(!isExportMenuOpen);
                setIsShareMenuOpen(false);
              }}
              aria-haspopup="true"
              aria-expanded={isExportMenuOpen}
            >
              <CalendarIcon />
              Exportar
              <ChevronDownIcon />
            </button>

            {isExportMenuOpen && (
              <div className="dropdown-menu">
                <button
                  onClick={handleExportImage}
                  className="menu-item"
                  disabled={isExportingImage}
                >
                  <ImageIcon />
                  {isExportingImage ? 'Generando...' : 'Descargar imagen'}
                </button>
                <button onClick={handleExportICS} className="menu-item">
                  <DownloadIcon />
                  Descargar archivo ICS
                </button>
              </div>
            )}
          </div>
        </div>

        <button onClick={onSwitchToEdit} className="btn-secondary">
          <EditIcon />
          Crear mi agenda
        </button>

        {/* Hidden component for image export */}
        <AgendaImagePreview
          ref={agendaImageRef}
          selectedEvents={selectedEvents}
          schedules={schedules}
        />
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

      <div className="action-menus" ref={menuRef}>
        {isMobile ? (
          <button
            className="btn-primary"
            onClick={handleNativeShare}
            disabled={isExportingImage}
          >
            <ShareIcon />
            {isExportingImage ? 'Generando...' : 'Compartir'}
          </button>
        ) : (
          <div className="menu-container">
            <button
              className="btn-primary"
              onClick={() => {
                setIsShareMenuOpen(!isShareMenuOpen);
                setIsExportMenuOpen(false);
              }}
              aria-haspopup="true"
              aria-expanded={isShareMenuOpen}
            >
              <ShareIcon />
              Compartir
              <ChevronDownIcon />
            </button>

            {isShareMenuOpen && (
              <div className="dropdown-menu">
                <button onClick={handleCopy} className="menu-item">
                  {copied ? <CheckIcon /> : <CopyIcon />}
                  {copied ? 'Copiado al portapapeles' : 'Copiar enlace'}
                </button>
                <button
                  onClick={handleShareWhatsApp}
                  className="menu-item"
                >
                  <MessageCircleIcon />
                  Enviar por WhatsApp
                </button>
                <button
                  onClick={handleShareInstagram}
                  className="menu-item"
                >
                  <InstagramIcon />
                  Enviar por Instagram
                </button>
                <button onClick={handleShareX} className="menu-item">
                  <XIcon />
                  Compartir en X
                </button>
              </div>
            )}
          </div>
        )}

        <div className="menu-container">
          <button
            className="btn-secondary"
            onClick={() => {
              setIsExportMenuOpen(!isExportMenuOpen);
              setIsShareMenuOpen(false);
            }}
            aria-haspopup="true"
            aria-expanded={isExportMenuOpen}
          >
            <CalendarIcon />
            Exportar
            <ChevronDownIcon />
          </button>

          {isExportMenuOpen && (
            <div className="dropdown-menu">
              <button
                onClick={handleExportImage}
                className="menu-item"
                disabled={isExportingImage}
              >
                <ImageIcon />
                {isExportingImage ? 'Generando...' : 'Descargar imagen'}
              </button>
              <button onClick={handleExportICS} className="menu-item">
                <DownloadIcon />
                Descargar archivo ICS
              </button>
            </div>
          )}
        </div>
      </div>

      {showToast && (
        <Toast
          message="Calendario descargado!"
          linkText="Ver cómo importarlo"
          linkUrl="/faq"
          onClose={() => setShowToast(false)}
        />
      )}

      {/* Hidden component for image export */}
      <AgendaImagePreview
        ref={agendaImageRef}
        selectedEvents={selectedEvents}
        schedules={schedules}
      />
    </div>
  );
}
