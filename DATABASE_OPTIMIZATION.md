# MongoDB Database Optimization Guide

## Overview

This document outlines the MongoDB optimization implementation for NoteWise, including connection pooling, indexing strategies, and query optimization techniques.

## 🚀 Quick Start

### 1. Initialize Indexes

Run the index initialization script to create all necessary indexes:

```bash
node scripts/init-indexes.js
```

This will create optimized indexes on all collections for better query performance.

### 2. Monitor Database Performance

Access the database statistics endpoint:

```
GET /api/admin/db-stats
```

This provides real-time information about:
- Connection pool status
- Index usage
- Collection statistics
- Slow queries

## 📊 Implemented Optimizations

### 1. Connection Pooling

**File:** `src/lib/mongoose.ts`

**Configuration:**
- `maxPoolSize: 10` - Maximum connections in pool
- `minPoolSize: 2` - Minimum connections maintained
- `maxIdleTimeMS: 30000` - Close idle connections after 30s
- `waitQueueTimeoutMS: 5000` - Wait time for connection from pool
- `serverSelectionTimeoutMS: 10000` - Server selection timeout
- `socketTimeoutMS: 45000` - Socket timeout
- `family: 4` - Use IPv4 only

**Benefits:**
- Reuses connections across requests
- Reduces connection overhead
- Prevents connection exhaustion
- Automatic connection recovery

### 2. Comprehensive Indexing

**File:** `src/lib/db/indexes.ts`

#### User Collection Indexes

```javascript
{ email: 1 }                    // Unique - Login lookups
{ username: 1 }                 // Unique - Username lookups
{ emailVerificationToken: 1 }   // Sparse - Email verification
{ passwordResetToken: 1 }       // Sparse - Password reset
```

#### Summary Collection Indexes

```javascript
{ userId: 1, createdAt: -1 }                    // User summaries by date
{ userId: 1, isArchived: 1, createdAt: -1 }     // Archived filtering
{ userId: 1, isFavorite: 1, createdAt: -1 }     // Favorite filtering
{ userId: 1, subject: 1 }                       // Subject filtering
{ userId: 1, folder: 1 }                        // Folder organization (sparse)
{ tags: 1 }                                     // Tag searches
{ isPublic: 1, createdAt: -1 }                  // Public summaries
```

#### Flashcard Collection Indexes

```javascript
{ user: 1, createdAt: -1 }                      // User flashcards by date
{ user: 1, isArchived: 1, createdAt: -1 }       // Archived filtering
{ user: 1, isFavorite: 1, createdAt: -1 }       // Favorite filtering
{ user: 1, subject: 1 }                         // Subject filtering (sparse)
{ user: 1, folder: 1 }                          // Folder organization (sparse)
{ accessType: 1, createdAt: -1 }                // Public flashcards
{ shareableLink: 1 }                            // Unique shareable links (sparse)
{ tags: 1 }                                     // Tag searches
{ user: 1, nextReview: 1 }                      // Spaced repetition (sparse)
```

#### Activity Collection Indexes

```javascript
{ user: 1, createdAt: -1 }                      // User activity history
{ user: 1, type: 1, createdAt: -1 }             // Activity type filtering
{ user: 1, type: 1, 'meta.summaryId': 1 }       // Duplicate check (sparse)
{ createdAt: -1 }                               // TTL index (90 days auto-delete)
```

**Index Types:**
- **Compound Indexes:** Multiple fields for complex queries
- **Sparse Indexes:** Only index documents with the field
- **Unique Indexes:** Enforce uniqueness
- **TTL Indexes:** Auto-delete old documents

### 3. Query Optimization Utilities

**File:** `src/lib/db/query-optimizer.ts`

#### Available Functions

**Monitor Query Performance:**
```typescript
import { monitorQuery } from '@/lib/db/query-optimizer';

const users = await monitorQuery(
  User.find({ role: 'student' }),
  'Find all students'
);
```

**Explain Query Execution:**
```typescript
import { explainQuery } from '@/lib/db/query-optimizer';

await explainQuery(
  Summary.find({ userId, isArchived: false }),
  'Active summaries query'
);
```

**Optimized Pagination:**
```typescript
import { paginateQuery } from '@/lib/db/query-optimizer';

const result = await paginateQuery(
  Summary,
  { userId, isArchived: false },
  { page: 1, limit: 20, sort: { createdAt: -1 } }
);

// Returns: { data, pagination: { page, limit, total, totalPages, hasNext, hasPrev } }
```

**Query Builder:**
```typescript
import { QueryBuilder } from '@/lib/db/query-optimizer';

const summaries = await new QueryBuilder(Summary, { userId })
  .select(['title', 'content', 'createdAt'])
  .sort({ createdAt: -1 })
  .limit(20)
  .lean()
  .execWithMonitoring('User summaries');
```

## 🎯 Best Practices

### 1. Always Use Indexes

**Bad:**
```typescript
// No index on userId + createdAt
const summaries = await Summary.find({ userId }).sort({ createdAt: -1 });
```

**Good:**
```typescript
// Uses compound index { userId: 1, createdAt: -1 }
const summaries = await Summary.find({ userId })
  .sort({ createdAt: -1 })
  .lean();
```

### 2. Use Lean Queries

**Bad:**
```typescript
// Returns full Mongoose documents with methods
const summaries = await Summary.find({ userId });
```

**Good:**
```typescript
// Returns plain JavaScript objects (faster)
const summaries = await Summary.find({ userId }).lean();
```

### 3. Select Only Needed Fields

**Bad:**
```typescript
// Fetches all fields including large content
const summaries = await Summary.find({ userId });
```

**Good:**
```typescript
// Only fetch needed fields
const summaries = await Summary.find({ userId })
  .select('title subject createdAt')
  .lean();
```

### 4. Avoid N+1 Queries

**Bad:**
```typescript
const flashcards = await Flashcard.find({ user: userId });
for (const flashcard of flashcards) {
  const progress = await StudyProgress.findOne({ flashcard: flashcard._id });
}
```

**Good:**
```typescript
// Use aggregation or populate
const flashcards = await Flashcard.find({ user: userId })
  .populate('progress');
```

### 5. Use Pagination

**Bad:**
```typescript
// Loads all documents into memory
const activities = await Activity.find({ user: userId });
```

**Good:**
```typescript
// Paginate results
const result = await paginateQuery(
  Activity,
  { user: userId },
  { page: 1, limit: 20 }
);
```

### 6. Limit Lookup Operations

**Bad:**
```typescript
// Multiple lookups in aggregation
const result = await Summary.aggregate([
  { $lookup: { from: 'users', ... } },
  { $lookup: { from: 'folders', ... } },
  { $lookup: { from: 'tags', ... } },
]);
```

**Good:**
```typescript
// Denormalize frequently accessed data
// Store user name and avatar in summary document
const summary = {
  userId,
  userName: user.name,
  userAvatar: user.avatar,
  // ... other fields
};
```

## 🔍 Query Performance Checklist

Before deploying a new query, verify:

- [ ] Query uses an appropriate index
- [ ] Uses `.lean()` for read-only operations
- [ ] Selects only necessary fields
- [ ] Implements pagination for large result sets
- [ ] Avoids N+1 query patterns
- [ ] Limits lookup/join operations
- [ ] Has been tested with `.explain()`

## 📈 Monitoring

### Check Index Usage

```typescript
import { isQueryIndexed } from '@/lib/db/query-optimizer';

const isOptimized = await isQueryIndexed(
  Summary.find({ userId, isArchived: false })
);
```

### View Database Stats

```bash
curl http://localhost:3000/api/admin/db-stats
```

### Monitor Slow Queries

Queries taking > 100ms will be logged automatically when using `monitorQuery()`.

## 🛠️ Maintenance

### Rebuild Indexes

If indexes become fragmented:

```bash
node scripts/init-indexes.js
```

### Check Index Size

```javascript
const stats = await Summary.collection.stats();
console.log('Index size:', stats.indexSize);
```

### Drop Unused Indexes

```javascript
await Summary.collection.dropIndex('indexName');
```

## 📝 Migration Guide

### Updating Existing API Routes

**Before:**
```typescript
export async function GET(request: NextRequest) {
  await connectToDatabase();
  const summaries = await Summary.find({ userId });
  return NextResponse.json({ summaries });
}
```

**After:**
```typescript
import { paginateQuery } from '@/lib/db/query-optimizer';

export async function GET(request: NextRequest) {
  await connectToDatabase();
  
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  
  const result = await paginateQuery(
    Summary,
    { userId, isArchived: false },
    { page, limit, sort: { createdAt: -1 } }
  );
  
  return NextResponse.json(result);
}
```

## 🚨 Common Issues

### Issue: Slow Queries

**Solution:**
1. Check if query uses index: `await explainQuery(query, 'name')`
2. Add missing index in `src/lib/db/indexes.ts`
3. Run `node scripts/init-indexes.js`

### Issue: Connection Pool Exhausted

**Solution:**
1. Check for unclosed connections
2. Increase `maxPoolSize` in `src/lib/mongoose.ts`
3. Ensure queries use `.lean()` to reduce memory

### Issue: Memory Issues

**Solution:**
1. Implement pagination
2. Use field projection
3. Use `.lean()` queries
4. Limit result set size

## 📚 Additional Resources

- [MongoDB Indexing Strategies](https://docs.mongodb.com/manual/indexes/)
- [Mongoose Performance Tips](https://mongoosejs.com/docs/guide.html#performance)
- [Connection Pooling](https://docs.mongodb.com/manual/administration/connection-pool-overview/)

## ✅ Verification

After implementation, verify improvements:

1. **Run index script:**
   ```bash
   node scripts/init-indexes.js
   ```

2. **Check database stats:**
   ```bash
   curl http://localhost:3000/api/admin/db-stats
   ```

3. **Monitor query times:**
   - Queries should be < 100ms
   - No COLLSCAN warnings
   - Connection pool stable

4. **Load test:**
   - Test with concurrent requests
   - Monitor memory usage
   - Check connection pool stats

## 🎉 Expected Results

After optimization:
- **Query Speed:** 5-10x faster for indexed queries
- **Memory Usage:** 30-50% reduction with lean queries
- **Connection Overhead:** 80% reduction with pooling
- **Scalability:** Handle 10x more concurrent users
