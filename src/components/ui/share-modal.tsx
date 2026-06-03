import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Share2, Copy, Check, Globe, Lock, Mail, Users } from 'lucide-react'
import { useStore } from '@/store'

interface ShareModalProps {
  open: boolean
  onClose: () => void
  itemType: 'project' | 'document' | 'file'
  itemId: string
  itemName: string
  isPublic: boolean
  onVisibilityChange: (isPublic: boolean) => void
}

export default function ShareModal({
  open,
  onClose,
  itemType,
  itemName,
  isPublic,
  onVisibilityChange,
}: ShareModalProps) {
  const { currentUser } = useStore()
  const [publicEnabled, setPublicEnabled] = useState(isPublic)
  const [copied, setCopied] = useState(false)
  const [copyingInvite, setCopyingInvite] = useState(false)

  const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin

  // Public share link (for projects/documents with is_public=true)
  const publicLink = `${baseUrl}/${itemType === 'project' ? 'project-management' : itemType === 'document' ? 'documents' : 'files'}`

  // Invite link (team invite via /invite token)
  const inviteLink = `${baseUrl}/invite`

  const handleCopyLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for browsers without clipboard API
      const input = document.createElement('input')
      input.value = link
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleInviteCopy = async () => {
    setCopyingInvite(true)
    await handleCopyLink(inviteLink)
    setTimeout(() => setCopyingInvite(false), 2000)
  }

  const handlePublicToggle = async (enabled: boolean) => {
    setPublicEnabled(enabled)
    onVisibilityChange(enabled)
  }

  const shareText = `Check out this ${itemType}: ${itemName}`

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: itemName,
          text: shareText,
          url: publicLink,
        })
      } catch (e) {
        // User cancelled or error
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Share {itemType === 'project' ? 'Project' : itemType === 'document' ? 'Document' : 'File'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">

          {/* Item name display */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg px-4 py-3">
            <p className="text-sm font-medium truncate">{itemName}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {itemType.charAt(0).toUpperCase() + itemType.slice(1)} sharing
            </p>
          </div>

          {/* Public visibility toggle */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              {publicEnabled ? (
                <Globe className="w-5 h-5 text-green-500 mt-0.5" />
              ) : (
                <Lock className="w-5 h-5 text-gray-400 mt-0.5" />
              )}
              <div>
                <Label className="text-sm font-medium cursor-pointer" onClick={() => handlePublicToggle(!publicEnabled)}>
                  {publicEnabled ? 'Public' : 'Private'}
                </Label>
                <p className="text-xs text-gray-500 mt-0.5">
                  {publicEnabled
                    ? 'Anyone with the link can view this ' + itemType
                    : 'Only you can see this ' + itemType}
                </p>
              </div>
            </div>
            <Switch
              checked={publicEnabled}
              onCheckedChange={handlePublicToggle}
            />
          </div>

          {/* Public link copy */}
          {publicEnabled && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Public link</Label>
              <div className="flex gap-2">
                <Input
                  value={publicLink}
                  readOnly
                  className="flex-1 text-sm bg-gray-50 dark:bg-gray-800"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCopyLink(publicLink)}
                  className="shrink-0"
                >
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-gray-400">
                Anyone with this link can see this {itemType} (read-only)
              </p>

              {/* Native share button (mobile) */}
              {navigator.share && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleNativeShare}
                  className="w-full mt-1"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share via...
                </Button>
              )}
            </div>
          )}

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-700" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white dark:bg-gray-900 px-2 text-gray-400">Team</span>
            </div>
          </div>

          {/* Invite team members */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-500" />
              <Label className="text-sm font-medium">Invite team members</Label>
            </div>
            <p className="text-xs text-gray-500">
              Share the invite link to add collaborators. They will need to register or log in.
            </p>
            <div className="flex gap-2">
              <Input
                value={inviteLink}
                readOnly
                className="flex-1 text-sm bg-gray-50 dark:bg-gray-800"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleInviteCopy}
                className="shrink-0"
              >
                {copyingInvite ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCopyLink(`${inviteLink}?item=${itemId}&type=${itemType}`)}
                className="flex-1"
              >
                <Mail className="w-4 h-4 mr-2" />
                Copy invite link
              </Button>
            </div>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  )
}
