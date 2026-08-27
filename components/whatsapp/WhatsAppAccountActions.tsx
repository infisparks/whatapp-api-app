'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { RefreshCw, Trash2 } from 'lucide-react';

interface WhatsAppAccountActionsProps {
  connectionId: string;
  displayPhone: string;
}

export function WhatsAppAccountActions({ connectionId, displayPhone }: WhatsAppAccountActionsProps) {
  const router = useRouter();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch(`/api/v1/whatsapp/accounts/${connectionId}/sync`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        alert(data.error || 'Failed to sync with Meta');
      } else {
        router.refresh();
      }
    } catch {
      alert('Network error while syncing account');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to disconnect ${displayPhone}?`)) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/v1/whatsapp/accounts/${connectionId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to disconnect account');
      }
    } catch {
      alert('Error disconnecting account');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleSync}
        isLoading={isSyncing}
        leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        className="text-xs"
      >
        Sync Meta
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={handleDelete}
        isLoading={isDeleting}
        className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
}
