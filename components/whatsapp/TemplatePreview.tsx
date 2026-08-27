'use client';

import React from 'react';
import { ExternalLink, Phone, CornerDownLeft, Image as ImageIcon, FileText, Video, CheckCheck } from 'lucide-react';
import { TemplateButton } from '@/services/templates';

interface TemplatePreviewProps {
  headerType?: 'NONE' | 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT' | string;
  headerText?: string;
  headerMediaUrl?: string;
  bodyText: string;
  footerText?: string;
  buttons?: TemplateButton[];
  variables?: Record<string, string>; // { "1": "John", "2": "ORD1001" }
  businessName?: string;
}

export function TemplatePreview({
  headerType = 'NONE',
  headerText = '',
  headerMediaUrl,
  bodyText,
  footerText,
  buttons = [],
  variables = {},
  businessName = 'WhatsApp Business',
}: TemplatePreviewProps) {
  // Interpolate body variables
  let previewBody = bodyText || 'Type your message body text here...';
  Object.entries(variables).forEach(([key, val]) => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    previewBody = previewBody.replace(regex, val || `{{${key}}}`);
  });

  // Interpolate header variables
  let previewHeader = headerText || '';
  Object.entries(variables).forEach(([key, val]) => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    previewHeader = previewHeader.replace(regex, val || `{{${key}}}`);
  });

  return (
    <div className="w-full max-w-[340px] mx-auto bg-[#EFEAE2] rounded-2xl border border-slate-300 shadow-md overflow-hidden flex flex-col font-sans">
      {/* WhatsApp Chat Bar */}
      <div className="bg-[#075E54] text-white px-3.5 py-2.5 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-emerald-700 border border-emerald-500/50 flex items-center justify-center font-bold text-xs">
          {businessName.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold leading-tight truncate">{businessName}</p>
          <p className="text-[10px] text-emerald-200">Official Business Account</p>
        </div>
      </div>

      {/* Chat Background & Message Bubble */}
      <div className="p-3.5 flex flex-col space-y-2 min-h-[260px] justify-end bg-[radial-gradient(#d1d7db_1px,transparent_1px)] [background-size:16px_16px]">
        <div className="max-w-[95%] bg-white rounded-lg rounded-tl-none shadow-xs border border-black/5 overflow-hidden text-slate-800 text-xs self-start">
          {/* 1. Header */}
          {headerType && headerType !== 'NONE' && (
            <div className="border-b border-slate-100 bg-slate-50/50">
              {headerType === 'TEXT' && previewHeader ? (
                <div className="px-3 pt-2.5 pb-1 font-bold text-slate-900 text-[13px]">
                  {previewHeader}
                </div>
              ) : headerType === 'IMAGE' ? (
                <div className="h-32 bg-slate-200 flex items-center justify-center text-slate-400 overflow-hidden">
                  {headerMediaUrl ? (
                    <img src={headerMediaUrl} alt="Header" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-slate-400" />
                  )}
                </div>
              ) : headerType === 'VIDEO' ? (
                <div className="h-32 bg-slate-800 flex items-center justify-center text-slate-400">
                  <Video className="w-8 h-8 text-slate-300" />
                </div>
              ) : headerType === 'DOCUMENT' ? (
                <div className="px-3 py-3 bg-slate-100 flex items-center gap-2 text-slate-600">
                  <FileText className="w-5 h-5 text-indigo-500" />
                  <span className="text-[11px] font-medium truncate">Document Attachment</span>
                </div>
              ) : null}
            </div>
          )}

          {/* 2. Body Text */}
          <div className="px-3 pt-2.5 pb-1.5 whitespace-pre-wrap leading-relaxed text-[12.5px]">
            {previewBody}
          </div>

          {/* 3. Footer & Timestamp */}
          <div className="px-3 pb-2 flex items-center justify-between gap-2 text-[10px] text-slate-400">
            <span>{footerText || ''}</span>
            <div className="flex items-center gap-1 shrink-0 ml-auto">
              <span>12:45 PM</span>
              <CheckCheck className="w-3.5 h-3.5 text-sky-500" />
            </div>
          </div>

          {/* 4. Action Buttons */}
          {buttons && buttons.length > 0 && (
            <div className="border-t border-slate-100 divide-y divide-slate-100 bg-slate-50/50">
              {buttons.map((btn, idx) => (
                <div
                  key={idx}
                  className="py-2 px-3 text-center text-indigo-600 font-medium text-xs flex items-center justify-center gap-1.5 hover:bg-slate-100 transition-colors"
                >
                  {btn.type === 'URL' && <ExternalLink className="w-3 h-3 text-indigo-500" />}
                  {btn.type === 'PHONE_NUMBER' && <Phone className="w-3 h-3 text-indigo-500" />}
                  {btn.type === 'QUICK_REPLY' && <CornerDownLeft className="w-3 h-3 text-indigo-500" />}
                  <span className="truncate">{btn.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
