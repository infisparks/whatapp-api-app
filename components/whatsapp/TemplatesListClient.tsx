'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { formatDate } from '@/lib/utils';
import {
  LayoutTemplate,
  Search,
  RefreshCw,
  Trash2,
  Send,
  Plus,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { TemplatePreview } from './TemplatePreview';

interface TemplatesListClientProps {
  initialTemplates: any[];
}

export function TemplatesListClient({ initialTemplates }: TemplatesListClientProps) {
  const router = useRouter();
  const [templates, setTemplates] = useState(initialTemplates);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/v1/whatsapp/templates/sync', { method: 'POST' });
      const data = await res.json();
      if (!res.ok || data.error) {
        alert(data.error || 'Failed to sync templates from Meta');
      } else {
        router.refresh();
      }
    } catch {
      alert('Error during template sync');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete template "${name}"?`)) return;
    try {
      const res = await fetch(`/api/v1/whatsapp/templates/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setTemplates((prev) => prev.filter((t) => t.id !== id));
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete template');
      }
    } catch {
      alert('Network error deleting template');
    }
  };

  const filteredTemplates = templates.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.body.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === 'ALL' || t.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-4">
      {/* Search & Category Filter Bar */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-100/80 w-fit text-xs font-medium">
            {['ALL', 'MARKETING', 'UTILITY', 'AUTHENTICATION'].map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  activeCategory === cat
                    ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {cat === 'ALL' ? 'All Templates' : cat}
              </button>
            ))}
          </div>

          {/* Search and Sync */}
          <div className="flex items-center gap-2.5">
            <div className="w-full sm:w-64">
              <Input
                placeholder="Search templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                leftElement={<Search className="w-4 h-4" />}
                className="h-9 text-xs"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              isLoading={isSyncing}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              className="text-xs h-9"
            >
              Sync Meta
            </Button>
          </div>
        </div>
      </Card>

      {/* Templates Table / Cards */}
      {filteredTemplates.length === 0 ? (
        <Card className="py-16 text-center">
          <div className="max-w-md mx-auto space-y-3">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
              <LayoutTemplate className="w-6 h-6" />
            </div>
            <div>
              <p className="text-base font-bold text-slate-900">No message templates found</p>
              <p className="text-xs text-slate-500 mt-1">
                Create a new template to submit for Meta approval, or sync existing templates from your connected WABA.
              </p>
            </div>
            <div className="pt-2 flex items-center justify-center gap-2">
              <Link href="/dashboard/templates/create">
                <Button size="sm" leftIcon={<Plus className="w-4 h-4" />}>
                  Create Template
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={handleSync} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
                Sync from Meta
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Template Name</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Language</th>
                  <th className="py-3.5 px-4">Meta Status</th>
                  <th className="py-3.5 px-4">Quality</th>
                  <th className="py-3.5 px-4">Last Updated</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredTemplates.map((tpl) => (
                  <tr key={tpl.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedTemplate(tpl)}
                          className="font-bold text-slate-900 hover:text-indigo-600 transition-colors text-left"
                        >
                          {tpl.name}
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate max-w-[240px] mt-0.5">
                        {tpl.body}
                      </p>
                      {tpl.rejectionReason && (
                        <p className="text-[10px] text-rose-600 mt-1 font-medium flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          Rejection: {tpl.rejectionReason}
                        </p>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-md font-medium text-[11px] bg-slate-100 text-slate-700">
                        {tpl.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                      {tpl.language}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant="status" status={tpl.status} />
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[11px] font-semibold ${
                          tpl.qualityRating === 'GREEN'
                            ? 'text-emerald-600'
                            : tpl.qualityRating === 'YELLOW'
                            ? 'text-amber-600'
                            : 'text-slate-400'
                        }`}
                      >
                        {tpl.qualityRating || 'UNKNOWN'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">
                      {formatDate(tpl.updatedAt)}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedTemplate(tpl)}
                          className="h-8 px-2 text-slate-500 hover:text-slate-900"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>

                        {tpl.status === 'APPROVED' && (
                          <Link href={`/dashboard/messages/send?template=${encodeURIComponent(tpl.name)}`}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-2.5 text-xs text-indigo-600 hover:text-indigo-700 border-indigo-200"
                              leftIcon={<Send className="w-3 h-3" />}
                            >
                              Send
                            </Button>
                          </Link>
                        )}

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(tpl.id, tpl.name)}
                          className="h-8 px-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Template Preview Modal */}
      {selectedTemplate && (
        <Modal
          isOpen={Boolean(selectedTemplate)}
          onClose={() => setSelectedTemplate(null)}
          title={`Template Preview: ${selectedTemplate.name}`}
          description={`Language: ${selectedTemplate.language} • Status: ${selectedTemplate.status}`}
          maxWidth="md"
        >
          <div className="py-2">
            <TemplatePreview
              headerType={selectedTemplate.headerType}
              headerText={selectedTemplate.headerContent}
              bodyText={selectedTemplate.body}
              footerText={selectedTemplate.footer}
              buttons={
                selectedTemplate.buttonsJson
                  ? JSON.parse(selectedTemplate.buttonsJson)
                  : []
              }
              variables={{
                '1': 'Sample User',
                '2': '#ORD-1001',
                '3': '$49.99',
              }}
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
