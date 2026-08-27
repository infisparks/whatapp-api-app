'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { formatDisplayPhone, formatDate } from '@/lib/utils';
import {
  Users,
  Search,
  Plus,
  UploadCloud,
  Download,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  Send,
  User,
  Mail,
  Phone,
} from 'lucide-react';
import Link from 'next/link';

interface ContactsClientProps {
  initialContacts: any[];
}

export function ContactsClient({ initialContacts }: ContactsClientProps) {
  const router = useRouter();
  const [contacts, setContacts] = useState(initialContacts);
  const [searchTerm, setSearchTerm] = useState('');
  const [optInFilter, setOptInFilter] = useState<'ALL' | 'OPTED_IN' | 'OPTED_OUT'>('ALL');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Add Contact Form State
  const [newPhone, setNewPhone] = useState('');
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newTags, setNewTags] = useState('VIP, Customer');
  const [newOptedIn, setNewOptedIn] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // CSV Import State
  const [csvText, setCsvText] = useState('');
  const [importTags, setImportTags] = useState('CSV Import');
  const [isImporting, setIsImporting] = useState(false);

  // Filter contacts
  const filteredContacts = contacts.filter((c) => {
    const matchesSearch =
      (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm) ||
      (c.email || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesOptIn =
      optInFilter === 'ALL' ||
      (optInFilter === 'OPTED_IN' && c.optedIn) ||
      (optInFilter === 'OPTED_OUT' && !c.optedIn);

    return matchesSearch && matchesOptIn;
  });

  // Handle Add Single Contact
  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const tagsArray = newTags.split(',').map((t) => t.trim()).filter(Boolean);
      const res = await fetch('/api/v1/whatsapp/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: newPhone,
          name: newName,
          email: newEmail,
          tags: tagsArray,
          optedIn: newOptedIn,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        alert(data.error || 'Failed to create contact');
      } else {
        setIsAddModalOpen(false);
        setNewPhone('');
        setNewName('');
        setNewEmail('');
        router.refresh();
      }
    } catch {
      alert('Error creating contact');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Bulk CSV Import
  const handleBulkImport = async () => {
    if (!csvText.trim()) {
      alert('Please paste or upload CSV data');
      return;
    }

    setIsImporting(true);
    try {
      const parsed = Papa.parse(csvText.trim(), { header: true, skipEmptyLines: true });
      const rows = parsed.data;

      const tagsArray = importTags.split(',').map((t) => t.trim()).filter(Boolean);

      const res = await fetch('/api/v1/whatsapp/contacts/import-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contacts: rows,
          tags: tagsArray,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        alert(data.error || 'Failed to import CSV');
      } else {
        alert(data.message || 'Import successful');
        setIsImportModalOpen(false);
        setCsvText('');
        router.refresh();
      }
    } catch {
      alert('Error parsing or importing CSV');
    } finally {
      setIsImporting(false);
    }
  };

  // Handle Export CSV
  const handleExportCSV = () => {
    const csv = Papa.unparse(
      contacts.map((c) => ({
        Phone: c.phone,
        Name: c.name || '',
        Email: c.email || '',
        OptedIn: c.optedIn ? 'Yes' : 'No',
        CreatedAt: c.createdAt,
      }))
    );
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `whatsapp_contacts_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Compliance Note */}
      <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-100 flex items-center justify-between text-xs text-indigo-900">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>
            Only contacts with valid WhatsApp opt-in should receive marketing or template messages.
          </span>
        </div>
        <span className="font-semibold">{contacts.length} Total Contacts</span>
      </div>

      {/* Search & Actions Bar */}
      <Card className="p-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Opt-in Filter Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-100/80 text-xs font-medium w-fit">
            {[
              { id: 'ALL', label: 'All Contacts' },
              { id: 'OPTED_IN', label: 'Opted In' },
              { id: 'OPTED_OUT', label: 'Not Opted In' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setOptInFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  optInFilter === tab.id
                    ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Input & Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="w-full sm:w-56">
              <Input
                placeholder="Search by name, phone, tags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                leftElement={<Search className="w-4 h-4" />}
                className="h-9 text-xs"
              />
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsImportModalOpen(true)}
              leftIcon={<UploadCloud className="w-3.5 h-3.5" />}
              className="text-xs h-9"
            >
              Import CSV
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              leftIcon={<Download className="w-3.5 h-3.5" />}
              className="text-xs h-9"
            >
              Export
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAddModalOpen(true)}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              className="text-xs h-9"
            >
              Add Contact
            </Button>
          </div>
        </div>
      </Card>

      {/* Contacts Table */}
      {filteredContacts.length === 0 ? (
        <Card className="py-16 text-center">
          <div className="max-w-md mx-auto space-y-3">
            <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-base font-bold text-slate-900">No contacts found</p>
              <p className="text-xs text-slate-500 mt-1">
                Add contacts manually or import an audience from CSV.
              </p>
            </div>
            <div className="pt-2 flex items-center justify-center gap-2">
              <Button size="sm" onClick={() => setIsAddModalOpen(true)}>
                Add Contact
              </Button>
              <Button variant="outline" size="sm" onClick={() => setIsImportModalOpen(true)}>
                Import CSV
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
                  <th className="py-3.5 px-4">Contact</th>
                  <th className="py-3.5 px-4">WhatsApp Number</th>
                  <th className="py-3.5 px-4">Opt-In Status</th>
                  <th className="py-3.5 px-4">Tags</th>
                  <th className="py-3.5 px-4">Added</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredContacts.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-700">
                          {c.name ? c.name.slice(0, 2).toUpperCase() : 'WA'}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{c.name || 'Unnamed Contact'}</p>
                          {c.email && <p className="text-[11px] text-slate-400">{c.email}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-800">
                      {formatDisplayPhone(c.phone)}
                    </td>
                    <td className="py-3.5 px-4">
                      {c.optedIn ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> Opted In
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                          <XCircle className="w-3 h-3" /> Opted Out
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1">
                        {c.tags ? (
                          (typeof c.tags === 'string' ? JSON.parse(c.tags || '[]') : c.tags).map(
                            (tag: string, idx: number) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200"
                              >
                                {tag}
                              </span>
                            )
                          )
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">
                      {formatDate(c.createdAt)}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <Link href={`/dashboard/messages/send?recipient=${encodeURIComponent(c.phone)}`}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-2.5 text-xs text-indigo-600 hover:text-indigo-700 border-indigo-200"
                          leftIcon={<Send className="w-3 h-3" />}
                        >
                          Message
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Add Single Contact Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Contact"
        description="Enter customer phone number with international country code"
        maxWidth="md"
      >
        <form onSubmit={handleAddContact} className="space-y-4">
          <Input
            label="Phone Number"
            placeholder="+91 98765 43210 or 919876543210"
            required
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            leftElement={<Phone className="w-4 h-4" />}
          />

          <Input
            label="Full Name (Optional)"
            placeholder="e.g. John Doe"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            leftElement={<User className="w-4 h-4" />}
          />

          <Input
            label="Email Address (Optional)"
            type="email"
            placeholder="john@example.com"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            leftElement={<Mail className="w-4 h-4" />}
          />

          <Input
            label="Tags (Comma separated)"
            placeholder="VIP, Lead, Retail"
            value={newTags}
            onChange={(e) => setNewTags(e.target.value)}
          />

          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={newOptedIn}
              onChange={(e) => setNewOptedIn(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
            />
            <span>This contact has explicitly opted in to receive WhatsApp communications</span>
          </label>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSaving}>
              Save Contact
            </Button>
          </div>
        </form>
      </Modal>

      {/* Bulk CSV Import Modal */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Import Contacts from CSV"
        description="Upload or paste CSV with columns: phone, name, email, etc."
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
            <p className="font-semibold text-slate-800">CSV Format Example:</p>
            <code className="block font-mono bg-white p-2 rounded border text-[11px] text-slate-700">
              phone,name,email,order_id<br />
              919876543210,John Doe,john@example.com,ORD101<br />
              919876543211,Sarah Connor,sarah@example.com,ORD102
            </code>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
              Paste CSV Text
            </label>
            <textarea
              rows={5}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="phone,name,email..."
              className="w-full rounded-lg border border-slate-200 bg-white p-3 font-mono text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <Input
            label="Tags to apply to imported contacts"
            value={importTags}
            onChange={(e) => setImportTags(e.target.value)}
          />

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsImportModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleBulkImport}
              isLoading={isImporting}
              leftIcon={<UploadCloud className="w-4 h-4" />}
            >
              Start Import
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
