"use client";

import React, { useEffect, useState } from "react";
import {
  useRouter,
  useParams,
  useSearchParams,
  usePathname,
} from "next/navigation";
import api from "@/lib/api";
import {
  Settings,
  FileStack,
  RotateCcw,
  MoreHorizontal,
  Star,
  Edit2,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import LoadingTemplate2 from "@/components/ui/loading_template_2/loading2"; // added import
import PrimaryActionButton from "@/components/ui/buttons/PrimaryActionButton";
import { Chip } from "@/components/ui/chip";
import Modal from "@/components/ui/Modal";

type FlashcardCard = {
  _id: string;
  question: string;
  answer: string;
  image?: string;
};

type SharedUser = {
  user?: string;
  email?: string;
  role: "viewer" | "editor";
  addedAt?: string;
  status?: "pending" | "accepted";
};

type Flashcard = {
  _id: string;
  title: string;
  description?: string;
  cards: FlashcardCard[];
  tags?: string[];
  image?: string;
  difficulty?: "easy" | "medium" | "hard";
  accessType: "private" | "public";
  sharingMode?: "restricted" | "anyone_with_link";
  password?: string;
  linkRole?: "viewer" | "editor";
  publicRole?: "viewer" | "editor";
  sharedUsers?: SharedUser[];
  shareableLink?: string;
  createdAt?: string;
  updatedAt?: string;
};

export default function FlashcardDetailPage() {
  const [flashcard, setFlashcard] = useState<Flashcard | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [isAddingCard, setIsAddingCard] = useState<boolean>(false);
  const [showSharingModal, setShowSharingModal] = useState<boolean>(false);
  const [viewerIndex, setViewerIndex] = useState<number>(0);
  const [isShowingAnswer, setIsShowingAnswer] = useState<boolean>(false);
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set());
  const [trackProgress, setTrackProgress] = useState<boolean>(false);
  const [openMenuCardId, setOpenMenuCardId] = useState<string | null>(null);

  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const flashcardId = params.flashcardId as string;

  // Color-coded icon classes for each tab (only Flashcards kept)
  const tabIconColor = (label: string, isActive: boolean) => {
    const dim = isActive ? "" : " opacity-80";
    if (label === "Flashcards") return `text-sky-600 dark:text-sky-400${dim}`;
    return dim.trim();
  };

  useEffect(() => {
    const openShare = searchParams?.get("openShare");
    if (openShare) setShowSharingModal(true);
  }, [searchParams]);

  // Close dropdown menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (openMenuCardId && !target.closest("[data-menu-container]")) {
        setOpenMenuCardId(null);
      }
    };

    if (openMenuCardId) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [openMenuCardId]);

  // Form state for editing flashcard
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    tags: [] as string[],
    difficulty: "easy" as "easy" | "medium" | "hard",
    // accessType, sharingMode and password removed
    linkRole: "viewer" as "viewer" | "editor",
    publicRole: "viewer" as "viewer" | "editor",
  });

  // Form state for editing/adding cards
  const [cardForm, setCardForm] = useState({
    question: "",
    answer: "",
    image: "",
  });

  useEffect(() => {
    let isMounted = true;

    async function loadFlashcard() {
      setIsLoading(true);
      setError(null);
      try {
        // Get current user
        const current = await api.get(`/users/current`);
        const uid = (current as { user?: { _id?: string } } | null)?.user?._id;
        if (!uid) throw new Error("Unable to determine current user.");
        if (!isMounted) return;
        setUserId(uid);

        // Fetch the specific flashcard
        const res = await fetch(
          `/api/student_page/flashcard/${flashcardId}?userId=${uid}`,
          {
            headers: {
              "Content-Type": "application/json",
            },
            cache: "no-store",
          }
        );

        if (!res.ok) {
          const maybe: unknown = await res.json().catch(() => null);
          const message =
            maybe &&
            typeof maybe === "object" &&
            "message" in maybe &&
            typeof (maybe as { message?: unknown }).message === "string"
              ? String((maybe as { message?: unknown }).message)
              : `Failed to load flashcard (${res.status})`;
          throw new Error(message);
        }

        const data = (await res.json()) as { flashcard: Flashcard };
        if (!isMounted) return;

        setFlashcard(data.flashcard);
        setEditForm({
          title: data.flashcard.title,
          description: data.flashcard.description || "",
          tags: data.flashcard.tags || [],
          difficulty: data.flashcard.difficulty || "easy",
          linkRole: data.flashcard.linkRole || "viewer",
          publicRole: data.flashcard.publicRole || "viewer",
        });
      } catch (e: unknown) {
        if (!isMounted) return;
        const msg =
          e instanceof Error
            ? e.message
            : "Something went wrong loading the flashcard.";
        setError(msg);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    if (flashcardId) {
      loadFlashcard();
    }

    return () => {
      isMounted = false;
    };
  }, [flashcardId]);

  const currentCard =
    flashcard?.cards?.[
      Math.min(viewerIndex, Math.max((flashcard?.cards?.length || 1) - 1, 0))
    ];
  const goPrev = () => {
    setViewerIndex((i) => Math.max(i - 1, 0));
    setIsShowingAnswer(false);
  };
  const goNext = () => {
    setViewerIndex((i) =>
      Math.min(i + 1, Math.max((flashcard?.cards?.length || 1) - 1, 0))
    );
    setIsShowingAnswer(false);
  };
  const toggleStar = (id?: string) => {
    if (!id) return;
    setStarredIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleEdit = async () => {
    if (!flashcard || !userId) return;

    try {
      const res = await fetch(
        `/api/student_page/flashcard/${flashcardId}?userId=${userId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: editForm.title,
            description: editForm.description,
            tags: editForm.tags,
            difficulty: editForm.difficulty,
            cards: flashcard.cards, // Keep existing cards
            // accessType/sharingMode/password removed
            linkRole: editForm.linkRole,
            publicRole: editForm.publicRole,
          }),
        }
      );

      if (!res.ok) {
        const maybe: unknown = await res.json().catch(() => null);
        const message =
          maybe &&
          typeof maybe === "object" &&
          "message" in maybe &&
          typeof (maybe as { message?: unknown }).message === "string"
            ? String((maybe as { message?: unknown }).message)
            : `Failed to update flashcard (${res.status})`;
        throw new Error(message);
      }

      const data = (await res.json()) as { flashcard: Flashcard };
      setFlashcard(data.flashcard);
      setIsEditing(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to update flashcard.");
    }
  };

  const handleDelete = async () => {
    if (!flashcard || !userId) return;

    if (
      !confirm(
        "Are you sure you want to delete this flashcard? This action cannot be undone."
      )
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch(
        `/api/student_page/flashcard/${flashcardId}?userId=${userId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!res.ok) {
        const maybe: unknown = await res.json().catch(() => null);
        const message =
          maybe &&
          typeof maybe === "object" &&
          "message" in maybe &&
          typeof (maybe as { message?: unknown }).message === "string"
            ? String((maybe as { message?: unknown }).message)
            : `Failed to delete flashcard (${res.status})`;
        throw new Error(message);
      }

      // Redirect back to library
      router.push("/student_page/library");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to delete flashcard.");
      setIsDeleting(false);
    }
  };

  const handleTagChange = (value: string) => {
    const tags = value
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);
    setEditForm((prev) => ({ ...prev, tags }));
  };

  const handleAddCard = async () => {
    if (!flashcard || !userId || !cardForm.question || !cardForm.answer) return;

    try {
      const res = await fetch(
        `/api/student_page/flashcard/${flashcardId}?userId=${userId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            question: cardForm.question,
            answer: cardForm.answer,
            image: cardForm.image || undefined,
          }),
        }
      );

      if (!res.ok) {
        const maybe: unknown = await res.json().catch(() => null);
        const message =
          maybe &&
          typeof maybe === "object" &&
          "message" in maybe &&
          typeof (maybe as { message?: unknown }).message === "string"
            ? String((maybe as { message?: unknown }).message)
            : `Failed to add card (${res.status})`;
        throw new Error(message);
      }

      const data = (await res.json()) as { flashcard: Flashcard };
      setFlashcard(data.flashcard);
      setCardForm({ question: "", answer: "", image: "" });
      setIsAddingCard(false);
      setEditingCardId(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to add card.");
    }
  };

  const handleEditCard = async (cardId: string) => {
    if (!flashcard || !userId || !cardForm.question || !cardForm.answer) return;

    try {
      const res = await fetch(
        `/api/student_page/flashcard/${flashcardId}/card/${cardId}?userId=${userId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            question: cardForm.question,
            answer: cardForm.answer,
            image: cardForm.image || undefined,
          }),
        }
      );

      if (!res.ok) {
        const maybe: unknown = await res.json().catch(() => null);
        const message =
          maybe &&
          typeof maybe === "object" &&
          "message" in maybe &&
          typeof (maybe as { message?: unknown }).message === "string"
            ? String((maybe as { message?: unknown }).message)
            : `Failed to update card (${res.status})`;
        throw new Error(message);
      }

      const data = (await res.json()) as { flashcard: Flashcard };
      setFlashcard(data.flashcard);
      setCardForm({ question: "", answer: "", image: "" });
      setEditingCardId(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to update card.");
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    if (!flashcard || !userId) return;

    if (!confirm("Are you sure you want to delete this card?")) {
      return;
    }

    try {
      const res = await fetch(
        `/api/student_page/flashcard/${flashcardId}/card/${cardId}?userId=${userId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!res.ok) {
        const maybe: unknown = await res.json().catch(() => null);
        const message =
          maybe &&
          typeof maybe === "object" &&
          "message" in maybe &&
          typeof (maybe as { message?: unknown }).message === "string"
            ? String((maybe as { message?: unknown }).message)
            : `Failed to delete card (${res.status})`;
        throw new Error(message);
      }

      const data = (await res.json()) as { flashcard: Flashcard };
      setFlashcard(data.flashcard);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to delete card.");
    }
  };

  const startEditingCard = (card: FlashcardCard) => {
    setCardForm({
      question: card.question,
      answer: card.answer,
      image: card.image || "",
    });
    setEditingCardId(card._id);
    setIsAddingCard(false);
  };

  const startAddingCard = () => {
    setCardForm({ question: "", answer: "", image: "" });
    setIsAddingCard(true);
    setEditingCardId(null);
  };

  const cancelCardEdit = () => {
    setCardForm({ question: "", answer: "", image: "" });
    setIsAddingCard(false);
    setEditingCardId(null);
  };

  const generateShareableLink = () => {
    if (!flashcard) return;

    // Generate a unique link (in a real app, this would be a proper UUID)
    const linkId =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);

    // Update the flashcard with the shareable link
    handleUpdateShareableLink(linkId);
  };

  const handleUpdateShareableLink = async (linkId: string) => {
    if (!flashcard || !userId) return;

    try {
      const res = await fetch(
        `/api/student_page/flashcard/${flashcardId}?userId=${userId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...editForm,
            cards: flashcard.cards,
            shareableLink: linkId,
          }),
        }
      );

      if (!res.ok) {
        const maybe: unknown = await res.json().catch(() => null);
        const message =
          maybe &&
          typeof maybe === "object" &&
          "message" in maybe &&
          typeof (maybe as { message?: unknown }).message === "string"
            ? String((maybe as { message?: unknown }).message)
            : `Failed to update shareable link (${res.status})`;
        throw new Error(message);
      }

      const data = (await res.json()) as { flashcard: Flashcard };
      setFlashcard(data.flashcard);
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : "Failed to generate shareable link."
      );
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        // You could add a toast notification here
        alert("Link copied to clipboard!");
      })
      .catch(() => {
        alert("Failed to copy link");
      });
  };

  // (Add shared user flow removed – no UI hook currently uses it)

  const removeSharedUser = async (index: number) => {
    if (!flashcard || !userId) return;

    const updatedSharedUsers =
      flashcard.sharedUsers?.filter((_, i) => i !== index) || [];

    try {
      const res = await fetch(
        `/api/student_page/flashcard/${flashcardId}?userId=${userId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...editForm,
            cards: flashcard.cards,
            sharedUsers: updatedSharedUsers,
          }),
        }
      );

      if (!res.ok) {
        const maybe: unknown = await res.json().catch(() => null);
        const message =
          maybe &&
          typeof maybe === "object" &&
          "message" in maybe &&
          typeof (maybe as { message?: unknown }).message === "string"
            ? String((maybe as { message?: unknown }).message)
            : `Failed to remove shared user (${res.status})`;
        throw new Error(message);
      }

      const data = (await res.json()) as { flashcard: Flashcard };
      setFlashcard(data.flashcard);
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : "Failed to remove shared user."
      );
    }
  };

  // Cancel edit set and revert form values to currently loaded flashcard
  const cancelEditSet = () => {
    if (flashcard) {
      setEditForm({
        title: flashcard.title,
        description: flashcard.description || "",
        tags: flashcard.tags || [],
        difficulty: flashcard.difficulty || "easy",
        // accessType/sharingMode/password removed
        linkRole: flashcard.linkRole || "viewer",
        publicRole: flashcard.publicRole || "viewer",
      });
    }
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <LoadingTemplate2
        title="Loading flashcard"
        subtitle="Fetching flashcard data…"
        compact={false}
      />
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6 transition-colors duration-300">
        <div className="max-w-4xl mx-auto">
          <div className="text-red-600 dark:text-red-400">{error}</div>
          <button
            onClick={() => router.push("/student_page/library")}
            className="mt-4 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
          >
            Back to Library
          </button>
        </div>
      </div>
    );
  }

  if (!flashcard) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6 transition-colors duration-300">
        <div className="max-w-4xl mx-auto">
          <div className="text-slate-500 dark:text-slate-400">
            Flashcard not found
          </div>
          <button
            onClick={() => router.push("/student_page/library")}
            className="mt-4 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
          >
            Back to Library
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => router.push("/student_page/library")}
              className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-teal-600 transition-colors"
              aria-label="Back to Library"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              <span className="font-medium text-sm sm:text-base">Library</span>
            </button>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setIsEditing(true)}
              aria-label="Settings"
              className="p-2 sm:p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:border-teal-600/30 hover:text-teal-600 transition-all shadow-sm"
            >
              <Settings size={16} className="sm:w-[18px] sm:h-[18px]" />
            </button>
          </div>
        </div>

        {/* Title and Description */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2 leading-tight">
            {flashcard.title}
          </h1>
          {flashcard.description && (
            <p className="text-slate-600 dark:text-slate-400 text-base sm:text-lg leading-relaxed">
              {flashcard.description}
            </p>
          )}
        </div>

        {/* Study Mode Tabs */}
        <nav className="mb-6 sm:mb-8">
          <div className="flex items-end justify-between">
            <div className="flex gap-4 sm:gap-6 overflow-x-auto scrollbar-hide pb-1">
              {(() => {
                const base = `/student_page/library/${flashcardId}`;
                const tabs = [
                  {
                    label: "Flashcards",
                    href: `${base}/flashcard`,
                    Icon: FileStack,
                  },
                ];
                return tabs.map(({ label, href, Icon }) => {
                  const isActive = pathname?.startsWith(href);
                  return (
                    <button
                      key={label}
                      onClick={() => router.push(href)}
                      className={`relative pb-3 px-1 text-sm sm:text-base whitespace-nowrap inline-flex items-center gap-2 transition-colors min-w-fit ${
                        isActive
                          ? "text-slate-900 dark:text-slate-100 font-semibold"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                      }`}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <Icon
                        className={`w-4 h-4 flex-shrink-0 ${tabIconColor(label, !!isActive)}`}
                      />
                      <span className="flex-shrink-0">{label}</span>
                      {label === "Flashcards" && (
                        <span
                          className={`ml-1 sm:ml-2 rounded-full px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs leading-none flex-shrink-0 ${
                            isActive
                              ? "bg-violet-600 text-white"
                              : "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"
                          }`}
                        >
                          {flashcard.cards.length}
                        </span>
                      )}
                      {isActive && (
                        <span className="absolute left-0 right-0 -bottom-[1px] h-[2px] bg-gradient-to-r from-violet-500 to-violet-600 rounded-full" />
                      )}
                    </button>
                  );
                });
              })()}
            </div>
          </div>
          <div className="mt-2 h-px w-full bg-slate-200 dark:bg-slate-700" />
        </nav>

        {/* Main Content Grid */}
        <div className="max-w-5xl mx-auto">
          {/* Set Preview Section */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 sm:mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
                  Set Preview
                </h2>
                {flashcard.difficulty && (
                  <Chip variant="badge" className="capitalize w-fit">
                    {flashcard.difficulty}
                  </Chip>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  {Math.min(viewerIndex + 1, flashcard.cards.length)} /{" "}
                  {flashcard.cards.length}
                </span>
                <button
                  onClick={() => {
                    setViewerIndex(0);
                    setIsShowingAnswer(false);
                  }}
                  className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:border-teal-600/30 dark:hover:border-[#8B9D8B]/30 hover:text-teal-600 dark:hover:text-[#8B9D8B] transition-all"
                  aria-label="Reset Viewer"
                >
                  <RotateCcw size={16} />
                </button>
              </div>
            </div>

            {/* Preview Card */}
            <div className="relative mb-4 sm:mb-6">
              <button
                type="button"
                onClick={() => setIsShowingAnswer((s) => !s)}
                aria-label={isShowingAnswer ? "Show question" : "Show answer"}
                className="w-full h-64 sm:h-72 lg:h-80 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-teal-600 dark:focus:ring-[#8B9D8B] focus:ring-offset-2 dark:focus:ring-offset-slate-900"
              >
                <div className="relative h-full overflow-hidden rounded-2xl">
                  {/* Star control inside card at top right - use a non-button element to avoid nested button inside the large clickable card button */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleStar(currentCard?._id);
                    }}
                    onKeyDown={(e) => {
                      // support Enter and Space
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleStar(currentCard?._id);
                      }
                    }}
                    className={`absolute top-4 right-4 z-10 p-2 rounded-lg transition-all cursor-pointer ${
                      starredIds.has(currentCard?._id || "")
                        ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400"
                        : "bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 hover:text-yellow-500 dark:hover:text-yellow-400"
                    }`}
                    aria-pressed={starredIds.has(currentCard?._id || "")}
                    aria-label={
                      starredIds.has(currentCard?._id || "")
                        ? "Unfavorite"
                        : "Favorite"
                    }
                  >
                    <svg
                      className="w-5 h-5"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M11.48 3.499a.75.75 0 011.04.0l2.185 2.22a.75.75 0 00.424.212l3.043.442a.75.75 0 01.416 1.279l-2.203 2.147a.75.75 0 00-.216.663l.52 3.03a.75.75 0 01-1.088.791l-2.724-1.43a.75.75 0 00-.698 0l-2.724 1.43a.75.75 0 01-1.088-.791l.52-3.03a.75.75 0 00-.216-.663L5.412 8.652a.75.75 0 01.416-1.279l3.043-.442a.75.75 0 00.424-.212l2.185-2.22z" />
                    </svg>
                  </div>

                  <div
                    className={`absolute inset-0 flex items-center justify-center p-4 sm:p-6 lg:p-8 transition-opacity duration-300 ${
                      isShowingAnswer ? "opacity-0" : "opacity-100"
                    }`}
                  >
                    <div className="text-center max-w-full">
                      <div className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-medium text-slate-900 dark:text-slate-100 mb-3 sm:mb-4 leading-relaxed break-words">
                        {currentCard?.question || "No question"}
                      </div>
                      <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                        Click to reveal answer
                      </div>
                    </div>
                  </div>
                  <div
                    className={`absolute inset-0 flex items-center justify-center p-4 sm:p-6 lg:p-8 transition-opacity duration-300 ${
                      isShowingAnswer ? "opacity-100" : "opacity-0"
                    }`}
                  >
                    <div className="text-center max-w-full">
                      <div className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-medium text-slate-900 dark:text-slate-100 mb-3 sm:mb-4 leading-relaxed break-words">
                        {currentCard?.answer || "No answer"}
                      </div>
                      <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                        Click to show question
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            </div>

            {/* Navigation Controls - Centered */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
              <div className="flex items-center gap-3 sm:gap-4">
                <button
                  onClick={goPrev}
                  disabled={viewerIndex === 0}
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:border-teal-600/30 dark:hover:border-[#8B9D8B]/30 hover:bg-teal-600/5 dark:hover:bg-[#8B9D8B]/10 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg
                    className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600 dark:text-slate-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>
                <button
                  onClick={goNext}
                  disabled={viewerIndex >= flashcard.cards.length - 1}
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:border-[#1C2B1C]/30 dark:hover:border-[#8B9D8B]/30 hover:bg-[#1C2B1C]/5 dark:hover:bg-[#8B9D8B]/10 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg
                    className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600 dark:text-slate-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </div>
              <PrimaryActionButton
                onClick={() => setIsShowingAnswer((s) => !s)}
                className="w-full sm:w-auto px-6 py-2.5 text-sm sm:text-base"
              >
                {isShowingAnswer ? "Show Question" : "Show Answer"}
              </PrimaryActionButton>
            </div>
          </div>
        </div>

        {/* Cards Section */}
        <div className="mt-8 sm:mt-12">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-slate-100">
              Cards
            </h2>
            <PrimaryActionButton 
              onClick={startAddingCard}
              className="w-full sm:w-auto text-sm sm:text-base"
            >
              + Add Card
            </PrimaryActionButton>
          </div>

          {flashcard.cards.length === 0 ? (
            <div className="text-center py-8 sm:py-12 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400 dark:text-slate-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
              </div>
              <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">
                No cards yet
              </h3>
              <p className="text-sm sm:text-base text-gray-500 dark:text-slate-400 mb-4 px-4">
                Add your first card to get started
              </p>
              <PrimaryActionButton 
                onClick={startAddingCard}
                className="w-full sm:w-auto mx-4 sm:mx-0"
              >
                Add Your First Card
              </PrimaryActionButton>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {flashcard.cards.map((card, index) => (
                <div
                  key={card._id}
                  className="relative group bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-6 border border-slate-200 dark:border-slate-700 hover:border-teal-600/30 dark:hover:border-[#04C40A]/30 hover:shadow-lg transition-all"
                >
                  <div className="flex items-start gap-3 sm:gap-4 mb-3 sm:mb-4">
                    <div className="flex items-center justify-center flex-shrink-0">
                      <Chip
                        variant="badge"
                        className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center text-xs sm:text-sm"
                      >
                        {index + 1}
                      </Chip>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-gray-900 dark:text-slate-100 font-medium mb-2 text-sm sm:text-base leading-snug break-words">
                        <div className="line-clamp-3 sm:line-clamp-2">
                          {card.question}
                        </div>
                      </div>
                      <div className="text-xs sm:text-sm text-gray-600 dark:text-slate-400 leading-relaxed break-words">
                        <div className="line-clamp-2">
                          {card.answer}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="absolute top-3 right-3 sm:top-4 sm:right-4" data-menu-container>
                    <button
                      onClick={() =>
                        setOpenMenuCardId(
                          openMenuCardId === card._id ? null : card._id
                        )
                      }
                      className="p-1.5 sm:p-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
                      aria-label="Card options"
                    >
                      <MoreHorizontal size={14} className="sm:w-4 sm:h-4" />
                    </button>

                    {openMenuCardId === card._id && (
                      <div
                        className="absolute right-0 mt-2 w-44 sm:w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-20 overflow-hidden"
                        data-menu-container
                      >
                        <button
                          onClick={() => {
                            toggleStar(card._id);
                            setOpenMenuCardId(null);
                          }}
                          className="w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                        >
                          <Star
                            size={14}
                            className={`sm:w-4 sm:h-4 ${
                              starredIds.has(card._id)
                                ? "fill-yellow-400 text-yellow-400"
                                : ""
                            }`}
                          />
                          <span>
                            {starredIds.has(card._id)
                              ? "Unfavorite"
                              : "Favorite"}
                          </span>
                        </button>
                        <button
                          onClick={() => {
                            startEditingCard(card);
                            setOpenMenuCardId(null);
                          }}
                          className="w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                        >
                          <Edit2 size={14} className="sm:w-4 sm:h-4" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => {
                            handleDeleteCard(card._id);
                            setOpenMenuCardId(null);
                          }}
                          className="w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <Trash2 size={14} className="sm:w-4 sm:h-4" />
                          <span>Delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Card Edit Modal (converted from right-side drawer to Modal for library consistency) */}
      <Modal
        isOpen={Boolean(isAddingCard || editingCardId)}
        onClose={cancelCardEdit}
        title={isAddingCard ? "Add Card" : "Edit Card"}
        maxWidth="max-w-xl"
        footer={
          <>
            <button
              onClick={cancelCardEdit}
              className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm sm:text-base font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors mr-3"
            >
              Cancel
            </button>
            {isAddingCard ? (
              <button
                onClick={handleAddCard}
                disabled={!cardForm.question || !cardForm.answer}
                className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-teal-600 text-white disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base font-medium hover:bg-teal-700 transition-colors"
              >
                Add Card
              </button>
            ) : (
              <button
                onClick={() => editingCardId && handleEditCard(editingCardId)}
                disabled={!cardForm.question || !cardForm.answer}
                className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-teal-600 text-white disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base font-medium hover:bg-teal-700 transition-colors"
              >
                Save Changes
              </button>
            )}
          </>
        }
      >
        <div className="space-y-4 sm:space-y-6">
          <label className="block">
            <div className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">Question</div>
            <textarea
              value={cardForm.question}
              onChange={(e) => setCardForm((prev) => ({ ...prev, question: e.target.value }))}
              rows={3}
              className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm sm:text-base resize-none"
              placeholder="Enter question (can be long, supports formatting)"
            />
          </label>

          <label className="block">
            <div className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">Answer</div>
            <textarea
              value={cardForm.answer}
              onChange={(e) => setCardForm((prev) => ({ ...prev, answer: e.target.value }))}
              rows={3}
              className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm sm:text-base resize-none"
              placeholder="Enter answer"
            />
          </label>

          {/* Image URL input removed per request */}
        </div>
      </Modal>

      {/* Edit Set Modal (converted to shared Modal for consistency with Library) */}
      <Modal
        isOpen={isEditing}
        onClose={cancelEditSet}
        title="Flashcard Set Settings"
        maxWidth="max-w-3xl"
        footer={
          <div className="w-full flex items-center justify-between gap-3">
            <div>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors text-sm font-medium"
              >
                {isDeleting ? "Deleting..." : "Delete Flashcard Set"}
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={cancelEditSet}
                className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await handleEdit();
                }}
                disabled={!editForm.title.trim()}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700 transition-colors text-sm font-medium"
              >
                Save Changes
              </button>
            </div>
          </div>
        }
      >
        <div className="space-y-4 sm:space-y-6 p-1">
          <label className="block">
            <div className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">Title</div>
            <input
              value={editForm.title}
              onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
              className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm sm:text-base"
            />
          </label>

          <label className="block">
            <div className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">Description</div>
            <textarea
              value={editForm.description}
              onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm sm:text-base resize-none"
            />
          </label>

          <label className="block">
            <div className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">Tags (comma separated)</div>
            <input
              value={editForm.tags.join(", ")}
              onChange={(e) => handleTagChange(e.target.value)}
              className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm sm:text-base"
            />
          </label>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm mb-2 text-slate-700 dark:text-slate-200 font-medium">Difficulty</label>
              <select
                value={editForm.difficulty}
                onChange={(e) => setEditForm((prev) => ({ ...prev, difficulty: e.target.value as "easy" | "medium" | "hard" }))}
                className="w-full p-2.5 sm:p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm sm:text-base"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>

          <label className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <input
              type="checkbox"
              checked={trackProgress}
              onChange={() => setTrackProgress((v) => !v)}
              className="w-4 h-4 text-teal-600 bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-600 rounded focus:ring-teal-600 focus:ring-2"
            />
            <span className="text-sm text-slate-700 dark:text-slate-200">Enable progress tracking</span>
          </label>

          {/* Collaborators Section */}
          {flashcard.sharedUsers && flashcard.sharedUsers.length > 0 && (
            <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Collaborators</h3>
              <div className="space-y-2">
                {flashcard.sharedUsers.map((u, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <div>
                      <div className="font-medium text-slate-900 dark:text-slate-100 text-sm">{u.email}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 capitalize">{u.role} • {u.status}</div>
                    </div>
                    <button onClick={() => removeSharedUser(i)} className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm font-medium">Remove</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Sharing Modal (kept but styled) */}
      {showSharingModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowSharingModal(false)}
          />
          <div className="relative z-50 max-w-2xl w-full bg-white dark:bg-slate-900 rounded-xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h2 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-slate-100 pr-4">
                  Share &quot;{flashcard.title}&quot;
                </h2>
                <button
                  onClick={() => setShowSharingModal(false)}
                  className="text-slate-500 hover:text-slate-800 dark:hover:text-white p-1 flex-shrink-0"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Sharing options removed */}

              <div className="mt-6 flex flex-col sm:flex-row justify-end gap-3">
                <button
                  onClick={() => setShowSharingModal(false)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-sm sm:text-base font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    await handleEdit();
                    setShowSharingModal(false);
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors text-sm sm:text-base font-medium"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
