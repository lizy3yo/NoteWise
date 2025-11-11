import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/mongoose";
import { logger } from "@/lib/winston";
import StudyProgress, { IStudyProgress } from "@/models/study_progress";
import Flashcard from '@/models/flashcard';

export const GET = async (request: NextRequest, { params }: { params: Promise<{ flashcardId: string }> }) => {
  // ensure params is awaited (Next.js may provide a promise-like params)
  const { flashcardId } = await params;
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    if (!userId || !Types.ObjectId.isValid(userId) || !flashcardId || !Types.ObjectId.isValid(flashcardId)) {
      return NextResponse.json({ code: "VALIDATION_ERROR", message: "userId and flashcardId required and must be valid" }, { status: 400 });
    }
    await connectToDatabase();
    let progress: any = await StudyProgress.findOne({ user: userId, flashcard: flashcardId }).lean();
    if (!progress) {
      // create default doc so client can reliably resume
      const created = await StudyProgress.create({ user: userId, flashcard: flashcardId });
      // created is a Mongoose document; convert to plain object only if method exists
      progress = typeof (created as any).toObject === "function" ? (created as any).toObject() : created;
    }
    
    console.log("=== GET PROGRESS RESPONSE ===");
    console.log("Returning progress:", JSON.stringify(progress, null, 2));
    if (progress?.learn?.pref) {
      console.log("Learn preferences found:", progress.learn.pref);
    }
    
    return NextResponse.json({ progress }, { status: 200 });
  } catch (err: any) {
    logger?.error?.("GET /progress error", { err });
    return NextResponse.json({ code: "INTERNAL_SERVER_ERROR", message: "Failed to load progress" }, { status: 500 });
  }
};

export const PATCH = async (request: NextRequest, { params }: { params: Promise<{ flashcardId: string }> }) => {
  // ensure params is awaited (Next.js may provide a promise-like params)
  const { flashcardId } = await params;
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    if (!userId || !Types.ObjectId.isValid(userId) || !flashcardId || !Types.ObjectId.isValid(flashcardId)) {
      return NextResponse.json({ code: "VALIDATION_ERROR", message: "userId and flashcardId required and must be valid" }, { status: 400 });
    }
    const body = await request.json();
    console.log("=== API PATCH REQUEST ===");
    console.log("Received body:", JSON.stringify(body, null, 2));

    // Allowed top-level keys. Include learn/match/test/flashcards/completion so namespace updates are permitted.
    const allowed = ["starredIds", "prefs", "sessionQueue", "viewerPos", "learn", "match", "test", "completion", "lastSessionStartedAt", "flashcards"];
    const setObj: any = {};

    for (const key of allowed) {
      if (body[key] === undefined) continue;

      // Special-case: treat 'completion' as an atomic subdocument when it's an object.
      // This avoids subtle nested-merge bugs and ensures the full completion payload
      // the client sends is persisted as-is.
      if (key === 'completion' && body[key] && typeof body[key] === 'object' && !Array.isArray(body[key])) {
        setObj[key] = body[key];
        continue;
      }

      // If the client sent an object for other nested subdocuments (learn/match/test/flashcards),
      // set its subfields individually to avoid replacing the whole subdoc unintentionally.
      if ((key === "learn" || key === "match" || key === "test" || key === "flashcards") &&
          body[key] && typeof body[key] === "object" && !Array.isArray(body[key])) {
        for (const [subKey, val] of Object.entries(body[key])) {
          // preserve nested object structure for known nested objects like cardOptions/pref/ratingCounts
          setObj[`${key}.${subKey}`] = val;
        }
      } else {
        // For prefs/sessionQueue/viewerPos/starredIds/lastSessionStartedAt replace as-is
        setObj[key] = body[key];
      }
    }

    console.log("Generated setObj:", JSON.stringify(setObj, null, 2));

    if (Object.keys(setObj).length === 0) {
      return NextResponse.json({ code: "VALIDATION_ERROR", message: "No updatable fields provided" }, { status: 400 });
    }

    await connectToDatabase();

    // Special handling for cardOptions merging
    if (setObj['learn.cardOptions']) {
      const cardOptionsToMerge = setObj['learn.cardOptions'];
      console.log("Processing cardOptions merge:", cardOptionsToMerge);
      delete setObj['learn.cardOptions']; // Remove from $set
      // Create individual $set operations for each cardOption
      for (const [cardId, options] of Object.entries(cardOptionsToMerge)) {
        console.log(`Setting learn.cardOptions.${cardId}:`, options);
        setObj[`learn.cardOptions.${cardId}`] = options;
      }
    }

    // Determine an incoming completedAt timestamp (ISO string). If the client provided
    // a completion.completedAt or lastSessionStartedAt use that, otherwise use now.
    const incomingCompletedAtRaw = body?.completion?.completedAt || body?.lastSessionStartedAt || new Date().toISOString();
    const incomingCompletedAtIso = (new Date(incomingCompletedAtRaw)).toISOString();

    // Build an atomic update that uses $max for completion.completedAt so that multiple
    // concurrent requests will only advance the stored completedAt to the latest value.
    // We will examine the PREVIOUS document (returned by findOneAndUpdate with new:false)
    // to detect whether this operation actually moved the timestamp forward — only then
    // should we increment the Flashcard repetitionCount.
    const updateOperation: any = {};
    if (Object.keys(setObj).length > 0) updateOperation.$set = setObj;
    // Always attempt to $max the completedAt (string ISO) so the DB holds the latest timestamp.
    updateOperation.$max = { 'completion.completedAt': incomingCompletedAtIso };

    console.log("Final updateOperation:", JSON.stringify(updateOperation, null, 2));
    console.log("=== EXECUTING ATOMIC DATABASE UPDATE ===");
    console.log("Query:", { user: userId, flashcard: flashcardId });
    console.log("Update operation:", updateOperation);

    // Run the atomic update and get the PREVIOUS document (new: false). If previous is null
    // then it means there was no doc before; the $max will have set the completedAt on insert.
    const prevDoc: any = await StudyProgress.findOneAndUpdate(
      { user: userId, flashcard: flashcardId },
      updateOperation,
      { upsert: true, new: false }
    ).lean();

    // Fetch the updated document to return in the response
    const updated: any = await StudyProgress.findOne({ user: userId, flashcard: flashcardId }).lean();

    // Decide whether to stamp the Flashcard document. We stamp when the incoming completedAt
    // is newer than the previous recorded completedAt (or there was no previous completedAt).
    try {
      const shouldStampFlashcard = Boolean(body?.learn || body?.completion || body?.lastSessionStartedAt);

      const prevCompletedAtRaw = prevDoc?.completion?.completedAt || null;
      let prevMs: number | null = null;
      try { prevMs = prevCompletedAtRaw ? new Date(prevCompletedAtRaw).getTime() : null; } catch { prevMs = null; }
      const incomingMs = new Date(incomingCompletedAtIso).getTime();

      const isNewer = prevMs === null || incomingMs > prevMs;

      if (shouldStampFlashcard && isNewer) {
        // Determine how many cards to count as reviewed. Prefer explicit counts from the
        // completion payload, then learn.masteredIds length, otherwise increment by 1.
        let incBy = 1;
        if (typeof body?.completion?.initialTotal === 'number') {
          incBy = Math.max(0, Math.floor(body.completion.initialTotal));
        } else if (Array.isArray(body?.learn?.masteredIds)) {
          incBy = body.learn.masteredIds.length;
        }
        if (incBy <= 0) incBy = 1;

        await Flashcard.findByIdAndUpdate(flashcardId, {
          $set: { lastReviewed: new Date(incomingCompletedAtIso) },
          $inc: { repetitionCount: incBy }
        }).exec();
      }
    } catch (err) {
      console.warn('Failed to update Flashcard lastReviewed/repetitionCount', err);
      // Don't fail the whole request if this secondary update fails
    }

    console.log("✅ Database update successful");
    console.log("Updated document:", JSON.stringify(updated, null, 2));
    return NextResponse.json({ progress: updated }, { status: 200 });
  } catch (err: any) {
    logger?.error?.("PATCH /progress error", { err });
    return NextResponse.json({ code: "INTERNAL_SERVER_ERROR", message: "Failed to save progress" }, { status: 500 });
  }
};