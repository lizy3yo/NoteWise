/**
 * Query Optimization Utilities
 * 
 * Provides helper functions for optimized database queries
 */

import mongoose, { Query, Document } from 'mongoose';

/**
 * Query performance monitoring wrapper
 */
export async function monitorQuery<T>(
  query: Query<T, any>,
  queryName: string
): Promise<T> {
  const startTime = Date.now();
  
  try {
    const result = await query.exec();
    const duration = Date.now() - startTime;
    
    if (duration > 1000) {
      console.warn(`⚠️  Slow query detected: ${queryName} took ${duration}ms`);
    } else if (duration > 100) {
      console.log(`⏱️  Query ${queryName} took ${duration}ms`);
    }
    
    return result;
  } catch (error) {
    console.error(`❌ Query failed: ${queryName}`, error);
    throw error;
  }
}

/**
 * Explain query execution plan (for debugging)
 */
export async function explainQuery<T>(
  query: Query<T, any>,
  queryName: string
): Promise<void> {
  try {
    const explanation = await query.explain();
    console.log(`\n📊 Query Explanation for: ${queryName}`);
    console.log(JSON.stringify(explanation, null, 2));
  } catch (error) {
    console.error(`Failed to explain query: ${queryName}`, error);
  }
}

/**
 * Pagination helper with optimized queries
 */
export interface PaginationOptions {
  page?: number;
  limit?: number;
  sort?: Record<string, 1 | -1>;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export async function paginateQuery<T extends Document>(
  model: mongoose.Model<T>,
  filter: Record<string, any>,
  options: PaginationOptions = {}
): Promise<PaginatedResult<T>> {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 20));
  const skip = (page - 1) * limit;
  const sort = options.sort || { createdAt: -1 };

  // Execute count and find in parallel for better performance
  const [total, data] = await Promise.all([
    model.countDocuments(filter),
    model.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean()
      .exec()
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    data: data as T[],
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

/**
 * Batch operations helper
 */
export async function batchInsert<T>(
  model: mongoose.Model<T>,
  documents: any[],
  batchSize: number = 100
): Promise<void> {
  for (let i = 0; i < documents.length; i += batchSize) {
    const batch = documents.slice(i, i + batchSize);
    await model.insertMany(batch, { ordered: false });
  }
}

/**
 * Optimized aggregation with cursor
 */
export async function aggregateWithCursor<T>(
  model: mongoose.Model<T>,
  pipeline: any[],
  batchSize: number = 100
): Promise<any[]> {
  const results: any[] = [];
  const cursor = model.aggregate(pipeline).cursor({ batchSize });

  for await (const doc of cursor) {
    results.push(doc);
  }

  return results;
}

/**
 * Field projection helper - only select needed fields
 */
export function selectFields(
  query: any,
  fields: string[]
): any {
  return query.select(fields.join(' '));
}

/**
 * Lean query helper - returns plain JavaScript objects
 */
export function leanQuery(query: any): any {
  return query.lean();
}

/**
 * Check if query uses index
 */
export async function isQueryIndexed<T>(
  query: Query<T, any>
): Promise<boolean> {
  try {
    const explanation: any = await query.explain();
    
    // Check if any stage uses COLLSCAN (collection scan)
    const hasCollScan = JSON.stringify(explanation).includes('COLLSCAN');
    
    if (hasCollScan) {
      console.warn('⚠️  Query is not using an index (COLLSCAN detected)');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Failed to check if query is indexed:', error);
    return false;
  }
}

/**
 * Optimized lookup (join) helper
 */
export interface LookupOptions {
  from: string;
  localField: string;
  foreignField: string;
  as: string;
  project?: Record<string, 1 | 0>;
}

export function optimizedLookup(options: LookupOptions): any[] {
  const pipeline: any[] = [
    {
      $lookup: {
        from: options.from,
        localField: options.localField,
        foreignField: options.foreignField,
        as: options.as,
      },
    },
  ];

  // Add projection to limit fields from joined collection
  if (options.project) {
    pipeline.push({
      $addFields: {
        [options.as]: {
          $map: {
            input: `$${options.as}`,
            as: 'item',
            in: options.project,
          },
        },
      },
    });
  }

  return pipeline;
}

/**
 * Cache-friendly query builder
 */
export class QueryBuilder<T extends Document> {
  private query: any;
  private cacheKey?: string;

  constructor(model: mongoose.Model<T>, filter: Record<string, any> = {}) {
    this.query = model.find(filter);
  }

  select(fields: string[]): this {
    this.query = this.query.select(fields.join(' '));
    return this;
  }

  sort(sort: Record<string, 1 | -1>): this {
    this.query = this.query.sort(sort);
    return this;
  }

  limit(limit: number): this {
    this.query = this.query.limit(limit);
    return this;
  }

  skip(skip: number): this {
    this.query = this.query.skip(skip);
    return this;
  }

  lean(): this {
    this.query = this.query.lean();
    return this;
  }

  populate(path: string, select?: string): this {
    this.query = this.query.populate(path, select);
    return this;
  }

  setCacheKey(key: string): this {
    this.cacheKey = key;
    return this;
  }

  async exec(): Promise<any[]> {
    return this.query.exec();
  }

  async execWithMonitoring(queryName: string): Promise<any[]> {
    return monitorQuery(this.query, queryName);
  }
}

export default {
  monitorQuery,
  explainQuery,
  paginateQuery,
  batchInsert,
  aggregateWithCursor,
  selectFields,
  leanQuery,
  isQueryIndexed,
  optimizedLookup,
  QueryBuilder,
};
